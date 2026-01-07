<?php
function register_report_routes(): void {
  $ensure_schema = function(PDO $pdo): void {
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS reportes_resources (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(180) NOT NULL,
        description TEXT DEFAULT NULL,
        url TEXT NOT NULL,
        icon_emoji VARCHAR(16) DEFAULT NULL,
        icon_image TEXT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    $pdo->exec("
      CREATE TABLE IF NOT EXISTS reportes_news (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(180) NOT NULL,
        preview TEXT DEFAULT NULL,
        body TEXT DEFAULT NULL,
        link TEXT DEFAULT NULL,
        link_label VARCHAR(120) DEFAULT NULL,
        image TEXT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        updated_by INT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
  };

  route('GET', '/api/reportes/config', function () use ($ensure_schema): void {
    $pdo = db();
    $ensure_schema($pdo);
    $resources = $pdo->query('SELECT id, title, description, url, icon_emoji, icon_image FROM reportes_resources ORDER BY id DESC')->fetchAll();
    $news = $pdo->query('SELECT id, title, preview, body, link, link_label, image FROM reportes_news ORDER BY id DESC')->fetchAll();
    json_ok(['resources' => $resources, 'news' => $news]);
  });

  route('POST', '/api/reportes/resources/save', function () use ($ensure_schema): void {
    ensure_guru();
    $pdo = db();
    $ensure_schema($pdo);
    $in = read_json();
    $id = isset($in['id']) ? (int)$in['id'] : 0;
    $title = trim((string)($in['title'] ?? ''));
    $description = trim((string)($in['description'] ?? ''));
    $url = trim((string)($in['url'] ?? ''));
    $iconEmoji = trim((string)($in['icon_emoji'] ?? ''));
    $iconImage = trim((string)($in['icon_image'] ?? ''));

    if ($title === '' || $url === '') json_error('Nombre y URL requeridos', 422);
    if ($iconImage !== '' && preg_match('/^data:(.*?);base64,(.*)$/', $iconImage, $m)) {
      $data = $m[2];
      $bin = base64_decode($data, true);
      if ($bin === false) json_error('Imagen inválida', 422);
      if (strlen($bin) > 200 * 1024) json_error('La imagen supera el límite de 200KB', 422);
    }
    $user = auth_user();

    if ($id > 0) {
      $st = $pdo->prepare('UPDATE reportes_resources SET title=?, description=?, url=?, icon_emoji=?, icon_image=?, updated_by=? WHERE id=?');
      $st->execute([$title, $description ?: null, $url, $iconEmoji ?: null, $iconImage ?: null, (int)($user['id'] ?? 0), $id]);
    } else {
      $st = $pdo->prepare('INSERT INTO reportes_resources (title, description, url, icon_emoji, icon_image, created_by, updated_by) VALUES (?,?,?,?,?,?,?)');
      $st->execute([$title, $description ?: null, $url, $iconEmoji ?: null, $iconImage ?: null, (int)($user['id'] ?? 0), (int)($user['id'] ?? 0)]);
      $id = (int)$pdo->lastInsertId();
    }
    $row = db_one($pdo, 'SELECT id, title, description, url, icon_emoji, icon_image FROM reportes_resources WHERE id=?', [$id]);
    json_ok(['resource' => $row]);
  });

  route('POST', '/api/reportes/resources/delete', function () use ($ensure_schema): void {
    ensure_guru();
    $pdo = db();
    $ensure_schema($pdo);
    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) json_error('ID requerido', 422);
    $st = $pdo->prepare('DELETE FROM reportes_resources WHERE id=?');
    $st->execute([$id]);
    json_ok(['ok' => true]);
  });

  route('POST', '/api/reportes/news/save', function () use ($ensure_schema): void {
    ensure_guru();
    $pdo = db();
    $ensure_schema($pdo);
    $in = read_json();
    $id = isset($in['id']) ? (int)$in['id'] : 0;
    $title = trim((string)($in['title'] ?? ''));
    $preview = trim((string)($in['preview'] ?? ''));
    $body = trim((string)($in['body'] ?? ''));
    $link = trim((string)($in['link'] ?? ''));
    $linkLabel = trim((string)($in['link_label'] ?? ''));
    $image = trim((string)($in['image'] ?? ''));

    if ($title === '') json_error('Título requerido', 422);
    if ($image !== '' && preg_match('/^data:(.*?);base64,(.*)$/', $image, $m)) {
      $data = $m[2];
      $bin = base64_decode($data, true);
      if ($bin === false) json_error('Imagen inválida', 422);
      if (strlen($bin) > 200 * 1024) json_error('La imagen supera el límite de 200KB', 422);
    }
    $user = auth_user();

    if ($id > 0) {
      $st = $pdo->prepare('UPDATE reportes_news SET title=?, preview=?, body=?, link=?, link_label=?, image=?, updated_by=? WHERE id=?');
      $st->execute([$title, $preview ?: null, $body ?: null, $link ?: null, $linkLabel ?: null, $image ?: null, (int)($user['id'] ?? 0), $id]);
    } else {
      $st = $pdo->prepare('INSERT INTO reportes_news (title, preview, body, link, link_label, image, created_by, updated_by) VALUES (?,?,?,?,?,?,?,?)');
      $st->execute([$title, $preview ?: null, $body ?: null, $link ?: null, $linkLabel ?: null, $image ?: null, (int)($user['id'] ?? 0), (int)($user['id'] ?? 0)]);
      $id = (int)$pdo->lastInsertId();
    }
    $row = db_one($pdo, 'SELECT id, title, preview, body, link, link_label, image FROM reportes_news WHERE id=?', [$id]);
    json_ok(['news' => $row]);
  });

  route('POST', '/api/reportes/news/delete', function () use ($ensure_schema): void {
    ensure_guru();
    $pdo = db();
    $ensure_schema($pdo);
    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) json_error('ID requerido', 422);
    $st = $pdo->prepare('DELETE FROM reportes_news WHERE id=?');
    $st->execute([$id]);
    json_ok(['ok' => true]);
  });

  route('POST', '/api/reportes', function (): void {
    $user = auth_user();
    $in = read_json();
    $type = strtolower(trim($in['type'] ?? 'otro'));
    $message = trim($in['message'] ?? '');
    $link = trim($in['link'] ?? '');
    $image = $in['image'] ?? null;

    $allowed = ['bug','solicitud','idea','otro'];
    if (!in_array($type, $allowed, true)) $type = 'otro';
    if ($message === '') json_error('Mensaje requerido', 422);

    $pdo = db();
    $userRow = db_one($pdo, 'SELECT name, last_name, username, email, personal_email FROM users WHERE id=?', [(int)($user['id'] ?? 0)]) ?? [];
    $fullName = trim(($userRow['name'] ?? $user['name'] ?? '') . ' ' . ($userRow['last_name'] ?? ''));
    $username = $userRow['username'] ?? '';
    $email = $userRow['email'] ?? ($userRow['personal_email'] ?? '');

    $to = getenv('REPORT_EMAIL') ?: 'fcortinez@avantek.com.ar';
    $subject = "SyPdN - REPORTE: $type";
    $body = "Usuario: $username\nNombre y apellido: $fullName\nEmail: $email\nTipo: $type\n";
    if ($link !== '') $body .= "Link: $link\n";
    $body .= "\n$message\n";

    $headers = "From: noreply@example.com\r\n";
    $sent = false;
    if ($image && preg_match('/^data:(.*?);base64,(.*)$/', $image, $m)) {
      $mime = $m[1];
      $data = $m[2];
      $boundary = md5((string)time());
      $headers .= "MIME-Version: 1.0\r\n";
      $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
      $bodyMail  = "--$boundary\r\n";
      $bodyMail .= "Content-Type: text/plain; charset=\"utf-8\"\r\n\r\n";
      $bodyMail .= $body."\r\n";
      $bodyMail .= "--$boundary\r\n";
      $bodyMail .= "Content-Type: $mime; name=\"imagen\"\r\n";
      $bodyMail .= "Content-Transfer-Encoding: base64\r\n";
      $bodyMail .= "Content-Disposition: attachment; filename=\"imagen\"\r\n\r\n";
      $bodyMail .= chunk_split($data)."\r\n";
      $bodyMail .= "--$boundary--";
      $sent = mail($to, $subject, $bodyMail, $headers);
    } else {
      $headers .= "Content-Type: text/plain; charset=\"utf-8\"";
      $sent = mail($to, $subject, $body, $headers);
    }
    if (!$sent) json_error('No se pudo enviar el correo', 500);
    json_ok(['ok'=>true]);
  });
}