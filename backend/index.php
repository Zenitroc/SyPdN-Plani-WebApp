<?php
declare(strict_types=1);

require __DIR__ . '/src/Infrastructure/Config/Env.php';
require __DIR__ . '/src/Infrastructure/Http/JsonResponse.php';
require __DIR__ . '/src/Infrastructure/Database/Connection.php';
require __DIR__ . '/src/Infrastructure/Security/Jwt.php';
require __DIR__ . '/src/Middleware/AuthMiddleware.php';
require __DIR__ . '/src/Middleware/Rbac.php';
require __DIR__ . '/src/Middleware/CourseGuard.php';
require __DIR__ . '/src/Infrastructure/Http/Router.php';
require __DIR__ . '/src/Domain/Course.php';
require __DIR__ . '/src/Repositories/CourseRepository.php';
require __DIR__ . '/src/Services/CourseService.php';
require __DIR__ . '/src/Controllers/CourseController.php';
require __DIR__ . '/src/Repositories/DashboardRepository.php';
require __DIR__ . '/src/Services/DashboardService.php';
require __DIR__ . '/src/Controllers/DashboardController.php';

load_env_stack(dirname(__DIR__) . '/.env');

$origins = getenv('CORS_ORIGINS') ?: '*';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origins === '*' || ($origin !== '' && in_array($origin, array_map('trim', explode(',', $origins)), true))) {
    header('Access-Control-Allow-Origin: ' . ($origins === '*' ? '*' : $origin));
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();
function route(string $method, string $path, callable $handler, bool $public = false): void
{
    global $router;
    $router->add($method, $path, $handler, $public);
}

$courseController = new CourseController(new CourseService(new CourseRepository(db())));
$courseController->register();
(new DashboardController(new DashboardService(new DashboardRepository(db()))))->register();

foreach (['session', 'estudiantes', 'grupos', 'entregas', 'parciales', 'notas_finales', 'reportes', 'asistencia', 'planificacion', 'course_admin', 'user_admin', 'course_color'] as $module) {
    require __DIR__ . '/src/Legacy/' . $module . '.php';
}
register_course_color_routes();
register_planificacion_routes();
register_course_admin_routes();
register_user_admin_routes();
register_session_routes();
register_student_routes();
register_group_routes();
register_entregas_routes();
register_parciales_routes();
register_notas_finales_routes();
register_report_routes();
register_asistencia_routes();

$router->dispatch();
