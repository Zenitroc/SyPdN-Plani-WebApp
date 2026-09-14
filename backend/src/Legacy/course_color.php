<?php
// api/src/routes/course_color.php

function register_course_color_routes() {

  // Obtener color de un curso
  route('GET', '/api/course-color', function() {
    $pdo = db();
    $courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
    if ($courseId <= 0) return json_error('Parámetro course_id requerido', 400);

    auth_require();
    ensure_course_access($courseId);

    $stmt = $pdo->prepare("SELECT id AS course_id, COALESCE(color_hex, '') AS color_hex FROM courses WHERE id = ?");
    $stmt->execute([$courseId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return json_error('Curso no encontrado', 404);

    return json_ok(['course' => $row]);
  });

  // Listar colores de cursos (alcance según rol)
  route('GET', '/api/courses/colors', function() {
    $pdo = db();
    auth_require();

    $me = current_user();
    $isGuru = user_has_role($me, 'GURU');
    $scope = (isset($_GET['scope']) && $_GET['scope'] === 'all') ? 'all' : 'assigned';
    if ($scope === 'all' && !$isGuru) return json_error('Solo GURÚ puede ver todos', 403);

    if ($scope === 'all') {
      $stmt = $pdo->query("SELECT c.id AS course_id, COALESCE(c.color_hex, '') AS color_hex
                           FROM courses c
                           ORDER BY c.id");
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
      $stmt = $pdo->prepare("SELECT c.id AS course_id, COALESCE(c.color_hex, '') AS color_hex
                             FROM user_courses uc
                             JOIN courses c ON c.id = uc.course_id
                             WHERE uc.user_id = ?
                             ORDER BY c.id");
      $stmt->execute([$me['id']]);
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    return json_ok(['colors' => $rows ?: []]);
  });

  // Guardar color (solo GURÚ)
  route('POST', '/api/course-color/guardar', function() {
    $pdo = db();
    auth_require();
    $me = current_user();
    require_role($me, ['GURU']);

    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $courseId = (int)($body['course_id'] ?? 0);
    $colorHex = trim($body['color_hex'] ?? '');

    if ($courseId <= 0) return json_error('course_id inválido', 400);
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $colorHex)) return json_error('color_hex debe ser #RRGGBB', 422);

    $exists = db_one($pdo, "SELECT COUNT(1) AS n FROM courses WHERE id = ?", [$courseId]);
    if (($exists['n'] ?? 0) == 0) return json_error('Curso no encontrado', 404);

    $stmt = $pdo->prepare("UPDATE courses SET color_hex = ? WHERE id = ?");
    $stmt->execute([$colorHex, $courseId]);

    return json_ok(['saved' => true, 'course_id' => $courseId, 'color_hex' => $colorHex]);
  });
}
