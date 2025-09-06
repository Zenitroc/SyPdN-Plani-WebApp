<?php
declare(strict_types=1);

function get_auth_header(): string {
  // 1) Cabeceras comunes
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if ($hdr === '' && isset($_SERVER['Authorization'])) $hdr = (string)$_SERVER['Authorization'];
  if ($hdr === '' && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $hdr = (string)$_SERVER['REDIRECT_HTTP_AUTHORIZATION'];

  // 2) Fallback a getallheaders()
  if ($hdr === '' && function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) {
      if (strcasecmp($k, 'Authorization') === 0) { $hdr = (string)$v; break; }
    }
  }
  return trim($hdr);
}

function auth_require(): void {
  $hdr = get_auth_header();
  if (!preg_match('/Bearer\s+(.+)/i', $hdr, $m)) {
    json_error('Missing token', 401);
  }
  $secret = getenv('JWT_SECRET') ?: 'CAMBIA_ESTE_SECRETO_LARGO';
  try {
    $payload = jwt_decode(trim($m[1]), $secret);
  } catch (Throwable $e) {
    json_error('Invalid token: '.$e->getMessage(), 401);
  }

  // Normalizar roles a array de strings
  $roles = $payload['roles'] ?? [];
  if (is_string($roles)) $roles = [$roles];
  elseif (is_array($roles) && $roles && !is_string(reset($roles))) {
    // por si vinieran como objetos/arrays con 'code'
    $roles = array_values(array_filter(array_map(
      fn($r) => is_array($r) && isset($r['code']) ? (string)$r['code'] : (is_string($r) ? $r : null),
      $roles
    )));
  }

  // Guardar usuario en contexto global
  $GLOBALS['auth_user'] = [
    'id'         => (int)($payload['sub'] ?? 0),
    'name'       => $payload['name'] ?? '',
    'roles'      => $roles,
    'course_ids' => $payload['course_ids'] ?? [],
  ];
  // espejo opcional por compat
  $GLOBALS['AUTH_USER'] = $GLOBALS['auth_user'];
}

function auth_user(): array {
  return $GLOBALS['auth_user'] ?? [];
}

// Alias uniforme para el resto del código
if (!function_exists('current_user')) {
  function current_user(): array {
    return auth_user();
  }
}
