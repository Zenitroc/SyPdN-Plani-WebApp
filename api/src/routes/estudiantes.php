<?php
declare(strict_types=1);

function register_student_routes(): void
{

  // ===== Listado de estudiantes por curso
  route('GET', '/api/estudiantes', function () {
    $courseId = (int) ($_GET['course_id'] ?? 0);
    if ($courseId <= 0)
      json_error('course_id requerido', 422);
    ensure_course_access($courseId);
    //require_role(current_user(), ['GURU','SENIOR']);


    $pdo = db();
    $st = $pdo->prepare("
      SELECT e.id, e.course_student_id AS course_id_seq, e.status,
             p.id AS person_id, p.last_name AS apellido, p.first_name AS nombre, p.legajo, p.email_inst,
             g.number AS group_no, e.group_id, e.observaciones
      FROM enrollments e
      JOIN people p ON p.id=e.person_id
      LEFT JOIN groups g ON g.id=e.group_id
      WHERE e.course_id=?
      ORDER BY e.course_student_id
    ");
    $st->execute([$courseId]);
    json_ok($st->fetchAll());
  });

  // ===== Eliminar inscripciones de estudiantes (SOLO GURÚ, doble confirmación)
  route('POST', '/api/estudiantes/eliminar', function () {
    $in = read_json();
    $courseId = (int) ($in['course_id'] ?? 0);
    $ids = $in['enrollment_ids'] ?? [];
    $confirm = strtoupper(trim((string) ($in['confirm'] ?? '')));

    if ($courseId <= 0 || !is_array($ids) || count($ids) === 0)
      json_error('course_id y enrollment_ids requeridos', 422);
    if ($confirm !== 'ELIMINAR')
      json_error('Confirmación inválida. Escribí "ELIMINAR".', 422);

    // acceso a la comisión
    ensure_course_access($courseId);
    require_role(current_user(), ['GURU']);


    $pdo = db();
    // validar pertenencia al curso
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $chk = $pdo->prepare("SELECT COUNT(*) c FROM enrollments WHERE id IN ($ph) AND course_id=?");
    $chk->execute([...$ids, $courseId]);
    $count = (int) $chk->fetch()['c'];
    if ($count !== count($ids))
      json_error('Alguna inscripción no pertenece a este curso', 400);

    // eliminar
    $del = $pdo->prepare("DELETE FROM enrollments WHERE id IN ($ph) AND course_id=?");
    $del->execute([...$ids, $courseId]);

    json_ok(['deleted' => $del->rowCount()]);
  });

  // ===== Alta/edición simple (popup Nuevo)
  route('POST', '/api/estudiantes/guardar', function () {
    $in = read_json();
    $courseId = (int) ($in['course_id'] ?? 0);
    if ($courseId <= 0)
      json_error('course_id requerido', 422);
    ensure_course_access($courseId);
    require_role(current_user(), ['GURU','SENIOR']);

    $last = trim((string) ($in['last_name'] ?? ''));
    $first = trim((string) ($in['first_name'] ?? ''));
    if ($last === '' || $first === '')
      json_error('Apellido y Nombre requeridos', 422);

    $email = trim((string) ($in['email_inst'] ?? ''));
    $legajo = trim((string) ($in['legajo'] ?? ''));
    $obs = (string) ($in['observaciones'] ?? '');
    $status = strtoupper((string) ($in['status'] ?? 'ALTA')) === 'BAJA' ? 'BAJA' : 'ALTA';
    $manualId = (int) ($in['course_student_id'] ?? 0);
    $groupNumber = isset($in['group_number']) ? (int) $in['group_number'] : null;

    $pdo = db();
    $pdo->beginTransaction();
    try {
      $personId = find_or_create_person($pdo, $last, $first, $email, $legajo);

      // 🚫 Regla: una ALTA por persona en toda la plataforma
      ensure_no_active_in_other_course($pdo, $personId, $courseId, null);

      $groupId = $groupNumber ? ensure_group_in_course($pdo, $courseId, $groupNumber) : null;

      // upsert enrollment
      $sel = $pdo->prepare("SELECT id, course_student_id FROM enrollments WHERE course_id=? AND person_id=?");
      $sel->execute([$courseId, $personId]);
      $enr = $sel->fetch();

      if ($enr) {
        $cid = (int) $enr['course_student_id'];
        if ($manualId > 0 && $manualId !== $cid) {
          ensure_course_student_id_free($pdo, $courseId, $manualId);
          $cid = $manualId;
        }
        $upd = $pdo->prepare("UPDATE enrollments
            SET status=?, group_id=?, observaciones=?, course_student_id=?
            WHERE id=?");
        $upd->execute([$status, $groupId, $obs, $cid, $enr['id']]);
        $assigned = $cid;
        $enrollId = (int) $enr['id'];
      } else {
        $assigned = $manualId > 0 ? $manualId : next_course_student_id($pdo, $courseId);
        ensure_course_student_id_free($pdo, $courseId, $assigned);
        $ins = $pdo->prepare("INSERT INTO enrollments(course_id, person_id, course_student_id, status, group_id, observaciones)
                              VALUES (?,?,?,?,?,?)");
        $ins->execute([$courseId, $personId, $assigned, $status, $groupId, $obs]);
        $enrollId = (int) $pdo->lastInsertId();
      }

      $pdo->commit();
      json_ok(['enrollment_id' => $enrollId, 'assigned_id' => $assigned]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      json_error('No se pudo guardar: ' . $e->getMessage(), 400);
    }
  });

  // ===== Editar alumno/inscripción (modal edición)
  route('POST', '/api/estudiantes/editar', function () {
    $in = read_json();
    $courseId = (int) ($in['course_id'] ?? 0);
    $enrollId = (int) ($in['enrollment_id'] ?? 0);
    if ($courseId <= 0 || $enrollId <= 0)
      json_error('course_id y enrollment_id requeridos', 422);
    ensure_course_access($courseId);
    require_role(current_user(), ['GURU','SENIOR']);

    $pdo = db();
    $row = db_one($pdo, "SELECT e.id, e.person_id, e.status FROM enrollments e WHERE e.id=? AND e.course_id=?", [$enrollId, $courseId]);
    if (!$row)
      json_error('Inscripción no encontrada', 404);
    $personId = (int) $row['person_id'];
    $currentStatus = (string) $row['status'];

    $last = isset($in['last_name']) ? trim((string) $in['last_name']) : null;
    $first = isset($in['first_name']) ? trim((string) $in['first_name']) : null;
    $email = isset($in['email_inst']) ? trim((string) $in['email_inst']) : null;
    $leg = isset($in['legajo']) ? trim((string) $in['legajo']) : null;

    $status = isset($in['status']) ? (strtoupper((string) $in['status']) === 'BAJA' ? 'BAJA' : 'ALTA') : null;
    $obs = array_key_exists('observaciones', $in) ? (string) $in['observaciones'] : null;
    $cid = isset($in['course_student_id']) ? (int) $in['course_student_id'] : null;
    $gnum = array_key_exists('group_number', $in) ? ($in['group_number'] !== null ? (int) $in['group_number'] : null) : '__NOCHANGE__';

    $pdo->beginTransaction();
    try {
      // Si se pasa/queda en ALTA, validar exclusividad
      $finalStatus = $status ?? $currentStatus;
      if ($finalStatus === 'ALTA') {
        ensure_no_active_in_other_course($pdo, $personId, $courseId, $enrollId);
      }

      // actualizar persona
      if ($last !== null || $first !== null || $email !== null || $leg !== null) {
        $fields = [];
        $vals = [];
        if ($last !== null) {
          $fields[] = 'last_name=?';
          $vals[] = $last;
        }
        if ($first !== null) {
          $fields[] = 'first_name=?';
          $vals[] = $first;
        }
        if ($email !== null) {
          $fields[] = 'email_inst=?';
          $vals[] = ($email ?: null);
        }
        if ($leg !== null) {
          $fields[] = 'legajo=?';
          $vals[] = ($leg ?: null);
        }
        if ($fields) {
          $vals[] = $personId;
          $pdo->prepare("UPDATE people SET " . implode(',', $fields) . " WHERE id=?")->execute($vals);
        }
      }

      // actualizar enrollment
      if ($status !== null || $obs !== null || $cid !== null || $gnum !== '__NOCHANGE__') {
        $fields = [];
        $vals = [];
        if ($status !== null) {
          $fields[] = 'status=?';
          $vals[] = $status;
        }
        if ($obs !== null) {
          $fields[] = 'observaciones=?';
          $vals[] = $obs;
        }
        if ($cid !== null) {
          ensure_course_student_id_free_except($pdo, $courseId, $cid, $enrollId);
          $fields[] = 'course_student_id=?';
          $vals[] = $cid;
        }
        if ($gnum !== '__NOCHANGE__') {
          if ($gnum === null) {
            $fields[] = 'group_id=NULL';
          } else {
            $gid = ensure_group_in_course($pdo, $courseId, $gnum);
            $fields[] = 'group_id=?';
            $vals[] = $gid;
          }
        }
        if ($fields) {
          $vals[] = $enrollId;
          $pdo->prepare("UPDATE enrollments SET " . implode(',', $fields) . " WHERE id=?")->execute($vals);
        }
      }

      $pdo->commit();
      json_ok(['ok' => true]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      json_error('No se pudo editar: ' . $e->getMessage(), 400);
    }
  });

  // ===== Reasignar IDs por Apellido,Nombre (sin colisiones)
  route('POST', '/api/estudiantes/reasignar-ids', function () {
    $in = read_json();
    $courseId = (int) ($in['course_id'] ?? 0);
    if ($courseId <= 0)
      json_error('course_id requerido', 422);
    ensure_course_access($courseId);
    require_role(current_user(), ['GURU','SENIOR']);
    $scope = strtoupper((string) ($in['scope'] ?? 'ALTA')); // 'ALTA' | 'ALL'

    $pdo = db();
    $pdo->beginTransaction();
    try {
      if ($scope === 'ALL') {
        // 1) Mover TODOS a un espacio alto
        $pdo->prepare("UPDATE enrollments SET course_student_id = course_student_id + 1000000 WHERE course_id=?")->execute([$courseId]);
        // 2) Ordenar todos y asignar 1..N
        $sel = $pdo->prepare("
          SELECT e.id
          FROM enrollments e
          JOIN people p ON p.id=e.person_id
          WHERE e.course_id=?
          ORDER BY p.last_name, p.first_name, e.id
        ");
        $sel->execute([$courseId]);
        $n = 1;
        while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
          $pdo->prepare("UPDATE enrollments SET course_student_id=? WHERE id=?")->execute([$n++, $row['id']]);
        }
        $pdo->commit();
        json_ok(['reassigned' => $n - 1, 'scope' => 'ALL']);
        return;
      }

      // ===== scope = 'ALTA' =====
      // 1) Mover SOLO ALTA a un espacio alto
      $pdo->prepare("UPDATE enrollments SET course_student_id = course_student_id + 1000000 WHERE course_id=? AND status='ALTA'")->execute([$courseId]);

      // 2) Números tomados por BAJA (o existentes <1e6)
      $taken = [];
      $rsTaken = $pdo->prepare("SELECT course_student_id FROM enrollments WHERE course_id=? AND course_student_id < 1000000");
      $rsTaken->execute([$courseId]);
      while ($r = $rsTaken->fetch(PDO::FETCH_ASSOC))
        $taken[(int) $r['course_student_id']] = true;

      // 3) ALTA en orden alfabético
      $sel = $pdo->prepare("
        SELECT e.id
        FROM enrollments e
        JOIN people p ON p.id=e.person_id
        WHERE e.course_id=? AND e.status='ALTA'
        ORDER BY p.last_name, p.first_name, e.id
      ");
      $sel->execute([$courseId]);

      // 4) Asignar menor libre
      $assigned = 0;
      $n = 1;
      while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
        while (isset($taken[$n])) {
          $n++;
        }
        $pdo->prepare("UPDATE enrollments SET course_student_id=? WHERE id=?")->execute([$n, $row['id']]);
        $taken[$n] = true;
        $assigned++;
        $n++;
      }

      $pdo->commit();
      json_ok(['reassigned' => $assigned, 'scope' => 'ALTA']);
    } catch (Throwable $e) {
      $pdo->rollBack();
      json_error('No se pudo reasignar: ' . $e->getMessage(), 400);
    }
  });

  // ===== Carga masiva (CSV/JSON) con bloqueo por otra ALTA
  route('POST', '/api/estudiantes/bulk', function () {
    $courseId = (int) ($_GET['course_id'] ?? ($_POST['course_id'] ?? 0));
    if ($courseId <= 0)
      json_error('course_id requerido', 422);
    ensure_course_access($courseId);
    require_role(current_user(), ['GURU','SENIOR']);
    $dry = (int) ($_GET['dry_run'] ?? 0) === 1;

    $rows = [];
    if (!empty($_FILES['file']['tmp_name'])) {
      $rows = parse_csv_rows($_FILES['file']['tmp_name']);
    } else {
      $data = read_json();
      if (isset($data[0]) && is_array($data[0]))
        $rows = $data;
      else
        json_error('Subí un CSV (file) o JSON (array).', 422);
    }

    $pdo = db();
    if (!$dry)
      $pdo->beginTransaction();
    $inserted = 0;
    $updated = 0;
    $errors = [];

    try {
      foreach ($rows as $i => $r) {
        $ln = trim((string) ($r['last_name'] ?? $r['apellido'] ?? ''));
        $fn = trim((string) ($r['first_name'] ?? $r['nombre'] ?? ''));
        if ($ln === '' || $fn === '') {
          $errors[] = "Fila " . ($i + 1) . ": Apellido/Nombre requeridos";
          continue;
        }

        $email = trim((string) ($r['email_inst'] ?? ''));
        $leg = trim((string) ($r['legajo'] ?? ''));

        if ($dry) {
          continue;
        }

        $pid = find_or_create_person($pdo, $ln, $fn, $email, $leg);

        // Bloqueo: ya ALTA en otro curso
        try {
          ensure_no_active_in_other_course($pdo, $pid, $courseId, null);
        } catch (Throwable $ex) {
          $errors[] = "Fila " . ($i + 1) . ": " . $ex->getMessage();
          continue;
        }

        $sel = $pdo->prepare("SELECT id FROM enrollments WHERE course_id=? AND person_id=?");
        $sel->execute([$courseId, $pid]);
        $enr = $sel->fetch();

        if ($enr) {
          $updated++;
        } else {
          $assigned = next_course_student_id($pdo, $courseId);
          ensure_course_student_id_free($pdo, $courseId, $assigned);
          $ins = $pdo->prepare("INSERT INTO enrollments(course_id, person_id, course_student_id, status, group_id, observaciones)
                                VALUES (?,?,?,?,?,?)");
          $ins->execute([$courseId, $pid, $assigned, 'ALTA', null, '']);
          $inserted++;
        }
      }

      if (!$dry)
        $pdo->commit();
      json_ok(['inserted' => $inserted, 'updated' => $updated, 'errors' => $errors, 'dry_run' => $dry]);
    } catch (Throwable $e) {
      if (!$dry)
        $pdo->rollBack();
      json_error('Error en bulk: ' . $e->getMessage(), 400);
    }
  });
}

/* ===== Helpers ===== */
function find_or_create_person(PDO $pdo, string $last, string $first, string $email = '', string $legajo = ''): int
{
  if ($email !== '') {
    $st = $pdo->prepare("SELECT id FROM people WHERE email_inst=?");
    $st->execute([$email]);
    if ($r = $st->fetch())
      return (int) $r['id'];
  }
  if ($legajo !== '') {
    $st = $pdo->prepare("SELECT id FROM people WHERE legajo=?");
    $st->execute([$legajo]);
    if ($r = $st->fetch())
      return (int) $r['id'];
  }
  $pdo->prepare("INSERT INTO people(last_name,first_name,legajo,email_inst) VALUES (?,?,?,?)")
    ->execute([$last, $first, $legajo ?: null, $email ?: null]);
  return (int) $pdo->lastInsertId();
}
function group_id_by_number(PDO $pdo, int $courseId, int $number): ?int
{
  $st = $pdo->prepare("SELECT id FROM groups WHERE course_id=? AND number=?");
  $st->execute([$courseId, $number]);
  $row = $st->fetch();
  return $row ? (int) $row['id'] : null;
}
function ensure_group_in_course(PDO $pdo, int $courseId, int $number): int
{
  $gid = group_id_by_number($pdo, $courseId, $number);
  if (!$gid)
    throw new Exception("group_number $number no existe en este curso");
  return $gid;
}
function next_course_student_id(PDO $pdo, int $courseId): int
{
  $st = $pdo->prepare("SELECT COALESCE(MAX(course_student_id),0)+1 AS nextid FROM enrollments WHERE course_id=?");
  $st->execute([$courseId]);
  $row = $st->fetch();
  return (int) ($row['nextid'] ?? 1);
}
function ensure_course_student_id_free(PDO $pdo, int $courseId, int $cid): void
{
  $st = $pdo->prepare("SELECT 1 FROM enrollments WHERE course_id=? AND course_student_id=?");
  $st->execute([$courseId, $cid]);
  if ($st->fetch())
    throw new Exception("ID $cid ya existe en este curso");
}
function ensure_course_student_id_free_except(PDO $pdo, int $courseId, int $cid, int $exceptId): void
{
  $st = $pdo->prepare("SELECT 1 FROM enrollments WHERE course_id=? AND course_student_id=? AND id<>?");
  $st->execute([$courseId, $cid, $exceptId]);
  if ($st->fetch())
    throw new Exception("ID $cid ya existe en este curso");
}

/** Lógica de exclusividad: una ALTA por persona en toda la plataforma */
function ensure_no_active_in_other_course(PDO $pdo, int $personId, int $courseId, ?int $excludeEnrollId): void
{
  $sql = "SELECT e.course_id, c.name
          FROM enrollments e
          JOIN courses c ON c.id=e.course_id
          WHERE e.person_id=? AND e.status='ALTA' AND e.course_id<>?" .
    ($excludeEnrollId ? " AND e.id<>?" : "") .
    " LIMIT 1";
  $params = $excludeEnrollId ? [$personId, $courseId, $excludeEnrollId] : [$personId, $courseId];
  $st = $pdo->prepare($sql);
  $st->execute($params);
  if ($row = $st->fetch()) {
    throw new Exception("La persona ya está ALTA en el curso \"" . $row['name'] . "\" (id=" . $row['course_id'] . ")");
  }
}

function parse_csv_rows(string $tmpfile): array
{
  $fh = fopen($tmpfile, 'r');
  if (!$fh)
    throw new Exception('No se pudo leer el CSV');

  // detectar delimitador: preferir ';' si aparece más que ',' en la primera línea
  $first = fgets($fh);
  $delim = ',';
  if ($first !== false && substr_count($first, ';') > substr_count($first, ','))
    $delim = ';';
  rewind($fh);

  $rows = [];
  $header = null;
  while (($data = fgetcsv($fh, 0, $delim, '"', '\\')) !== false) {
    if ($header === null) {
      $header = array_map('trim', $data);
      $lc = array_map(fn($x) => strtolower($x), $header);
      $looksHeader = in_array('last_name', $lc) || in_array('apellido', $lc);
      if (!$looksHeader) {
        $rows[] = row_from_fixed($data);
        $header = null;
      }
    } else {
      $row = [];
      foreach ($data as $i => $v) {
        $row[$header[$i] ?? "col$i"] = trim((string) $v);
      }
      $rows[] = normalize_row($row);
    }
  }
  fclose($fh);
  return $rows;
}
function row_from_fixed(array $d): array
{
  return normalize_row([
    'last_name' => $d[0] ?? '',
    'first_name' => $d[1] ?? '',
    'legajo' => $d[2] ?? '',
    'email_inst' => $d[3] ?? ''
  ]);
}
function normalize_row(array $r): array
{
  $r['last_name'] = $r['last_name'] ?? ($r['apellido'] ?? '');
  $r['first_name'] = $r['first_name'] ?? ($r['nombre'] ?? '');
  if (isset($r['email']))
    $r['email_inst'] = $r['email'];
  return $r;
}
