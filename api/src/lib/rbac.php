<?php
declare(strict_types=1);

function user_has_role(array $user, string $role): bool {
  return in_array($role, $user['roles'] ?? [], true);
}

function require_role(array $user, array $allowed): void {
  foreach ($allowed as $r) if (user_has_role($user, $r)) return;
  json_error('Forbidden (role)', 403);
}
