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
      'course_ids'=>$course_ids
    ]]);
  }, true);

  // Perfil actual
  route('GET', '/api/me', function (): void {
    $u = auth_user();
    json_ok($u);
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
