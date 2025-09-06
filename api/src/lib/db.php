<?php
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;

  $host = getenv('DB_HOST') ?: 'localhost';
  $name = getenv('DB_NAME') ?: 'spn';
  $user = getenv('DB_USER') ?: 'root';
  $pass = getenv('DB_PASS') ?: '';
  $dsn  = "mysql:host=$host;dbname=$name;charset=utf8mb4";

  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}
