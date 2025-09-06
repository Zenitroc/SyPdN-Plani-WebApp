<?php
function register_course_routes() {
  // Listado de cursos (scope=all|mine)
  route('GET', '/api/courses', function() {
    $scope = $_GET['scope'] ?? 'mine';
    $pdo = db(); $u = auth_user();
    if ($scope === 'all') {
      require_role($u, ['GURU']);
      $q = $pdo->query("SELECT id, code, name, term, is_active FROM courses ORDER BY name");
      json_ok($q->fetchAll());
    } else {
      $st = $pdo->prepare("SELECT c.id, c.code, c.name, c.term, c.is_active
                           FROM courses c
                           JOIN user_courses uc ON uc.course_id=c.id
                           WHERE uc.user_id=? ORDER BY c.name");
      $st->execute([$u['id']]);
      json_ok($st->fetchAll());
    }
  });
}
