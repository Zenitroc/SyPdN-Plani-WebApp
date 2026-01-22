<?php
declare(strict_types=1);

function register_notas_finales_routes(): void
{
  $ensure_schema = function(PDO $pdo) {
    static $done = false; if ($done) return; $done = true;
    $sql = "
      CREATE TABLE IF NOT EXISTS final_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id BIGINT UNSIGNED NOT NULL,
        enrollment_id BIGINT UNSIGNED NOT NULL,
        final_grade TINYINT NULL,
        final_deserto TINYINT(1) NOT NULL DEFAULT 0,
        final_condition VARCHAR(16) NULL,
        siu_loaded TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY ux_fg_unique (enrollment_id),
        KEY ix_fg_course (course_id),
        CONSTRAINT fk_fg_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        CONSTRAINT fk_fg_enroll FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($sql);
    $colCheck = $pdo->prepare("
      SELECT COUNT(*)
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'final_grades'
        AND COLUMN_NAME = 'final_condition'
    ");
    $colCheck->execute();
    if ((int)$colCheck->fetchColumn() === 0) {
      $pdo->exec("ALTER TABLE final_grades ADD COLUMN final_condition VARCHAR(16) NULL AFTER final_deserto");
    }

    $sqlPartial = "
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
    $pdo->exec($sqlPartial);
  };

  $FAIL = ['A','N_E','NO_SAT','N_S'];
  $pass = function(?string $code) use ($FAIL) {
    if ($code === null || $code === '') return false;
    return !in_array($code, $FAIL, true);
  };

  $compute_term_approval = function(PDO $pdo, int $courseId, int $term, array $groupIds) use ($FAIL): array {
    $groupIds = array_values(array_unique(array_filter($groupIds)));
    $approval = [];
    foreach ($groupIds as $gid) { $approval[(int)$gid] = null; }
    if (!$groupIds) return $approval;

    $st = $pdo->prepare("SELECT id FROM assignments WHERE course_id=? AND term=? ORDER BY id ASC");
    $st->execute([$courseId, $term]);
    $assignments = $st->fetchAll(PDO::FETCH_COLUMN);
    if (!$assignments) return $approval;

    $in = implode(',', array_fill(0, count($assignments), '?'));
    $args = $assignments;
    $stg = $pdo->prepare("SELECT assignment_id, group_id, grade_code FROM assignment_grades WHERE assignment_id IN ($in)");
    $stg->execute($args);
    $grades = $stg->fetchAll(PDO::FETCH_ASSOC);

    $idx = [];
    foreach ($grades as $g) {
      $idx[$g['assignment_id']][$g['group_id']] = $g['grade_code'];
    }

    foreach ($groupIds as $gid) {
      $graded = 0; $approved = 0;
      foreach ($assignments as $aid) {
        $gc = $idx[$aid][$gid] ?? null;
        if ($gc !== null && $gc !== '') {
          $graded++;
          if (!in_array($gc, $FAIL, true)) $approved++;
        }
      }
      $approval[(int)$gid] = $graded > 0 ? round(100 * $approved / $graded) : null;
    }

    return $approval;
  };
  $compute_condition = function(?int $finalGrade, int $finalDeserto): ?string {
    if ($finalDeserto === 1) return 'DESERTO';
    if ($finalGrade === null) return null;
    if ($finalGrade < 6) return 'RECURSA';
    if ($finalGrade < 8) return 'FIRMA';
    return 'PROMOCIONA';
  };

  // ====== GET /api/notas-finales?course_id=... ==============================
  route('GET', '/api/notas-finales', function() use ($ensure_schema, $pass, $compute_term_approval, $compute_condition) {
    auth_require();
    require_role(current_user(), ['GURU','SENIOR']);

    $courseId = (int) ($_GET['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $pdo = db();
    $ensure_schema($pdo);

    $st = $pdo->prepare("
      SELECT e.id AS enrollment_id, e.course_student_id AS course_id_seq, e.status,
             p.last_name AS apellido, p.first_name AS nombre,
             g.number AS group_no, e.group_id, e.observaciones
      FROM enrollments e
      JOIN people p ON p.id=e.person_id
      LEFT JOIN groups g ON g.id=e.group_id
      WHERE e.course_id=?
      ORDER BY e.course_student_id ASC, p.last_name ASC, p.first_name ASC
    ");
    $st->execute([$courseId]);
    $students = $st->fetchAll(PDO::FETCH_ASSOC);

    $groupIds = array_values(array_unique(array_filter(array_map(fn($s) => (int)($s['group_id'] ?? 0), $students))));
    $approval1 = $compute_term_approval($pdo, $courseId, 1, $groupIds);
    $approval2 = $compute_term_approval($pdo, $courseId, 2, $groupIds);

    $stg = $pdo->prepare("SELECT enrollment_id, partial_no, topic, attempt, grade_code FROM partial_grades WHERE course_id=?");
    $stg->execute([$courseId]);
    $grades = $stg->fetchAll(PDO::FETCH_ASSOC);

    $idx = [];
    foreach ($grades as $g) {
      $e = (int)$g['enrollment_id']; $p = (int)$g['partial_no'];
      $t = strtoupper($g['topic']); $a = $g['attempt'];
      $idx[$e][$p][$t][$a] = $g['grade_code'];
    }

    $P1 = ['ORG','MET','TEO1'];
    $P2 = ['PLS','CUR','TEO2'];
    $ATT = ['PA','1R','2R'];

    $stf = $pdo->prepare("SELECT enrollment_id, final_grade, final_deserto, siu_loaded, final_condition FROM final_grades WHERE course_id=?");
    $stf->execute([$courseId]);
    $finals = $stf->fetchAll(PDO::FETCH_ASSOC);
    $finalIdx = [];
    foreach ($finals as $f) {
      $finalIdx[(int)$f['enrollment_id']] = $f;
    }
    $stc = $pdo->prepare("UPDATE final_grades SET final_condition=? WHERE enrollment_id=?");

    $rows = [];
    foreach ($students as $s) {
      $e = (int)$s['enrollment_id'];
      $row = [
        'enrollment_id' => $e,
        'course_id_seq' => (int)$s['course_id_seq'],
        'status' => $s['status'],
        'apellido' => $s['apellido'],
        'nombre' => $s['nombre'],
        'group_id' => $s['group_id'],
        'group_no' => $s['group_no'],
        'observaciones' => $s['observaciones'],
        'adeuda_p1' => [],
        'adeuda_p2' => [],
        'tps_1c' => $s['group_id'] ? ($approval1[(int)$s['group_id']] ?? null) : null,
        'tps_2c' => $s['group_id'] ? ($approval2[(int)$s['group_id']] ?? null) : null,
        'final_grade' => null,
        'final_deserto' => 0,
        'final_condition' => null,
        'siu_loaded' => 0
      ];

      foreach ($P1 as $t) foreach ($ATT as $a) {
        $row['p1'][$t][$a] = $idx[$e][1][$t][$a] ?? null;
      }
      foreach ($P2 as $t) foreach ($ATT as $a) {
        $row['p2'][$t][$a] = $idx[$e][2][$t][$a] ?? null;
      }

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

      if (isset($finalIdx[$e])) {
        $finalGrade = $finalIdx[$e]['final_grade'] !== null ? (int)$finalIdx[$e]['final_grade'] : null;
        $finalDeserto = (int)($finalIdx[$e]['final_deserto'] ?? 0);
        $finalCondition = $finalIdx[$e]['final_condition'] ?? null;
        if ($finalCondition === null) {
          $finalCondition = $compute_condition($finalGrade, $finalDeserto);
          if ($finalCondition !== null) {
            $stc->execute([$finalCondition, $e]);
          }
        }
        $row['final_grade'] = $finalGrade;
        $row['final_deserto'] = $finalDeserto;
        $row['final_condition'] = $finalCondition;
        $row['siu_loaded'] = (int)($finalIdx[$e]['siu_loaded'] ?? 0);
      }

      $rows[] = $row;
    }

    json_ok([
      'students' => $rows,
      'topics' => ['p1' => $P1, 'p2' => $P2],
      'attempts' => $ATT
    ]);
  });

  // ====== POST /api/notas-finales/guardar ===================================
  route('POST', '/api/notas-finales/guardar', function() use ($ensure_schema, $compute_condition) {
    auth_require();
    $in = read_json();

    $courseId = (int) ($in['course_id'] ?? 0);
    $enrollId = (int) ($in['enrollment_id'] ?? 0);
    if ($courseId <= 0 || $enrollId <= 0) json_error('Parámetros inválidos', 422);
    ensure_course_access($courseId);

    $hasFinal = array_key_exists('final_grade', $in) || array_key_exists('final_deserto', $in);
    $hasSiu = array_key_exists('siu_loaded', $in);

    if ($hasFinal) require_role(current_user(), ['GURU','SENIOR']);
    if ($hasSiu) require_role(current_user(), ['GURU']);

    $finalGrade = array_key_exists('final_grade', $in) ? ($in['final_grade'] !== null ? (int)$in['final_grade'] : null) : null;
    $finalDeserto = array_key_exists('final_deserto', $in) ? (int)((bool)$in['final_deserto']) : null;
    $siuLoaded = array_key_exists('siu_loaded', $in) ? (int)((bool)$in['siu_loaded']) : null;

    if ($finalGrade !== null && ($finalGrade < 1 || $finalGrade > 10)) {
      json_error('Calificación final inválida', 422);
    }

    if ($finalDeserto === 1) $finalGrade = null;

    $pdo = db();
    $ensure_schema($pdo);

    $own = $pdo->prepare("SELECT COUNT(1) FROM enrollments WHERE id=? AND course_id=?");
    $own->execute([$enrollId, $courseId]);
    if ((int)$own->fetchColumn() === 0) json_error('enrollment no pertenece al curso', 400);

    $existing = db_one($pdo, "SELECT final_grade, final_deserto, final_condition, siu_loaded FROM final_grades WHERE enrollment_id=?", [$enrollId]);

    $nextFinal = $finalGrade ?? ($existing['final_grade'] ?? null);
    $nextDeserto = $finalDeserto ?? ($existing['final_deserto'] ?? 0);
    $nextSiu = $siuLoaded ?? ($existing['siu_loaded'] ?? 0);
    $nextCond = $compute_condition($nextFinal !== null ? (int)$nextFinal : null, (int)$nextDeserto);

    $sql = "
      INSERT INTO final_grades (course_id,enrollment_id,final_grade,final_deserto,final_condition,siu_loaded,updated_at)
      VALUES (?,?,?,?,?,?,NOW())
      ON DUPLICATE KEY UPDATE final_grade=VALUES(final_grade), final_deserto=VALUES(final_deserto),
        final_condition=VALUES(final_condition), siu_loaded=VALUES(siu_loaded), updated_at=NOW()
    ";
    $st = $pdo->prepare($sql);
    $st->execute([$courseId, $enrollId, $nextFinal, $nextDeserto, $nextCond, $nextSiu]);

    json_ok(['saved' => 1]);
  });
}