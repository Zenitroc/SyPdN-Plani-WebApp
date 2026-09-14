<?php
declare(strict_types=1);

/* Normaliza roles desde distintos formatos:
   - ['GURU','SENIOR']
   - 'GURU'
   - [ ['code'=>'GURU'], ['code'=>'AYUDANTE'] ]
*/
function normalize_roles(mixed $roles): array {
  if (is_string($roles)) return [$roles];
  if (!is_array($roles)) return [];
  // array de strings
  if ($roles && is_string(reset($roles))) return $roles;
  // array de objetos/arreglos con 'code'
  $out = [];
  foreach ($roles as $r) {
    if (is_array($r) && isset($r['code']) && is_string($r['code'])) $out[] = $r['code'];
  }
  return $out;
}

function user_has_role(array $user, string $role): bool {
  $roles = normalize_roles($user['roles'] ?? []);
  return in_array($role, $roles, true);
}

/** Requiere que $user tenga alguno de $allowed. */
function require_role(array $user, array $allowed): void {
  foreach ($allowed as $r) if (user_has_role($user, $r)) return;
  json_error('Forbidden (role)', 403);
}

/** === Solo Gurú === */
if (!function_exists('ensure_guru')) {
  function ensure_guru(): void {
    if (!function_exists('current_user')) json_error('Solo permitido para Gurú', 403);
    $u = current_user();
    if (!is_array($u)) json_error('Solo permitido para Gurú', 403);
    // Usa la firma correcta de require_role
    require_role($u, ['GURU']);
  }
}
