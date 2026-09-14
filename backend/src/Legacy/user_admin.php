<?php
function register_user_admin_routes(): void {
  route('GET', '/api/admin/roles', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);
    $q = $pdo->query('SELECT id, code, description FROM roles ORDER BY id');
    json_ok($q->fetchAll());
  });

  route('GET', '/api/admin/users', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);
    $q = $pdo->query("SELECT u.id, u.name, u.last_name, u.username, u.email, u.personal_email, u.legajo, u.phone,
                             u.photo_data, u.photo_mime,
                             GROUP_CONCAT(r.code ORDER BY r.code SEPARATOR ',') AS roles
                      FROM users u
                      LEFT JOIN user_roles ur ON ur.user_id=u.id
                      LEFT JOIN roles r ON r.id=ur.role_id
                      GROUP BY u.id
                      ORDER BY u.name");
    $rows = $q->fetchAll();
    foreach ($rows as &$row) {
      $row['roles'] = $row['roles'] ? array_values(array_filter(explode(',', $row['roles']))) : [];
      if (!empty($row['photo_data']) && !empty($row['photo_mime'])) {
        $row['photo_url'] = 'data:' . $row['photo_mime'] . ';base64,' . $row['photo_data'];
      } else {
        $row['photo_url'] = null;
      }
      unset($row['photo_data'], $row['photo_mime']);
    }
    unset($row);
    json_ok($rows);
  });

  route('GET', '/api/admin/user-detail', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $userId = (int)($_GET['user_id'] ?? 0);
    if ($userId <= 0) json_error('user_id requerido', 422);

    $st = $pdo->prepare('SELECT id, name, last_name, username, email, personal_email, legajo, phone, photo_data, photo_mime, must_change_password FROM users WHERE id=?');
    $st->execute([$userId]);
    $user = $st->fetch();
    if (!$user) json_error('Usuario no encontrado', 404);

    $rs = $pdo->prepare('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?');
    $rs->execute([$userId]);
    $roles = array_column($rs->fetchAll(), 'code');

    $cs = $pdo->prepare('SELECT c.id, c.code, c.name, c.term FROM courses c JOIN user_courses uc ON uc.course_id=c.id WHERE uc.user_id=? ORDER BY c.name');
    $cs->execute([$userId]);
    $courses = $cs->fetchAll();

    $photoUrl = null;
    if (!empty($user['photo_data']) && !empty($user['photo_mime'])) {
      $photoUrl = 'data:' . $user['photo_mime'] . ';base64,' . $user['photo_data'];
    }

    json_ok([
      'user' => [
        'id' => (int)$user['id'],
        'name' => $user['name'] ?? '',
        'last_name' => $user['last_name'] ?? '',
        'username' => $user['username'] ?? '',
        'email' => $user['email'] ?? '',
        'personal_email' => $user['personal_email'] ?? '',
        'legajo' => $user['legajo'] ?? '',
        'phone' => $user['phone'] ?? '',
        'photo_url' => $photoUrl,
        'roles' => $roles,
        'must_change_password' => (int)($user['must_change_password'] ?? 0),
      ],
      'courses' => $courses,
    ]);
  });

  route('POST', '/api/admin/users/create', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $name = trim((string)($in['name'] ?? ''));
    $lastName = trim((string)($in['last_name'] ?? ''));
    $username = trim((string)($in['username'] ?? ''));
    $email = trim((string)($in['email'] ?? ''));
    $personalEmail = trim((string)($in['personal_email'] ?? ''));
    $legajo = trim((string)($in['legajo'] ?? ''));
    $phone = trim((string)($in['phone'] ?? ''));
    $roles = $in['roles'] ?? [];

    if ($name === '' || $lastName === '' || $username === '' || $email === '') {
      json_error('Nombre, apellido, usuario y email institucional requeridos', 422);
    }

    $exists = db_one($pdo, 'SELECT id FROM users WHERE username=? OR email=?', [$username, $email]);
    if ($exists) json_error('Usuario o email ya existe', 409);

    $photoData = null;
    $photoMime = null;
    if (!empty($in['photo_data'])) {
      if (!preg_match('/^data:(.*?);base64,(.*)$/', (string)$in['photo_data'], $m)) {
        json_error('Formato de foto inválido', 422);
      }
      $mime = $m[1];
      $data = $m[2];
      $bin = base64_decode($data, true);
      if ($bin === false) json_error('Foto inválida', 422);
      if (strlen($bin) > 200 * 1024) json_error('La foto supera el límite de 200KB', 422);
      $photoData = $data;
      $photoMime = $mime;
    }

    $hash = password_hash($username, PASSWORD_DEFAULT);
    $st = $pdo->prepare('INSERT INTO users (name, last_name, username, email, personal_email, legajo, phone, photo_data, photo_mime, password_hash, must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?,1)');
    $st->execute([
      $name,
      $lastName,
      $username,
      $email,
      $personalEmail !== '' ? $personalEmail : null,
      $legajo !== '' ? $legajo : null,
      $phone !== '' ? $phone : null,
      $photoData,
      $photoMime,
      $hash,
    ]);
    $userId = (int)$pdo->lastInsertId();

    $roleCodes = array_values(array_filter(array_map('strval', (array)$roles)));
    if ($roleCodes) {
      $placeholders = implode(',', array_fill(0, count($roleCodes), '?'));
      $rs = $pdo->prepare("SELECT id FROM roles WHERE code IN ($placeholders)");
      $rs->execute($roleCodes);
      $roleIds = array_map('intval', array_column($rs->fetchAll(), 'id'));
      foreach ($roleIds as $roleId) {
        $ur = $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?,?)');
        $ur->execute([$userId, $roleId]);
      }
    }

    $to = $email;
    $subject = 'Alta de cuenta en SyPdN';
    $body = "Hola $name $lastName,\n\nTu cuenta fue creada.\nUsuario: $username\nContraseña inicial: $username\nAl ingresar por primera vez, el sistema te pedirá cambiar la contraseña.\n";
    $headers = "From: noreply@example.com\r\nContent-Type: text/plain; charset=\"utf-8\"";
    $sent = mail($to, $subject, $body, $headers);

    json_ok([
      'id' => $userId,
      'email_sent' => (bool)$sent,
    ]);
  });

  route('POST', '/api/admin/users/update', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $userId = (int)($in['user_id'] ?? 0);
    if ($userId <= 0) json_error('user_id requerido', 422);

    $fields = [];
    $params = [];
    $map = [
      'name' => 'name',
      'last_name' => 'last_name',
      'username' => 'username',
      'email' => 'email',
      'personal_email' => 'personal_email',
      'legajo' => 'legajo',
      'phone' => 'phone',
    ];
    foreach ($map as $key => $col) {
      if (array_key_exists($key, $in)) {
        $val = trim((string)$in[$key]);
        if (in_array($key, ['name', 'last_name', 'username', 'email'], true) && $val === '') {
          json_error("$key inválido", 422);
        }
        $fields[] = $col . '=?';
        $params[] = $val !== '' ? $val : null;
      }
    }

    if (array_key_exists('username', $in) || array_key_exists('email', $in)) {
      $conditions = [];
      $dupeParams = [];
      if (array_key_exists('username', $in)) {
        $conditions[] = 'username=?';
        $dupeParams[] = trim((string)$in['username']);
      }
      if (array_key_exists('email', $in)) {
        $conditions[] = 'email=?';
        $dupeParams[] = trim((string)$in['email']);
      }
      if ($conditions) {
        $dupeParams[] = $userId;
        $dupe = db_one(
          $pdo,
          'SELECT id FROM users WHERE (' . implode(' OR ', $conditions) . ') AND id<>?',
          $dupeParams
        );
        if ($dupe) json_error('Usuario o email ya existe', 409);
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

    if (!$fields && !array_key_exists('roles', $in) && empty($in['reset_password'])) {
      json_error('Sin cambios', 422);
    }

    if ($fields) {
      $params[] = $userId;
      $st = $pdo->prepare('UPDATE users SET ' . implode(',', $fields) . ' WHERE id=?');
      $st->execute($params);
    }

    if (array_key_exists('roles', $in)) {
      $pdo->prepare('DELETE FROM user_roles WHERE user_id=?')->execute([$userId]);
      $roleCodes = array_values(array_filter(array_map('strval', (array)$in['roles'])));
      if ($roleCodes) {
        $placeholders = implode(',', array_fill(0, count($roleCodes), '?'));
        $rs = $pdo->prepare("SELECT id FROM roles WHERE code IN ($placeholders)");
        $rs->execute($roleCodes);
        $roleIds = array_map('intval', array_column($rs->fetchAll(), 'id'));
        foreach ($roleIds as $roleId) {
          $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?,?)')->execute([$userId, $roleId]);
        }
      }
    }

    if (!empty($in['reset_password'])) {
      $uRow = db_one($pdo, 'SELECT username FROM users WHERE id=?', [$userId]);
      if (!$uRow) json_error('Usuario no encontrado', 404);
      $hash = password_hash($uRow['username'], PASSWORD_DEFAULT);
      $pdo->prepare('UPDATE users SET password_hash=?, must_change_password=1 WHERE id=?')->execute([$hash, $userId]);
    }

    json_ok(['updated' => true]);
  });

  route('POST', '/api/admin/users/delete', function (): void {
    $pdo = db();
    $u = auth_user();
    require_role($u, ['GURU']);

    $in = read_json();
    $userId = (int)($in['user_id'] ?? 0);
    $confirm = strtoupper(trim((string)($in['confirm'] ?? '')));
    if ($userId <= 0) json_error('user_id requerido', 422);
    if ($confirm !== 'ELIMINAR') json_error('confirm inválido', 422);

    $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$userId]);
    json_ok(['deleted' => true]);
  });
}