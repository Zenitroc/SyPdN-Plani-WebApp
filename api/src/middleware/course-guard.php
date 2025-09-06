<?php
function ensure_course_access(int $courseId): void {
  $u = auth_user();
  if (in_array('GURU', $u['roles'] ?? [], true)) return;
  if (!in_array($courseId, $u['course_ids'] ?? [], true)) {
    json_error('Forbidden (course)', 403);
  }
}
