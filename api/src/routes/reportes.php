<?php
function register_report_routes(): void {
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

    $to = getenv('REPORT_EMAIL') ?: 'admin@example.com';
    $subject = "[Reporte] $type de {$user['name']}";
    $body = "Usuario: {$user['name']} (ID {$user['id']})\nTipo: $type\n";
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