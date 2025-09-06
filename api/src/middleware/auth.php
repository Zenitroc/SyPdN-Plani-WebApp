<?php
declare(strict_types=1);

function get_auth_header(): string {
  // 1) Variables comunes de Apache/PHP
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
  // Guardar usuario en contexto global
  $GLOBALS['auth_user'] = [
    'id' => (int)($payload['sub'] ?? 0),
    'name' => $payload['name'] ?? '',
    'roles' => $payload['roles'] ?? [],
    'course_ids' => $payload['course_ids'] ?? [],
  ];
}

function auth_user(): array {
  return $GLOBALS['auth_user'] ?? [];
}
