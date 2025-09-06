<?php
function register_student_routes() {
  // GET /api/estudiantes?course_id=...
  route('GET', '/api/estudiantes', function() {
    $courseId = (int)($_GET['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $pdo = db();
    $st = $pdo->prepare("
      SELECT e.id, e.course_student_id AS course_id_seq, e.status,
             p.last_name AS apellido, p.first_name AS nombre, p.legajo, p.email_inst,
             g.number AS group_no, e.observaciones
      FROM enrollments e
      JOIN people p ON p.id=e.person_id
      LEFT JOIN groups g ON g.id=e.group_id
      WHERE e.course_id=?
      ORDER BY e.course_student_id
    ");
    $st->execute([$courseId]);
    json_ok($st->fetchAll());
  });
}
