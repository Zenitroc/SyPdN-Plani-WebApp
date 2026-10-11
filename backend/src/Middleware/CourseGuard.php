<?php
function ensure_course_access(int $courseId): void {
  $u = auth_user();
  if (in_array('GURU', $u['roles'] ?? [], true)) return;
  // Se consulta la asignación vigente y no la lista del token: así asignar o quitar
  // a un docente de un curso rige de inmediato, sin esperar a que vuelva a iniciar sesión.
  $st = db()->prepare('SELECT 1 FROM user_courses WHERE user_id=? AND course_id=?');
  $st->execute([(int)($u['id'] ?? 0), $courseId]);
  if (!$st->fetchColumn()) {
    json_error('Forbidden (course)', 403);
  }
}
