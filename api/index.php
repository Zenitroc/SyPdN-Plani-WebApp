<?php
declare(strict_types=1);

require __DIR__ . '/src/lib/env.php';
require __DIR__ . '/src/lib/json.php';
require __DIR__ . '/src/lib/db.php';
require __DIR__ . '/src/lib/jwt.php';
require __DIR__ . '/src/middleware/auth.php';       // ← primero auth (current_user, auth_require)
require __DIR__ . '/src/lib/rbac.php';              // ← luego rbac (require_role, user_has_role)
require __DIR__ . '/src/middleware/course-guard.php';


load_env(dirname(__DIR__) . '/.env');

// CORS
$origins = getenv('CORS_ORIGINS') ?: '*';
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '*';
if ($origins === '*' || in_array($origin, array_map('trim', explode(',', $origins)), true)) {
  header('Access-Control-Allow-Origin: ' . ($origins === '*' ? '*' : $origin));
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

// Router
$ROUTES = [];
function route(string $method, string $path, callable $handler, bool $public=false): void {
  global $ROUTES; $ROUTES[] = [$method, $path, $handler, $public];
}
function dispatch(): void {
  global $ROUTES;
  $reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  $reqPath   = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
  $scriptName = str_replace('\\','/', $_SERVER['SCRIPT_NAME'] ?? '');
  $baseApp    = rtrim(dirname(dirname($scriptName)), '/');
  if ($baseApp !== '' && str_starts_with($reqPath, $baseApp)) {
    $reqPath = substr($reqPath, strlen($baseApp)) ?: '/';
  }
  if ($reqPath === '' || $reqPath[0] !== '/') $reqPath = '/' . $reqPath;

  foreach ($ROUTES as [$m,$p,$h,$public]) {
    if ($m === $reqMethod && $p === $reqPath) {
      if (!$public) auth_require();
      try { $h(); } catch (Throwable $e) { json_error('Server error: '.$e->getMessage(), 500); }
      return;
    }
  }
  json_error('Not found', 404);
}

// Rutas
require __DIR__ . '/src/routes/session.php';
require __DIR__ . '/src/routes/courses.php';
require __DIR__ . '/src/routes/estudiantes.php';
require __DIR__ . '/src/routes/grupos.php';
require __DIR__ . '/src/routes/entregas.php';  

register_session_routes();
register_course_routes();
register_student_routes();
register_group_routes();
register_entregas_routes(); 

dispatch();
