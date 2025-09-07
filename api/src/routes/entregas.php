<?php
declare(strict_types=1);

function register_entregas_routes() {

  // === Auto-migración idempotente con detección de tipos/engine =================
  $ensure_schema = function(PDO $pdo) {
    static $done = false;
    if ($done) return;
    $done = true;

    // Helpers de introspección
    $get_coltype = function(PDO $pdo, string $table, string $column): ?string {
      $sql = "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?";
      $st = $pdo->prepare($sql); $st->execute([$table, $column]);
      $t = $st->fetchColumn();
      if (!$t) return null;
      // Normalizar (int(11) unsigned => INT(11) UNSIGNED)
      $t = strtoupper($t);
      $t = str_replace(' UNSIGNED', ' UNSIGNED', $t);
      if (!str_contains($t, '(')) $t = preg_replace('/\s+/', ' ', $t);
      // Aseguramos formato estándar
      $t = preg_replace('/\s+/', ' ', $t);
      return $t;
    };
    $get_engine = function(PDO $pdo, string $table): string {
      $sql = "SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?";
      $st = $pdo->prepare($sql); $st->execute([$table]);
      return (string)($st->fetchColumn() ?: 'InnoDB');
    };
    $table_exists = function(PDO $pdo, string $table): bool {
      $st = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
      $st->execute([$table]);
      return (bool)$st->fetchColumn();
    };

    // Tomamos tipos/engine reales
    $courses_engine = $get_engine($pdo, 'courses');
    $groups_engine  = $get_engine($pdo, 'groups');

    // Si las tablas base no existen, no forzamos FK.
    $courses_id_type = $table_exists($pdo,'courses') ? ($get_coltype($pdo, 'courses', 'id') ?: 'INT') : 'INT';
    $groups_id_type  = $table_exists($pdo,'groups')  ? ($get_coltype($pdo, 'groups', 'id')  ?: 'INT') : 'INT';
    $groups_cid_type = $table_exists($pdo,'groups')  ? ($get_coltype($pdo, 'groups', 'course_id') ?: $courses_id_type) : $courses_id_type;

    // Build CREATE TABLE assignments con tipos detectados
    $assign_engine = $courses_engine ?: 'InnoDB';
    $create_assignments_fk = "
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id $courses_id_type NOT NULL,
        term TINYINT NOT NULL,
        type VARCHAR(8) NOT NULL,
        number INT NOT NULL,
        topic VARCHAR(8) NOT NULL,
        due_date DATE NULL,
        name VARCHAR(255) NOT NULL,
        returned TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        UNIQUE KEY ux_assign_course_term_type_num (course_id, term, type, number),
        KEY ix_assign_course (course_id),
        CONSTRAINT fk_assign_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      ) ENGINE=$assign_engine
    ";
    $create_assignments_nofk = "
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id $courses_id_type NOT NULL,
        term TINYINT NOT NULL,
        type VARCHAR(8) NOT NULL,
        number INT NOT NULL,
        topic VARCHAR(8) NOT NULL,
        due_date DATE NULL,
        name VARCHAR(255) NOT NULL,
        returned TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        UNIQUE KEY ux_assign_course_term_type_num (course_id, term, type, number),
        KEY ix_assign_course (course_id)
      ) ENGINE=$assign_engine
    ";

    // Ejecutamos con fallback
    try { $pdo->exec($create_assignments_fk); }
    catch (Throwable $e) { $pdo->exec($create_assignments_nofk); }

    // Build CREATE TABLE assignment_grades con tipos detectados
    $ag_engine = $groups_engine ?: 'InnoDB';
    $create_ag_fk = "
      CREATE TABLE IF NOT EXISTS assignment_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        group_id $groups_id_type NOT NULL,
        grade_code VARCHAR(32) NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY ux_ag_unique (assignment_id, group_id),
        KEY ix_ag_assign (assignment_id),
        KEY ix_ag_group (group_id),
        CONSTRAINT fk_ag_assign FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        CONSTRAINT fk_ag_group  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      ) ENGINE=$ag_engine
    ";
    $create_ag_nofk = "
      CREATE TABLE IF NOT EXISTS assignment_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT NOT NULL,
        group_id $groups_id_type NOT NULL,
        grade_code VARCHAR(32) NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY ux_ag_unique (assignment_id, group_id),
        KEY ix_ag_assign (assignment_id),
        KEY ix_ag_group (group_id)
      ) ENGINE=$ag_engine
    ";

    try { $pdo->exec($create_ag_fk); }
    catch (Throwable $e) { $pdo->exec($create_ag_nofk); }
  };
  // ============================================================================

  // Helpers
  $getGradeOptions = function(PDO $pdo): array {
    try {
      $rows = $pdo->query("SELECT code FROM grade_lookup")->fetchAll(PDO::FETCH_COLUMN);
      if ($rows && is_array($rows)) return array_values(array_unique(array_map('strval', $rows)));
    } catch (Throwable $e) { /* fallback */ }
    return ['A','N_E','NO_SAT','SAT-','SAT','SAT+','DIST-','DIST'];
  };

    $validate = function(array $input, array $rules) {
    foreach ($rules as $k => $rule) {
      if (!array_key_exists($k, $input)) return "Falta campo: $k";
      $v = $input[$k];
      switch ($rule) {
        case 'int':
          // Acepta int, string numérico o numérico en general
          if (is_int($v)) break;
          if ((is_string($v) && preg_match('/^-?\d+$/', $v)) || is_numeric($v)) break;
          return "Campo $k debe ser int";
        case 'string':
          if (!is_string($v) || $v==='') return "Campo $k inválido"; break;
        case 'date':
          if (!is_string($v) || $v==='') break;
          if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) return "Campo $k debe ser YYYY-MM-DD";
          break;
        case 'term':
          if (!in_array((int)$v, [1,2], true)) return "term debe ser 1 o 2";
          break;
        case 'type':
          if (!in_array($v, ['TP','TPC','TPR'], true)) return "type inválido (TP|TPC|TPR)";
          break;
        case 'topic':
          if (!in_array($v, ['ORG','MET','PLS','CUR'], true)) return "topic inválido (ORG|MET|PLS|CUR)";
          break;
        case 'bool':
          if (!in_array($v, [0,1,'0','1',true,false], true)) return "Campo $k debe ser bool 0|1";
          break;
      }
    }
    return null;
  };


  // GET /api/entregas?course_id=ID&term=ALL|1|2
  route('GET', '/api/entregas', function() use ($getGradeOptions, $ensure_schema) {
    $pdo = db();
    $ensure_schema($pdo);

    $courseId = (int)($_GET['course_id'] ?? 0);
    $term = $_GET['term'] ?? 'ALL';
    if ($courseId <= 0) return json_error('course_id requerido', 400);

    auth_require();
    ensure_course_access($courseId);

    // Grupos
    $groups = $pdo->prepare("SELECT id, number, name FROM groups WHERE course_id=? ORDER BY number ASC");
    $groups->execute([$courseId]);
    $groups = $groups->fetchAll(PDO::FETCH_ASSOC);

    // Entregas
    $sqlEnt = "SELECT id, course_id, term, type, number, topic, due_date, name, returned, created_at
               FROM assignments WHERE course_id=?";
    $args = [$courseId];
    if ($term === '1' || $term === '2') { $sqlEnt .= " AND term=?"; $args[] = (int)$term; }
    $sqlEnt .= " ORDER BY term ASC, FIELD(type,'TP','TPC','TPR'), number ASC, due_date ASC";
    $stEnt = $pdo->prepare($sqlEnt);
    $stEnt->execute($args);
    $assignments = $stEnt->fetchAll(PDO::FETCH_ASSOC);

    // Calificaciones
    $ids = array_map(fn($a) => (int)$a['id'], $assignments);
    $grades = [];
    if ($ids) {
      $in = implode(',', array_fill(0, count($ids), '?'));
      $st = $pdo->prepare("SELECT assignment_id, group_id, grade_code FROM assignment_grades WHERE assignment_id IN ($in)");
      $st->execute($ids);
      $grades = $st->fetchAll(PDO::FETCH_ASSOC);
    }

    // Aprobación por grupo
    $notApproved = ['A','N_E','NO_SAT','N_S'];
    $gradeIndex = [];
    foreach ($grades as $g) { $gradeIndex[$g['assignment_id']][$g['group_id']] = $g['grade_code']; }

    $approval = [];
    foreach ($groups as $g) {
      $gid = (int)$g['id'];
      $graded = 0; $approved = 0;
      foreach ($assignments as $a) {
        $aid = (int)$a['id'];
        $gc = $gradeIndex[$aid][$gid] ?? null;
        if ($gc !== null && $gc !== '') {
          $graded++;
          if (!in_array($gc, $notApproved, true)) $approved++;
        }
      }
      $ratio = ($graded > 0) ? round(100 * $approved / $graded) : null;
      $approval[$gid] = ['graded'=>$graded,'approved'=>$approved,'ratio'=>$ratio];
    }

    $gradeOptions = $getGradeOptions($pdo);

    return json_ok([
      'groups' => $groups,
      'assignments' => $assignments,
      'grades' => $grades,
      'grade_options' => $gradeOptions,
      'approval' => $approval
    ]);
  });

  // GET /api/entregas/next-number?course_id=ID&type=TP|TPC|TPR&term=1|2
  route('GET', '/api/entregas/next-number', function() use ($ensure_schema) {
    $pdo = db();
    $ensure_schema($pdo);

    $courseId = (int)($_GET['course_id'] ?? 0);
    $type = $_GET['type'] ?? '';
    $term = (int)($_GET['term'] ?? 0);
    auth_require();
    ensure_course_access($courseId);
    if ($courseId<=0 || !in_array($type,['TP','TPC','TPR'],true) || !in_array($term,[1,2],true)) {
      return json_error('Parámetros inválidos', 400);
    }
    $st = $pdo->prepare("SELECT COALESCE(MAX(number),0) FROM assignments WHERE course_id=? AND type=? AND term=?");
    $st->execute([$courseId, $type, $term]);
    $next = (int)$st->fetchColumn() + 1;
    return json_ok(['next' => $next]);
  });

  // POST /api/entregas/crear
  // {course_id,int, type:'TP'|'TPC'|'TPR', term:1|2, topic:'ORG'|'MET'|'PLS'|'CUR', due_date(YYYY-MM-DD)|'', name}
  route('POST', '/api/entregas/crear', function() use ($ensure_schema, $validate) {
    $pdo = db();
    $ensure_schema($pdo);

    auth_require();
    require_role(current_user(), ['GURU','SENIOR']);

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $err = $validate($input, [
      'course_id'=>'int','type'=>'type','term'=>'term','topic'=>'topic','due_date'=>'date','name'=>'string'
    ]);
    if ($err) return json_error($err, 400);

    $courseId = (int)$input['course_id'];
    ensure_course_access($courseId);

    $pdo->beginTransaction();
    try {
      $st = $pdo->prepare("SELECT COALESCE(MAX(number),0) FROM assignments WHERE course_id=? AND term=? AND type=?");
      $st->execute([$courseId, (int)$input['term'], $input['type']]);
      $number = (int)$st->fetchColumn() + 1;

      $st = $pdo->prepare("INSERT INTO assignments (course_id, term, type, number, topic, due_date, name, returned, created_at)
                           VALUES (?,?,?,?,?,?,?,0, NOW())");
      $due = $input['due_date'] ?: null;
      $st->execute([
        $courseId, (int)$input['term'], $input['type'], $number, $input['topic'], $due, $input['name']
      ]);
      $id = (int)$pdo->lastInsertId();
      $pdo->commit();

      return json_ok(['assignment' => [
        'id'=>$id,'course_id'=>$courseId,'term'=>(int)$input['term'],'type'=>$input['type'],
        'number'=>$number,'topic'=>$input['topic'],'due_date'=>$due,'name'=>$input['name'],'returned'=>0
      ]]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      return json_error('No se pudo crear: '.$e->getMessage(), 500);
    }
  });

  // POST /api/entregas/editar  {course_id, assignment_id, name?, due_date?, topic?}
  route('POST', '/api/entregas/editar', function() use ($ensure_schema, $validate) {
    $pdo = db();
    $ensure_schema($pdo);

    auth_require();
    require_role(current_user(), ['GURU','SENIOR']);

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    if (!isset($input['course_id'], $input['assignment_id'])) return json_error('Parámetros requeridos', 400);
    $courseId = (int)$input['course_id'];
    $aid = (int)$input['assignment_id'];
    ensure_course_access($courseId);

    $own = $pdo->prepare("SELECT COUNT(*) FROM assignments WHERE id=? AND course_id=?");
    $own->execute([$aid, $courseId]);
    if ((int)$own->fetchColumn() === 0) return json_error('Entrega no pertenece al curso', 403);

    $fields = [];
    $args = [];
    if (isset($input['name']) && is_string($input['name']) && $input['name']!=='') { $fields[]='name=?'; $args[]=$input['name']; }
    if (array_key_exists('due_date', $input)) {
      $due = $input['due_date'] ?: null;
      if ($due!==null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $due)) return json_error('due_date inválida',400);
      $fields[]='due_date=?'; $args[]=$due;
    }
    if (isset($input['topic']) && in_array($input['topic'], ['ORG','MET','PLS','CUR'], true)) { $fields[]='topic=?'; $args[]=$input['topic']; }

    if (!$fields) return json_ok(['updated'=>0]);
    $args[] = $aid;
    $sql = "UPDATE assignments SET ".implode(',', $fields)." WHERE id=?";
    $st = $pdo->prepare($sql);
    $st->execute($args);
    return json_ok(['updated'=>$st->rowCount()]);
  });

  // POST /api/entregas/devolver  {course_id, assignment_id, returned:0|1}
  route('POST', '/api/entregas/devolver', function() use ($ensure_schema) {
    $pdo = db();
    $ensure_schema($pdo);

    auth_require();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $courseId = (int)($input['course_id'] ?? 0);
    $aid = (int)($input['assignment_id'] ?? 0);
    $ret = $input['returned'] ?? null;
    if (!in_array($ret, [0,1,'0','1',true,false], true)) return json_error('returned debe ser 0|1',400);
    ensure_course_access($courseId);

    $own = $pdo->prepare("SELECT COUNT(*) FROM assignments WHERE id=? AND course_id=?");
    $own->execute([$aid, $courseId]);
    if ((int)$own->fetchColumn() === 0) return json_error('Entrega no pertenece al curso', 403);

    $st = $pdo->prepare("UPDATE assignments SET returned=? WHERE id=?");
    $st->execute([ (int)$ret ? 1 : 0, $aid ]);
    return json_ok(['updated'=>$st->rowCount()]);
  });

  // POST /api/entregas/calificar {course_id, assignment_id, group_id, grade_code|null}
  route('POST', '/api/entregas/calificar', function() use ($ensure_schema) {
    $pdo = db();
    $ensure_schema($pdo);

    auth_require();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $courseId = (int)($input['course_id'] ?? 0);
    $aid = (int)($input['assignment_id'] ?? 0);
    $gid = (int)($input['group_id'] ?? 0);
    $grade = $input['grade_code'] ?? null;
    ensure_course_access($courseId);

    // Pertenencia
    $a = $pdo->prepare("SELECT course_id FROM assignments WHERE id=?");
    $a->execute([$aid]);
    $aCourse = (int)($a->fetchColumn() ?: 0);
    if ($aCourse !== $courseId) return json_error('Entrega no pertenece al curso', 403);

    $g = $pdo->prepare("SELECT course_id FROM groups WHERE id=?");
    $g->execute([$gid]);
    $gCourse = (int)($g->fetchColumn() ?: 0);
    if ($gCourse !== $courseId) return json_error('Grupo no pertenece al curso', 403);

    // Upsert / delete
    $st = $pdo->prepare("SELECT id FROM assignment_grades WHERE assignment_id=? AND group_id=?");
    $st->execute([$aid, $gid]);
    $id = $st->fetchColumn();

    if ($grade === null || $grade === '') {
      if ($id) {
        $del = $pdo->prepare("DELETE FROM assignment_grades WHERE id=?");
        $del->execute([$id]);
      }
      return json_ok(['deleted' => $id ? 1 : 0]);
    } else {
      if ($id) {
        $upd = $pdo->prepare("UPDATE assignment_grades SET grade_code=?, updated_at=NOW() WHERE id=?");
        $upd->execute([$grade, $id]);
        return json_ok(['updated'=>1]);
      } else {
        $ins = $pdo->prepare("INSERT INTO assignment_grades (assignment_id, group_id, grade_code, updated_at) VALUES (?,?,?,NOW())");
        $ins->execute([$aid, $gid, $grade]);
        return json_ok(['created'=>1]);
      }
    }
  });

  // POST /api/entregas/eliminar {course_id, assignment_id, confirm:'ELIMINAR'} (solo GURU)
  route('POST', '/api/entregas/eliminar', function() use ($ensure_schema) {
    $pdo = db();
    $ensure_schema($pdo);

    auth_require();
    require_role(current_user(), ['GURU']);
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $courseId = (int)($input['course_id'] ?? 0);
    $aid = (int)($input['assignment_id'] ?? 0);
    $confirm = (string)($input['confirm'] ?? '');
    if ($confirm !== 'ELIMINAR') return json_error("Confirmación requerida 'ELIMINAR'", 400);
    ensure_course_access($courseId);

    $own = $pdo->prepare("SELECT COUNT(*) FROM assignments WHERE id=? AND course_id=?");
    $own->execute([$aid, $courseId]);
    if ((int)$own->fetchColumn() === 0) return json_error('Entrega no pertenece al curso', 403);

    $del = $pdo->prepare("DELETE FROM assignments WHERE id=?");
    $del->execute([$aid]);
    return json_ok(['deleted'=>$del->rowCount()]);
  });

}
