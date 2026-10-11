<?php
declare(strict_types=1);

// Router para el servidor embebido de PHP:  php -S 127.0.0.1:8080 dev/router.php
//   /api/*  → API (backend/public/index.php)
//   resto   → SPA compilada (frontend/dist); las rutas del cliente caen en index.html
// En desarrollo el front lo sirve Vite (npm run dev) y este router solo atiende /api.

$root = dirname(__DIR__);
$path = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

function dev_content_type(string $file): string {
  $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
  return match ($ext) {
    'css' => 'text/css; charset=utf-8',
    'js', 'mjs' => 'application/javascript; charset=utf-8',
    'json', 'map' => 'application/json; charset=utf-8',
    'html' => 'text/html; charset=utf-8',
    'txt' => 'text/plain; charset=utf-8',
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

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// API PHP
if ($path === '/api' || str_starts_with($path, '/api/')) {
  $_SERVER['SCRIPT_NAME'] = '/api/index.php';
  $_SERVER['SCRIPT_FILENAME'] = $root . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'index.php';

  require $root . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'index.php';
  return true;
}

$dist = realpath($root . DIRECTORY_SEPARATOR . 'frontend' . DIRECTORY_SEPARATOR . 'dist');
if (!$dist) {
  http_response_code(503);
  header('Content-Type: text/plain; charset=utf-8');
  echo "El front no esta compilado.\n\nDesarrollo: npm run dev y abri http://localhost:5173\nProduccion:  npm run build y recarga esta pagina\n";
  return true;
}

// Archivo real dentro de dist (JS, CSS, imagenes...)
$requested = realpath($dist . DIRECTORY_SEPARATOR . ltrim($path, '/'));
$hidden = str_starts_with(basename($path), '.'); // .htaccess y similares no se publican
if (!$hidden && $requested && str_starts_with($requested, $dist . DIRECTORY_SEPARATOR) && is_file($requested)) {
  header('Content-Type: ' . dev_content_type($requested));
  readfile($requested);
  return true;
}

// Un archivo que no existe es un 404 real; devolver el HTML de la app confundiria al navegador.
if ($hidden || pathinfo($path, PATHINFO_EXTENSION) !== '') {
  http_response_code(404);
  header('Content-Type: text/plain; charset=utf-8');
  echo 'Not found';
  return true;
}

// Rutas de la SPA (/login, /app/...): las resuelve el router del cliente.
header('Content-Type: text/html; charset=utf-8');
readfile($dist . DIRECTORY_SEPARATOR . 'index.html');
return true;
