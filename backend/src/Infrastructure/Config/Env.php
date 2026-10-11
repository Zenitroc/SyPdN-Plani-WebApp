<?php
function load_env(string $path): void {
  if (!is_file($path)) return;
  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    if (str_starts_with(trim($line), '#')) continue;
    [$k,$v] = array_map('trim', array_pad(explode('=', $line, 2), 2, ''));
    if ($k === '') continue;
    $v = trim($v, "\"' ");
    putenv("$k=$v"); $_ENV[$k] = $v;
  }
}
function load_env_stack(string $rootPath): void {
  // Orden: base -> perfil (sobrescribe)
  load_env($rootPath);
  $appEnv = getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? '');
  if ($appEnv !== '') {
    $profilePath = $rootPath . '.' . $appEnv;
    load_env($profilePath);
  }
}

