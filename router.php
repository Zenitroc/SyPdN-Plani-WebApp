<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

if ($uri === '/api' || str_starts_with($uri, '/api/')) {
    chdir(__DIR__ . '/backend/public');
    require __DIR__ . '/backend/public/index.php';
    return;
}

$publicPath = __DIR__ . '/frontend' . $uri;

if ($uri !== '/' && file_exists($publicPath) && !is_dir($publicPath)) {
    return false;
}

$fallback = __DIR__ . '/frontend/spa/index.html';
if (file_exists($fallback)) { header('Content-Type: text/html; charset=utf-8'); readfile($fallback); return; }

$fallback2 = __DIR__ . '/frontend/index.html';
if (file_exists($fallback2)) { header('Content-Type: text/html; charset=utf-8'); readfile($fallback2); return; }

http_response_code(404);
echo "Not Found";
