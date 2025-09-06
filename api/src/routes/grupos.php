<?php
declare(strict_types=1);

function register_group_routes(): void {

  // Listado con contadores
  route('GET', '/api/grupos', function () {
    $courseId = (int)($_GET['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);
    $pdo = db();
    $st = $pdo->prepare("
      SELECT g.id, g.number, g.name, g.conformity_submitted, g.conformity_url,
             (SELECT COUNT(*) FROM enrollments e WHERE e.group_id=g.id) AS members
      FROM groups g WHERE g.course_id=? ORDER BY g.number
    ");
    $st->execute([$courseId]);
    json_ok($st->fetchAll());
  });

  // Miembros de un grupo (para UI)
  route('GET', '/api/grupos/miembros', function () {
    $courseId = (int)($_GET['course_id'] ?? 0);
    $number   = (int)($_GET['group_number'] ?? 0);
    if ($courseId<=0 || $number<=0) json_error('course_id y group_number requeridos', 422);
    ensure_course_access($courseId);
    $pdo = db();
    $gid = group_id_by_number($pdo, $courseId, $number);
    if (!$gid) json_error('Grupo no existe', 404);
    $st = $pdo->prepare("
      SELECT e.id AS enrollment_id, e.course_student_id AS id_en_curso,
             p.last_name AS apellido, p.first_name AS nombre, p.legajo
      FROM enrollments e
      JOIN people p ON p.id=e.person_id
      WHERE e.course_id=? AND e.group_id=?
      ORDER BY p.last_name, p.first_name
    ");
    $st->execute([$courseId, $gid]);
    json_ok($st->fetchAll());
  });

  // Crear grupo (unitario, con nombre opcional). Acepta count para compatibilidad.
  route('POST', '/api/grupos/crear', function () {
    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    if ($courseId <= 0) json_error('course_id requerido', 422);
    ensure_course_access($courseId);

    $count = isset($in['count']) ? max(1,(int)$in['count']) : 1;
    $name  = isset($in['name']) ? trim((string)$in['name']) : null;

    $pdo = db(); $pdo->beginTransaction();
    try {
      $max = (int)($pdo->query("SELECT COALESCE(MAX(number),0) AS m FROM groups WHERE course_id=$courseId")->fetch()['m'] ?? 0);
      $ins = $pdo->prepare("INSERT INTO groups(course_id, number, name) VALUES (?,?,?)");
      $nums=[];
      for ($i=1;$i<=$count;$i++){
        $n = $max+$i; $ins->execute([$courseId,$n, $i===1 ? $name : null]); $nums[]=$n;
      }
      $pdo->commit();
      json_ok(['created'=>count($nums),'numbers'=>$nums]);
    } catch (Throwable $e) {
      $pdo->rollBack();
      json_error('No se pudieron crear grupos: '.$e->getMessage(), 400);
    }
  });

  // Editar nombre / conformidad
  route('POST', '/api/grupos/editar', function () {
    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    $number   = (int)($in['group_number'] ?? 0);
    if ($courseId<=0 || $number<=0) json_error('course_id y group_number requeridos', 422);
    ensure_course_access($courseId);

    $name   = array_key_exists('name',$in) ? ( $in['name']!==null ? trim((string)$in['name']) : null ) : '__NOCHANGE__';
    $conf   = array_key_exists('conformity_submitted',$in) ? ( (int)$in['conformity_submitted']?1:0 ) : '__NOCHANGE__';
    $confUrl= array_key_exists('conformity_url',$in) ? ( $in['conformity_url']!==null ? trim((string)$in['conformity_url']) : null ) : '__NOCHANGE__';

    $pdo = db();
    $gid = group_id_by_number($pdo, $courseId, $number);
    if (!$gid) json_error('Grupo no existe', 404);

    $fields=[]; $vals=[];
    if ($name!=='__NOCHANGE__')   { $fields[]='name=?'; $vals[]=$name; }
    if ($conf!=='__NOCHANGE__')   { $fields[]='conformity_submitted=?'; $vals[]=$conf; }
    if ($confUrl!=='__NOCHANGE__'){ $fields[]='conformity_url=?'; $vals[]=$confUrl; }
    if (!$fields) json_ok(['ok'=>true]);
    $vals[]=$gid;
    $sql="UPDATE groups SET ".implode(',',$fields)." WHERE id=?";
    $pdo->prepare($sql)->execute($vals);
    json_ok(['ok'=>true]);
  });

  // Asignar miembros a un grupo (reutilizable para mover)
  route('POST', '/api/grupos/asignar', function () {
    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    $groupNumber = array_key_exists('group_number',$in) ? ( $in['group_number']!==null ? (int)$in['group_number'] : null ) : null;
    $ids = $in['enrollment_ids'] ?? [];
    if ($courseId<=0 || !is_array($ids) || count($ids)===0) json_error('course_id y enrollment_ids requeridos', 422);
    ensure_course_access($courseId);

    $pdo = db();
    $gid = null;
    if ($groupNumber!==null) {
      $gid = group_id_by_number($pdo, $courseId, $groupNumber);
      if (!$gid) json_error('Grupo no existe en este curso', 404);
    }

    // Validar que todos los enrollments pertenezcan al curso
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $chk = $pdo->prepare("SELECT COUNT(*) c FROM enrollments WHERE id IN ($ph) AND course_id=?");
    $chk->execute([...$ids, $courseId]);
    $count = (int)$chk->fetch()['c'];
    if ($count !== count($ids)) json_error('Algún alumno no pertenece a este curso', 400);

    // Asignar (o quitar si $gid es null)
    $upd = $pdo->prepare("UPDATE enrollments SET group_id ".($gid===null?'=NULL':'=?')." WHERE id IN ($ph)");
    $args = $gid===null ? [...$ids] : [$gid, ...$ids];
    $upd->execute($args);
    json_ok(['updated'=>$count, 'group_id'=>$gid, 'group_number'=>$groupNumber]);
  });

  // Eliminar grupo (miembros quedan sin grupo)
  route('POST', '/api/grupos/eliminar', function () {
    $in = read_json();
    $courseId = (int)($in['course_id'] ?? 0);
    $number   = (int)($in['group_number'] ?? 0);
    if ($courseId<=0 || $number<=0) json_error('course_id y group_number requeridos', 422);
    ensure_course_access($courseId);

    $pdo = db();
    $gid = group_id_by_number($pdo, $courseId, $number);
    if (!$gid) json_error('Grupo no existe', 404);
    $pdo->prepare("DELETE FROM groups WHERE id=?")->execute([$gid]); // ON DELETE SET NULL limpia miembros
    json_ok(['deleted'=>true, 'group_number'=>$number]);
  });
}
