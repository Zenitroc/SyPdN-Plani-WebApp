<?php
// api/src/routes/planificacion.php

function register_planificacion_routes() {
  // Obtener enlace de planificación de un curso
  route('GET', '/api/planificacion', function() {
    $pdo = db();
    $courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
    if ($courseId <= 0) return json_error('Parámetro course_id requerido', 400);

    auth_require();
    ensure_course_access($courseId);

    $stmt = $pdo->prepare("SELECT id AS course_id, COALESCE(plan_url, '') AS plan_url FROM courses WHERE id = ?");
    $stmt->execute([$courseId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return json_error('Curso no encontrado', 404);

    return json_ok(['course' => $row]);
  });

  // Guardar enlace de planificación (solo GURÚ)
  route('POST', '/api/planificacion/guardar', function() {
    $pdo = db();
    auth_require();
    $me = current_user();
    require_role($me, ['GURU']);

    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $courseId = (int)($body['course_id'] ?? 0);
    $planUrl = trim($body['plan_url'] ?? '');
    if ($courseId <= 0) return json_error('course_id inválido', 400);

    $exists = db_one($pdo, "SELECT COUNT(1) AS n FROM courses WHERE id = ?", [$courseId]);
    if (($exists['n'] ?? 0) == 0) return json_error('Curso no encontrado', 404);

    $stmt = $pdo->prepare("UPDATE courses SET plan_url = ? WHERE id = ?");
    $stmt->execute([$planUrl, $courseId]);

    return json_ok(['saved' => true, 'course_id' => $courseId, 'plan_url' => $planUrl]);
  });
}