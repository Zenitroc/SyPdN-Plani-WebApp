<?php
function register_course_admin_routes(): void {
  route('GET', '/api/admin/courses', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);
    $q = $pdo->query("SELECT id, code, name, term, is_active, COALESCE(plan_url, '') AS plan_url FROM courses ORDER BY name");
    json_ok($q->fetchAll());
  });

  route('POST', '/api/admin/courses/create', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $code = trim((string)($in['code'] ?? ''));
    $name = trim((string)($in['name'] ?? ''));
    $term = trim((string)($in['term'] ?? ''));
    $isActive = isset($in['is_active']) ? (int)(bool)$in['is_active'] : 1;
    $planUrl = trim((string)($in['plan_url'] ?? ''));

    if ($code === '' || $name === '') {
      json_error('code y name requeridos', 422);
    }

    $st = $pdo->prepare('INSERT INTO courses (code, name, term, is_active, plan_url) VALUES (?,?,?,?,?)');
    $st->execute([$code, $name, $term !== '' ? $term : null, $isActive, $planUrl !== '' ? $planUrl : null]);
    $id = (int)$pdo->lastInsertId();
    json_ok([
      'id' => $id,
      'code' => $code,
      'name' => $name,
      'term' => $term,
      'is_active' => $isActive,
      'plan_url' => $planUrl,
    ]);
  });

  route('POST', '/api/admin/courses/update', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);

    $fields = [];
    $params = [];
    if (array_key_exists('code', $in)) {
      $code = trim((string)$in['code']);
      if ($code === '') json_error('code inválido', 422);
      $fields[] = 'code=?';
      $params[] = $code;
    }
    if (array_key_exists('name', $in)) {
      $name = trim((string)$in['name']);
      if ($name === '') json_error('name inválido', 422);
      $fields[] = 'name=?';
      $params[] = $name;
    }
    if (array_key_exists('term', $in)) {
      $term = trim((string)$in['term']);
      $fields[] = 'term=?';
      $params[] = $term !== '' ? $term : null;
    }
    if (array_key_exists('is_active', $in)) {
      $fields[] = 'is_active=?';
      $params[] = (int)(bool)$in['is_active'];
    }
    if (array_key_exists('plan_url', $in)) {
      $planUrl = trim((string)$in['plan_url']);
      $fields[] = 'plan_url=?';
      $params[] = $planUrl !== '' ? $planUrl : null;
    }

    if (!$fields) json_error('Sin cambios para guardar', 422);

    $params[] = $courseId;
    $st = $pdo->prepare('UPDATE courses SET ' . implode(',', $fields) . ' WHERE id=?');
    $st->execute($params);
    json_ok(['updated' => true, 'course_id' => $courseId]);
  });

  route('POST', '/api/admin/courses/delete', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    $confirm = strtoupper(trim((string)($in['confirm'] ?? '')));
    if ($courseId <= 0) json_error('course_id requerido', 422);
    if ($confirm !== 'ELIMINAR') json_error('confirm inválido', 422);

    $st = $pdo->prepare('DELETE FROM courses WHERE id=?');
    $st->execute([$courseId]);
    json_ok(['deleted' => true, 'course_id' => $courseId]);
  });


  route('GET', '/api/admin/course-users', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $courseId = (int)($_GET['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);

    $st = $pdo->prepare('SELECT u.id, u.name, u.username,
                                GROUP_CONCAT(r.code ORDER BY r.code SEPARATOR \',\') AS roles
                         FROM users u
                         JOIN user_courses uc ON uc.user_id=u.id
                         LEFT JOIN user_roles ur ON ur.user_id=u.id
                         LEFT JOIN roles r ON r.id=ur.role_id
                         WHERE uc.course_id=?
                         GROUP BY u.id
                         ORDER BY u.name');
    $st->execute([$courseId]);
    $rows = $st->fetchAll();
    foreach ($rows as &$row) {
      $row['roles'] = $row['roles'] !== null && $row['roles'] !== ''
        ? array_values(array_filter(explode(',', $row['roles'])))
        : [];
    }
    unset($row);
    json_ok($rows);
  });

  route('POST', '/api/admin/course-users/assign', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    $userId = (int)($in['user_id'] ?? 0);
    if ($courseId <= 0 || $userId <= 0) json_error('course_id y user_id requeridos', 422);

    $existsCourse = db_one($pdo, 'SELECT id FROM courses WHERE id=?', [$courseId]);
    if (!$existsCourse) json_error('Curso no encontrado', 404);

    $existsUser = db_one($pdo, 'SELECT id FROM users WHERE id=?', [$userId]);
    if (!$existsUser) json_error('Usuario no encontrado', 404);

    $already = db_one($pdo, 'SELECT 1 FROM user_courses WHERE user_id=? AND course_id=?', [$userId, $courseId]);
    if (!$already) {
      $st = $pdo->prepare('INSERT INTO user_courses (user_id, course_id) VALUES (?,?)');
      $st->execute([$userId, $courseId]);
    }
    json_ok(['assigned' => true]);
  });

  route('POST', '/api/admin/course-users/unassign', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    $userId = (int)($in['user_id'] ?? 0);
    if ($courseId <= 0 || $userId <= 0) json_error('course_id y user_id requeridos', 422);

    $st = $pdo->prepare('DELETE FROM user_courses WHERE user_id=? AND course_id=?');
    $st->execute([$userId, $courseId]);
    json_ok(['unassigned' => true]);
  });
}