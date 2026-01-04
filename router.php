<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

if (strpos($uri, '/api') === 0) {
    $_SERVER['REQUEST_URI'] = substr($_SERVER['REQUEST_URI'], 4) ?: '/';
    chdir(__DIR__ . '/api');
    require __DIR__ . '/api/index.php';
    return;
}

$publicPath = __DIR__ . '/public' . $uri;

if ($uri !== '/' && file_exists($publicPath) && !is_dir($publicPath)) {
    return false;
}

$fallback = __DIR__ . '/public/spa/index.html';
if (file_exists($fallback)) { header('Content-Type: text/html; charset=utf-8'); readfile($fallback); return; }

$fallback2 = __DIR__ . '/public/index.html';
if (file_exists($fallback2)) { header('Content-Type: text/html; charset=utf-8'); readfile($fallback2); return; }

http_response_code(404);
echo "Not Found";
