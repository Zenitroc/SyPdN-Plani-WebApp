<?php
// Atajo para `php -S localhost:8080 router.php` desde la raíz: misma lógica que dev/router.php
// (/api → API PHP, el resto → SPA compilada en frontend/dist).
return require __DIR__ . '/dev/router.php';
