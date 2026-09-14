<?php
declare(strict_types=1);

function register_parciales_routes() {

  // ====== Helper: ensure schema (tabla partial_grades) =======================
  $ensure_schema = function(PDO $pdo) {
    static $done = false; if ($done) return; $done = true;
    $sql = "
      CREATE TABLE IF NOT EXISTS partial_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        enrollment_id BIGINT UNSIGNED NOT NULL,
        partial_no TINYINT NOT NULL,                 -- 1 ó 2
        topic VARCHAR(8) NOT NULL,                   -- ORG, MET, TEO1, PLS, CUR, TEO2
        attempt ENUM('PA','1R','2R') NOT NULL,       -- Parcial / 1er Recup / 2do Recup
        grade_code VARCHAR(32) NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY ux_pg_unique (enrollment_id, partial_no, topic, attempt),
        KEY ix_pg_course (course_id),
        CONSTRAINT fk_pg_course  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        CONSTRAINT fk_pg_enroll  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sql);
  };

  // ====== GET /api/parciales?course_id=... ==================================
  route('GET', '/api/parciales', function() use ($ensure_schema) {
    $courseId = (int) ($_GET['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $pdo = db();
    $ensure_schema($pdo);

    // Opciones de calificación (mismo lookup que entregas)
    $opts = $pdo->query("SELECT code FROM grade_lookup ORDER BY ordinal ASC")->fetchAll(PDO::FETCH_COLUMN);

    // Estudiantes de la comisión
    $st = $pdo->prepare("
      SELECT e.id AS enrollment_id, e.course_student_id AS course_id_seq, e.status,
             p.last_name AS apellido, p.first_name AS nombre, p.legajo,
             g.number AS group_no
      FROM enrollments e
      JOIN people p ON p.id=e.person_id
      LEFT JOIN groups g ON g.id=e.group_id
      WHERE e.course_id=?
      ORDER BY e.course_student_id ASC, p.last_name ASC, p.first_name ASC
    ");
    $st->execute([$courseId]);
    $students = $st->fetchAll(PDO::FETCH_ASSOC);

    // Notas cargadas
    $stg = $pdo->prepare("
      SELECT enrollment_id, partial_no, topic, attempt, grade_code
      FROM partial_grades WHERE course_id=?
    ");
    $stg->execute([$courseId]);
    $grades = $stg->fetchAll(PDO::FETCH_ASSOC);

    // Indexar notas: enrollment -> parcial -> topic -> attempt
    $idx = [];
    foreach ($grades as $g) {
      $e = (int)$g['enrollment_id']; $p = (int)$g['partial_no'];
      $t = strtoupper($g['topic']);  $a = $g['attempt'];
      $idx[$e][$p][$t][$a] = $g['grade_code'];
    }

    $P1 = ['ORG','MET','TEO1'];
    $P2 = ['PLS','CUR','TEO2'];
    $ATT = ['PA','1R','2R'];
    $FAIL = ['A','N_E','NO_SAT','N_S']; // igual que entregas.js
    $pass = function(?string $code) use ($FAIL) {
      if ($code===null || $code==='') return false;
      return !in_array($code, $FAIL, true);
    };

    $rows = [];
    foreach ($students as $s) {
      $e = (int)$s['enrollment_id'];
      // armar matriz de valores
      $row = [
        'enrollment_id' => $e,
        'course_id_seq' => (int)$s['course_id_seq'],
        'status' => $s['status'],
        'apellido' => $s['apellido'],
        'nombre' => $s['nombre'],
        'legajo' => $s['legajo'],
        'group_no' => $s['group_no'],
        'p1' => ['ORG'=>['PA'=>null,'1R'=>null,'2R'=>null],
                 'MET'=>['PA'=>null,'1R'=>null,'2R'=>null],
                 'TEO1'=>['PA'=>null,'1R'=>null,'2R'=>null]],
        'p2' => ['PLS'=>['PA'=>null,'1R'=>null,'2R'=>null],
                 'CUR'=>['PA'=>null,'1R'=>null,'2R'=>null],
                 'TEO2'=>['PA'=>null,'1R'=>null,'2R'=>null]],
        'adeuda_p1' => [],
        'adeuda_p2' => []
      ];
      foreach ($P1 as $t) foreach ($ATT as $a) {
        $row['p1'][$t][$a] = $idx[$e][1][$t][$a] ?? null;
      }
      foreach ($P2 as $t) foreach ($ATT as $a) {
        $row['p2'][$t][$a] = $idx[$e][2][$t][$a] ?? null;
      }
      // Adeudados (mejor nota por tema)
      foreach ($P1 as $t) {
        $best = $row['p1'][$t]['PA'] ?? null;
        foreach (['1R','2R'] as $a) if (!$pass($best)) $best = $row['p1'][$t][$a] ?? $best;
        if (!$pass($best)) $row['adeuda_p1'][] = $t;
      }
      foreach ($P2 as $t) {
        $best = $row['p2'][$t]['PA'] ?? null;
        foreach (['1R','2R'] as $a) if (!$pass($best)) $best = $row['p2'][$t][$a] ?? $best;
        if (!$pass($best)) $row['adeuda_p2'][] = $t;
      }
      $rows[] = $row;
    }

    json_ok([
      'students' => $rows,
      'grade_options' => $opts,
      'topics' => ['p1'=>$P1, 'p2'=>$P2],
      'attempts' => $ATT
    ]);
  });

  // ====== POST /api/parciales/guardar ========================================
  // Body: { course_id, enrollment_id, partial:1|2, topic, attempt:'PA'|'1R'|'2R', grade_code|null }
  route('POST', '/api/parciales/guardar', function() use ($ensure_schema) {
    auth_require();
    require_role(current_user(), ['GURU','SENIOR']);
    $in = read_json();
    $courseId = (int) ($in['course_id'] ?? 0);
    $enrollId = (int) ($in['enrollment_id'] ?? 0);
    $partial = (int) ($in['partial'] ?? 0);
    $topic = strtoupper(trim((string)($in['topic'] ?? '')));
    $attempt = strtoupper(trim((string)($in['attempt'] ?? '')));
    $code = isset($in['grade_code']) && $in['grade_code']!=='' ? (string)$in['grade_code'] : null;
    if ($courseId<=0 || $enrollId<=0 || !in_array($partial,[1,2],true)
        || !in_array($attempt,['PA','1R','2R'],true)
        || $topic==='') {
      json_error('Parámetros inválidos', 422);
    }
    ensure_course_access($courseId);

    $P1 = ['ORG','MET','TEO1']; $P2=['PLS','CUR','TEO2'];
    if ($partial===1 && !in_array($topic,$P1,true)) json_error('Tema inválido para 1º parcial',422);
    if ($partial===2 && !in_array($topic,$P2,true)) json_error('Tema inválido para 2º parcial',422);

    $pdo = db();
    $ensure_schema($pdo);

    // Verificar pertenencia a curso
    $own = $pdo->prepare("SELECT COUNT(1) FROM enrollments WHERE id=? AND course_id=?");
    $own->execute([$enrollId,$courseId]);
    if ((int)$own->fetchColumn() === 0) json_error('enrollment no pertenece al curso', 400);

    // Validar código
    if ($code !== null) {
      $ok = $pdo->prepare("SELECT COUNT(1) FROM grade_lookup WHERE code=?");
      $ok->execute([$code]);
      if ((int)$ok->fetchColumn() === 0) json_error('grade_code inválido', 422);
    }

    // Upsert
    $sql = "
      INSERT INTO partial_grades (course_id,enrollment_id,partial_no,topic,attempt,grade_code,updated_at)
      VALUES (?,?,?,?,?,?,NOW())
      ON DUPLICATE KEY UPDATE grade_code=VALUES(grade_code), updated_at=NOW()
    ";
    $st = $pdo->prepare($sql);
    $st->execute([$courseId,$enrollId,$partial,$topic,$attempt,$code]);

    json_ok(['saved'=>1]);
  });
}
