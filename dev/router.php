<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$public = realpath($root . DIRECTORY_SEPARATOR . 'frontend');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

function dev_content_type(string $file): string {
  $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
  return match ($ext) {
    'css' => 'text/css; charset=utf-8',
    'js' => 'application/javascript; charset=utf-8',
    'json' => 'application/json; charset=utf-8',
    'html' => 'text/html; charset=utf-8',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg', 'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'ico' => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    default => 'application/octet-stream',
  };
}

if (!$public) {
  http_response_code(500);
  echo 'No se encontro la carpeta frontend';
  return true;
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// API PHP
if (str_starts_with($path, '/api')) {
  $_SERVER['SCRIPT_NAME'] = '/api/index.php';
  $_SERVER['SCRIPT_FILENAME'] = $root . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'index.php';

  require $root . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'index.php';
  return true;
}

// Archivos/carpetas estaticas dentro de public
$requested = realpath($public . DIRECTORY_SEPARATOR . ltrim($path, '/'));

if ($requested && str_starts_with($requested, $public)) {
  // Si es archivo real: CSS, JS, imagen, etc.
  if (is_file($requested)) {
    header('Content-Type: ' . dev_content_type($requested));
    readfile($requested);
    return true;
  }

  // Si es carpeta y tiene index.html: /pages/login/ -> /pages/login/index.html
  if (is_dir($requested)) {
    $indexFile = $requested . DIRECTORY_SEPARATOR . 'index.html';
    if (is_file($indexFile)) {
      header('Content-Type: text/html; charset=utf-8');
      require $indexFile;
      return true;
    }
  }
}

// Home por defecto
$home = $public . DIRECTORY_SEPARATOR . 'index.html';

if (is_file($home)) {
  header('Content-Type: text/html; charset=utf-8');
  require $home;
  return true;
}

http_response_code(404);
echo 'Not found';
return true;
