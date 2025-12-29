<?php
function register_session_routes(): void {
  // Login (público)
  route('POST', '/api/auth/login', function (): void {
    $in = read_json();
    $username = trim($in['username'] ?? '');
    $pass  = (string)($in['password'] ?? '');
    if ($username === '' || $pass === '') {
      json_error('Usuario y password requeridos', 422);
    }

    $pdo = db();
    $st = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $st->execute([$username]);
    $u = $st->fetch();
    if (!$u || !password_verify($pass, $u['password_hash'])) {
      json_error('Credenciales inválidas', 401);
    }

    // roles
    $rs = $pdo->prepare("SELECT r.code FROM roles r
                         JOIN user_roles ur ON ur.role_id=r.id
                         WHERE ur.user_id=?");
    $rs->execute([$u['id']]);
    $roles = array_column($rs->fetchAll(), 'code');

    // cursos asignados
    $cs = $pdo->prepare("SELECT course_id FROM user_courses WHERE user_id=?");
    $cs->execute([$u['id']]);
    $course_ids = array_map('intval', array_column($cs->fetchAll(), 'course_id'));

    $token = jwt_encode([
      'sub' => (int)$u['id'],
      'name'=> $u['name'],
      'roles'=> $roles,
      'course_ids'=> $course_ids
    ], getenv('JWT_SECRET') ?: 'CAMBIA_ESTE_SECRETO_LARGO', 60*15); // 15 min

    json_ok(['token'=>$token, 'user'=>[
      'id'=>(int)$u['id'],
      'name'=>$u['name'],
      'roles'=>$roles,
      'course_ids'=>$course_ids,
      'must_change_password'=> (int)($u['must_change_password'] ?? 0),
    ]]);
  }, true);

  // Perfil actual
  route('GET', '/api/me', function (): void {
    $pdo = db();
    $u = auth_user();
    $userId = (int)($u['id'] ?? 0);
    if ($userId <= 0) json_error('Usuario inválido', 401);

    $st = $pdo->prepare('SELECT id, name, last_name, username, email, personal_email, legajo, phone, photo_data, photo_mime, must_change_password FROM users WHERE id=?');
    $st->execute([$userId]);
    $row = $st->fetch();
    if (!$row) json_error('Usuario no encontrado', 404);

    $rs = $pdo->prepare("SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?");
    $rs->execute([$userId]);
    $roles = array_column($rs->fetchAll(), 'code');

    $cs = $pdo->prepare("SELECT course_id FROM user_courses WHERE user_id=?");
    $cs->execute([$userId]);
    $courseIds = array_map('intval', array_column($cs->fetchAll(), 'course_id'));

    $photoUrl = null;
    if (!empty($row['photo_data']) && !empty($row['photo_mime'])) {
      $photoUrl = 'data:' . $row['photo_mime'] . ';base64,' . $row['photo_data'];
    }

    json_ok([
      'id' => (int)$row['id'],
      'name' => $row['name'] ?? '',
      'last_name' => $row['last_name'] ?? '',
      'username' => $row['username'] ?? '',
      'email' => $row['email'] ?? '',
      'personal_email' => $row['personal_email'] ?? '',
      'legajo' => $row['legajo'] ?? '',
      'phone' => $row['phone'] ?? '',
      'photo_url' => $photoUrl,
      'roles' => $roles,
      'course_ids' => $courseIds,
      'must_change_password' => (int)($row['must_change_password'] ?? 0),
    ]);
  });

  route('POST', '/api/me/update', function (): void {
    $pdo = db();
    $u = auth_user();
    $userId = (int)($u['id'] ?? 0);
    if ($userId <= 0) json_error('Usuario inválido', 401);

    $in = read_json();
    $fields = [];
    $params = [];

    $allowed = [
      'personal_email' => 'personal_email',
      'legajo' => 'legajo',
      'phone' => 'phone',
    ];

    foreach ($allowed as $key => $col) {
      if (array_key_exists($key, $in)) {
        $val = trim((string)$in[$key]);
        $fields[] = $col . '=?';
        $params[] = $val !== '' ? $val : null;
      }
    }

    if (array_key_exists('photo_data', $in)) {
      $photo = $in['photo_data'];
      if ($photo === null || $photo === '') {
        $fields[] = 'photo_data=NULL';
        $fields[] = 'photo_mime=NULL';
      } elseif (preg_match('/^data:(.*?);base64,(.*)$/', (string)$photo, $m)) {
        $mime = $m[1];
        $data = $m[2];
        $bin = base64_decode($data, true);
        if ($bin === false) json_error('Foto inválida', 422);
        if (strlen($bin) > 200 * 1024) json_error('La foto supera el límite de 200KB', 422);
        $fields[] = 'photo_data=?';
        $params[] = $data;
        $fields[] = 'photo_mime=?';
        $params[] = $mime;
      } else {
        json_error('Formato de foto inválido', 422);
      }
    }

    if (!$fields) json_error('Sin cambios', 422);
    $params[] = $userId;
    $st = $pdo->prepare('UPDATE users SET ' . implode(',', $fields) . ' WHERE id=?');
    $st->execute($params);
    json_ok(['updated' => true]);
  });

  route('POST', '/api/me/password', function (): void {
    $pdo = db();
    $u = auth_user();
    $userId = (int)($u['id'] ?? 0);
    if ($userId <= 0) json_error('Usuario inválido', 401);

    $in = read_json();
    $current = (string)($in['current_password'] ?? '');
    $next = (string)($in['new_password'] ?? '');
    if ($current === '' || $next === '') json_error('Campos requeridos', 422);

    $st = $pdo->prepare('SELECT password_hash FROM users WHERE id=?');
    $st->execute([$userId]);
    $row = $st->fetch();
    if (!$row || !password_verify($current, $row['password_hash'])) {
      json_error('Contraseña actual inválida', 401);
    }

    $hash = password_hash($next, PASSWORD_DEFAULT);
    $st = $pdo->prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?');
    $st->execute([$hash, $userId]);
    json_ok(['updated' => true]);
  });

  // Seleccionar curso (stateless: el front guarda en localStorage)
  route('POST', '/api/session/course', function (): void {
    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);
    json_ok(null, 204);
  });

    // Ping público
  route('GET', '/api/ping', function(): void {
    json_ok(['pong'=>true]);
  }, true);

}