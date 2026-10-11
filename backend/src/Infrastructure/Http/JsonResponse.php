<?php
function json_ok($data=null, int $code=200): void {
  http_response_code($code);
  echo json_encode($data ?? new stdClass(), JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
  exit;
}
function json_error(string $msg, int $code=400, $extra=null): void {
  http_response_code($code);
  echo json_encode(['error'=>$msg,'extra'=>$extra], JSON_UNESCAPED_UNICODE);
  exit;
}
function read_json(): array {
  $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
  $raw = file_get_contents('php://input') ?: '';

  // 1) Intentar JSON
  $data = json_decode($raw, true);
  if (json_last_error() === JSON_ERROR_NONE && is_array($data)) return $data;

  // 2) Si vino como x-www-form-urlencoded
  if (stripos($contentType, 'application/x-www-form-urlencoded') !== false) {
    return $_POST; // PHP ya lo parseó
  }

  // 3) Fallback: parsear estilo querystring por si PS envía crudo
  parse_str($raw, $parsed);
  if (is_array($parsed) && !empty($parsed)) return $parsed;

  return [];
}
