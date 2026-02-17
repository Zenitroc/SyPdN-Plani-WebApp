<?php
declare(strict_types=1);

function register_asistencia_routes() {

  // ==== Ensure schema for partial_attendance ===============================
  $ensure_schema = function(PDO $pdo) {
    static $done = false; if ($done) return; $done = true;
    $sql = "
      CREATE TABLE IF NOT EXISTS partial_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        enrollment_id BIGINT UNSIGNED NOT NULL,
        partial_no TINYINT NOT NULL,
        attempt ENUM('PA','1R','2R') NOT NULL,
        present TINYINT(1) NOT NULL DEFAULT 0,
        org TINYINT(1) NOT NULL DEFAULT 0,
        met TINYINT(1) NOT NULL DEFAULT 0,
        teo1 TINYINT(1) NOT NULL DEFAULT 0,
        pls TINYINT(1) NOT NULL DEFAULT 0,
        cur TINYINT(1) NOT NULL DEFAULT 0,
        teo2 TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY ux_pa_unique (enrollment_id, partial_no, attempt),
        KEY ix_pa_course (course_id),
        CONSTRAINT fk_pa_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        CONSTRAINT fk_pa_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sql);
  };

  // ==== Ensure schema for partial_grades (read-only dependency) ============
  $ensure_partial_grades_schema = function(PDO $pdo) {
    static $done = false; if ($done) return; $done = true;
    $sql = "
      CREATE TABLE IF NOT EXISTS partial_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        enrollment_id BIGINT UNSIGNED NOT NULL,
        partial_no TINYINT NOT NULL,
        topic VARCHAR(8) NOT NULL,
        attempt ENUM('PA','1R','2R') NOT NULL,
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

  // ==== GET /api/asistencia =================================================
  route('GET', '/api/asistencia', function() use ($ensure_schema, $ensure_partial_grades_schema) {
    $courseId = (int)($_GET['course_id'] ?? 0);
    $partial = (int)($_GET['partial'] ?? 1);
    $attempt = $_GET['attempt'] ?? 'PA';
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);
    if (!in_array($partial, [1,2], true)) json_error('partial invalido', 422);
    if (!in_array($attempt, ['PA','1R','2R'], true)) json_error('attempt invalido', 422);

    $pdo = db();
    $ensure_schema($pdo);
    $ensure_partial_grades_schema($pdo);

    $st = $pdo->prepare("SELECT e.id AS enrollment_id, e.course_student_id AS course_id_seq, p.last_name AS apellido, p.first_name AS nombre
                         FROM enrollments e
                         JOIN people p ON p.id=e.person_id
                         WHERE e.course_id=?
                         ORDER BY e.course_student_id ASC, p.last_name ASC, p.first_name ASC");
    $st->execute([$courseId]);
    $students = $st->fetchAll(PDO::FETCH_ASSOC);

    $st2 = $pdo->prepare("SELECT enrollment_id,present,org,met,teo1,pls,cur,teo2
                          FROM partial_attendance
                          WHERE course_id=? AND partial_no=? AND attempt=?");
    $st2->execute([$courseId, $partial, $attempt]);
    $rows = $st2->fetchAll(PDO::FETCH_ASSOC);
    $idx = [];
    foreach ($rows as $r) {
      $idx[(int)$r['enrollment_id']] = $r;
    }

    $approvedGrades = [];
    $FAIL = ['A','N_E','NO_SAT','N_S'];
    $pass = function(?string $code) use ($FAIL) {
      if ($code===null || $code==='') return false;
      return !in_array($code, $FAIL, true);
    };
    $st3 = $pdo->prepare("SELECT enrollment_id, topic, attempt, grade_code
                          FROM partial_grades
                          WHERE course_id=? AND partial_no=?");
    $st3->execute([$courseId, $partial]);
    $approvedRows = $st3->fetchAll(PDO::FETCH_ASSOC);
    foreach ($approvedRows as $r) {
      $e = (int)$r['enrollment_id'];
      $t = strtoupper((string)$r['topic']);
      $approvedGrades[$e][$t][$r['attempt']] = $r['grade_code'];
    }
    $topics = ($partial === 1) ? ['ORG','MET','TEO1'] : ['PLS','CUR','TEO2'];

    $out = [];
    foreach ($students as $s) {
      $e = (int)$s['enrollment_id'];
      $row = [
        'enrollment_id' => $e,
        'course_id_seq' => (int)$s['course_id_seq'],
        'apellido' => $s['apellido'],
        'nombre' => $s['nombre'],
        'present' => isset($idx[$e]) ? (int)$idx[$e]['present'] === 1 : 0,
        'topics' => [],
        'approved_topics' => []
      ];
      foreach ($topics as $t) {
        $col = strtolower($t);
        $row['topics'][$t] = isset($idx[$e]) ? (int)$idx[$e][$col] === 1 : 0;
        $best = $approvedGrades[$e][$t]['PA'] ?? null;
        foreach (['1R','2R'] as $a) if (!$pass($best)) $best = $approvedGrades[$e][$t][$a] ?? $best;
        $row['approved_topics'][$t] = $pass($best) ? 1 : 0;
      }
      $out[] = $row;
    }

    json_ok(['students'=>$out, 'topics'=>$topics]);
  });

  // ==== POST /api/asistencia/guardar =======================================
  route('POST', '/api/asistencia/guardar', function() use ($ensure_schema) {
    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    $enrollId = (int)($in['enrollment_id'] ?? 0);
    $partial = (int)($in['partial'] ?? 0);
    $attempt = strtoupper(trim((string)($in['attempt'] ?? '')));
    $present = isset($in['present']) ? (int)$in['present'] : 0;
    $topics = $in['topics'] ?? [];
    if ($courseId<=0 || $enrollId<=0 || !in_array($partial,[1,2],true) || !in_array($attempt,['PA','1R','2R'],true)) {
      json_error('Parametros invalidos', 422);
    }
    ensure_course_access($courseId);

    $pdo = db();
    $ensure_schema($pdo);

    $own = $pdo->prepare("SELECT COUNT(1) FROM enrollments WHERE id=? AND course_id=?");
    $own->execute([$enrollId,$courseId]);
    if ((int)$own->fetchColumn() === 0) json_error('enrollment no pertenece al curso', 400);

    $cols = ['org','met','teo1','pls','cur','teo2'];
    $vals = [];
    foreach ($cols as $c) {
      $key = strtoupper($c);
      $vals[$c] = isset($topics[$key]) && $topics[$key] ? 1 : 0;
    }

    $sql = "INSERT INTO partial_attendance
              (course_id,enrollment_id,partial_no,attempt,present,org,met,teo1,pls,cur,teo2,updated_at)
            VALUES (:course,:enroll,:partial,:attempt,:present,:org,:met,:teo1,:pls,:cur,:teo2,NOW())
            ON DUPLICATE KEY UPDATE
              present=VALUES(present), org=VALUES(org), met=VALUES(met),
              teo1=VALUES(teo1), pls=VALUES(pls), cur=VALUES(cur),
              teo2=VALUES(teo2), updated_at=NOW()";
    $st = $pdo->prepare($sql);
    $st->execute([
      ':course'=>$courseId,
      ':enroll'=>$enrollId,
      ':partial'=>$partial,
      ':attempt'=>$attempt,
      ':present'=>$present,
      ':org'=>$vals['org'],
      ':met'=>$vals['met'],
      ':teo1'=>$vals['teo1'],
      ':pls'=>$vals['pls'],
      ':cur'=>$vals['cur'],
      ':teo2'=>$vals['teo2']
    ]);

    json_ok(['saved'=>1]);
  });
}