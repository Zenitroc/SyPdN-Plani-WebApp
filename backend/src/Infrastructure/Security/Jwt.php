<?php
declare(strict_types=1);

if (!function_exists('b64url')) {
  function b64url($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
}
if (!function_exists('b64urld')) {
  function b64urld($data) { return base64_decode(strtr($data, '-_', '+/')); }
}

if (!function_exists('jwt_encode')) {
  function jwt_encode(array $payload, string $secret, int $expSeconds=900): string {
    $header = ['alg'=>'HS256','typ'=>'JWT'];
    $payload['iat'] = time();
    $payload['exp'] = time() + $expSeconds;
    $segments = [b64url(json_encode($header)), b64url(json_encode($payload))];
    $signing  = implode('.', $segments);
    $sig = hash_hmac('sha256', $signing, $secret, true);
    $segments[] = b64url($sig);
    return implode('.', $segments);
  }
}

if (!function_exists('jwt_decode')) {
  function jwt_decode(string $jwt, string $secret): array {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) throw new Exception('Invalid token');
    [$h,$p,$s] = $parts;
    $check = b64url(hash_hmac('sha256', "$h.$p", $secret, true));
    if (!hash_equals($check, $s)) throw new Exception('Bad signature');
    $payload = json_decode(b64urld($p), true) ?: [];
    if (($payload['exp'] ?? 0) < time()) throw new Exception('Token expired');
    return $payload;
  }
}
