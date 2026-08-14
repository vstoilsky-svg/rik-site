<?php
declare(strict_types=1);

function rik_handle_request(): never
{
    if (!rik_rate_limit('request:' . rik_client_ip(), rik_config_int('REQUEST_RATE_LIMIT_WINDOW_SECONDS', 600), rik_config_int('REQUEST_RATE_LIMIT_MAX_REQUESTS', 5))) {
        rik_json(['ok' => false, 'error' => 'Слишком много заявок. Попробуйте позже.'], 429);
    }

    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > rik_config_int('REQUEST_MAX_BODY_BYTES', 31457280)) {
        rik_json(['ok' => false, 'error' => 'Размер запроса превышает допустимый'], 413);
    }

    $fields = [];
    foreach ($_POST as $key => $value) {
        if (!is_scalar($value)) {
            continue;
        }
        $text = trim((string) $value);
        if (rik_text_length($text) > rik_config_int('REQUEST_MAX_FIELD_CHARS', 5000)) {
            rik_json(['ok' => false, 'error' => 'Слишком длинное значение поля'], 422);
        }
        $fields[(string) $key] = $text;
    }

    if (($fields['website'] ?? '') !== '') {
        rik_json(['ok' => true]);
    }
    if (($fields['name'] ?? '') === '' || ($fields['phone'] ?? '') === '' || filter_var($fields['email'] ?? '', FILTER_VALIDATE_EMAIL) === false) {
        rik_json(['ok' => false, 'error' => 'Заполните имя, телефон и корректный e-mail'], 422);
    }
    if (!in_array(rik_text_lower($fields['consent'] ?? ''), ['on', 'true', '1', 'yes'], true)) {
        rik_json(['ok' => false, 'error' => 'Требуется согласие на обработку данных'], 422);
    }

    try {
        $attachments = rik_request_attachments();
    } catch (LengthException $error) {
        rik_json(['ok' => false, 'error' => $error->getMessage()], 413);
    } catch (UnexpectedValueException $error) {
        rik_json(['ok' => false, 'error' => $error->getMessage()], 415);
    } catch (RuntimeException $error) {
        rik_json(['ok' => false, 'error' => $error->getMessage()], 400);
    }

    try {
        rik_send_request_mail($fields, $attachments);
    } catch (RikMailConfigurationException $error) {
        error_log('RIK request mail configuration error');
        rik_json(['ok' => false, 'error' => 'Сервис отправки заявок не настроен'], 503);
    } catch (RikSmtpException $error) {
        error_log('RIK request SMTP error: ' . $error->getMessage());
        rik_json(['ok' => false, 'error' => 'Не удалось отправить заявку'], 502);
    }
    rik_json(['ok' => true, 'recipient' => rik_config('REQUEST_RECIPIENT', 'zakaz@rik-vent.ru')]);
}

/** @return list<array{name:string,type:string,content:string}> */
function rik_request_attachments(): array
{
    $files = [];
    foreach ($_FILES as $upload) {
        if (!is_array($upload) || !isset($upload['name'], $upload['tmp_name'], $upload['error'], $upload['size'])) {
            continue;
        }
        $names = is_array($upload['name']) ? $upload['name'] : [$upload['name']];
        $tmpNames = is_array($upload['tmp_name']) ? $upload['tmp_name'] : [$upload['tmp_name']];
        $errors = is_array($upload['error']) ? $upload['error'] : [$upload['error']];
        $sizes = is_array($upload['size']) ? $upload['size'] : [$upload['size']];
        foreach ($names as $index => $name) {
            $error = (int) ($errors[$index] ?? UPLOAD_ERR_NO_FILE);
            if ($error === UPLOAD_ERR_NO_FILE || trim((string) $name) === '') {
                continue;
            }
            if ($error !== UPLOAD_ERR_OK) {
                throw new RuntimeException('Ошибка загрузки файла');
            }
            $files[] = ['name' => (string) $name, 'tmp_name' => (string) ($tmpNames[$index] ?? ''), 'size' => (int) ($sizes[$index] ?? 0)];
        }
    }

    if (count($files) > rik_config_int('REQUEST_MAX_FILES', 10)) {
        throw new LengthException('Слишком много файлов');
    }

    $attachments = [];
    $total = 0;
    foreach ($files as $file) {
        $size = $file['size'];
        $total += $size;
        if ($size <= 0 || $size > rik_config_int('REQUEST_MAX_FILE_BYTES', 15728640) || $total > rik_config_int('REQUEST_MAX_TOTAL_BYTES', 26214400)) {
            throw new LengthException('Размер файлов превышает допустимый');
        }
        if (!is_uploaded_file($file['tmp_name']) && PHP_SAPI !== 'cli-server') {
            throw new RuntimeException('Некорректный загруженный файл');
        }
        $content = file_get_contents($file['tmp_name']);
        if (!is_string($content) || strlen($content) !== $size) {
            throw new RuntimeException('Не удалось прочитать загруженный файл');
        }
        $name = rik_normalized_filename($file['name']);
        $type = rik_validate_attachment($name, $content);
        $attachments[] = ['name' => $name, 'type' => $type, 'content' => $content];
    }
    return $attachments;
}

function rik_normalized_filename(string $value): string
{
    $value = str_replace('\\', '/', $value);
    return rik_safe_header(basename($value), 180) ?: 'attachment';
}

function rik_validate_attachment(string $filename, string $content): string
{
    $extension = rik_text_lower((string) pathinfo($filename, PATHINFO_EXTENSION));
    $types = [
        'pdf' => 'application/pdf', 'xls' => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'doc' => 'application/msword', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'dwg' => 'image/vnd.dwg', 'dxf' => 'image/vnd.dxf', 'rvt' => 'application/octet-stream',
        'ifc' => 'application/x-step', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'zip' => 'application/zip', 'rar' => 'application/vnd.rar', '7z' => 'application/x-7z-compressed',
    ];
    if (!isset($types[$extension])) {
        throw new UnexpectedValueException('Недопустимый тип файла: ' . ($extension ?: 'без расширения'));
    }

    $signatures = [
        'pdf' => ["%PDF-"], 'png' => ["\x89PNG\r\n\x1a\n"], 'jpg' => ["\xff\xd8\xff"], 'jpeg' => ["\xff\xd8\xff"],
        'zip' => ["PK\x03\x04", "PK\x05\x06", "PK\x07\x08"], 'docx' => ["PK\x03\x04"], 'xlsx' => ["PK\x03\x04"],
        'rar' => ["Rar!\x1a\x07"], '7z' => ["7z\xbc\xaf\x27\x1c"],
        'doc' => ["\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"], 'xls' => ["\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
        'rvt' => ["\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"], 'dwg' => ['AC10'],
    ];
    $matches = false;
    if (isset($signatures[$extension])) {
        foreach ($signatures[$extension] as $signature) {
            if (str_starts_with($content, $signature)) {
                $matches = true;
                break;
            }
        }
    } else {
        $normalized = strtoupper(ltrim(substr($content, 0, 4096)));
        $matches = $extension === 'dxf'
            ? str_starts_with($normalized, '0') && str_contains($normalized, 'SECTION')
            : ($extension === 'ifc' && str_starts_with($normalized, 'ISO-10303-21'));
    }
    if (!$matches) {
        throw new UnexpectedValueException('Содержимое файла не соответствует расширению: .' . $extension);
    }
    return $types[$extension];
}

final class RikMailConfigurationException extends RuntimeException
{
}

final class RikSmtpException extends RuntimeException
{
}

/** @param array<string,string> $fields @param list<array{name:string,type:string,content:string}> $attachments */
function rik_send_request_mail(array $fields, array $attachments): void
{
    $recipient = rik_config('REQUEST_RECIPIENT', 'zakaz@rik-vent.ru');
    $from = rik_config('SMTP_FROM', rik_config('SMTP_USERNAME'));
    if (filter_var($recipient, FILTER_VALIDATE_EMAIL) === false || filter_var($from, FILTER_VALIDATE_EMAIL) === false) {
        throw new RikMailConfigurationException('SMTP sender or recipient is invalid');
    }

    $kind = ($fields['form_kind'] ?? '') === 'send-project' ? 'Проект с сайта РИК' : 'Запрос расчёта с сайта РИК';
    $subject = $kind . ': ' . rik_safe_header($fields['name'] ?? 'Без имени');
    $labels = [
        'Форма' => ($fields['form_kind'] ?? '') === 'send-project' ? 'Отправить проект' : 'Запросить расчёт',
        'Имя' => $fields['name'] ?? '', 'Компания' => $fields['company'] ?? '', 'Телефон' => $fields['phone'] ?? '',
        'E-mail' => $fields['email'] ?? '', 'Комментарий' => $fields['comment'] ?? '',
    ];
    $plain = '';
    foreach ($labels as $label => $value) {
        $plain .= $label . ': ' . (trim($value) !== '' ? trim($value) : '—') . "\r\n";
    }

    $mode = strtolower(rik_config('REQUEST_MAIL_MODE', 'smtp'));
    if ($mode === 'log') {
        $log = rik_config('REQUEST_MAIL_LOG', rik_app_path('data/request-mail.log'));
        $entry = ['time' => gmdate('c'), 'recipient' => $recipient, 'subject' => $subject, 'fields' => $labels, 'attachments' => array_map(static fn(array $item): array => ['name' => $item['name'], 'type' => $item['type'], 'size' => strlen($item['content'])], $attachments)];
        if (file_put_contents($log, json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX) === false) {
            throw new RikSmtpException('mail log write failed');
        }
        return;
    }
    if ($mode !== 'smtp') {
        throw new RikMailConfigurationException('unsupported mail mode');
    }

    $boundary = 'rik-' . bin2hex(random_bytes(16));
    $body = '--' . $boundary . "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n" . $plain . "\r\n";
    foreach ($attachments as $attachment) {
        $encodedName = rawurlencode($attachment['name']);
        $body .= '--' . $boundary . "\r\nContent-Type: " . $attachment['type'] . "; name*=UTF-8''" . $encodedName . "\r\n";
        $body .= "Content-Disposition: attachment; filename*=UTF-8''" . $encodedName . "\r\nContent-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($attachment['content'])) . "\r\n";
    }
    $body .= '--' . $boundary . "--\r\n";

    $headers = [
        'Date: ' . date(DATE_RFC2822),
        'Message-ID: <' . bin2hex(random_bytes(16)) . '@rik-vent.ru>',
        'Subject: ' . rik_encode_mime_header($subject),
        'From: ' . $from,
        'To: ' . $recipient,
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
        'Reply-To: ' . rik_safe_header($fields['email'] ?? ''),
        'X-Mailer: RIK-Timeweb-PHP',
    ];
    rik_smtp_send($from, $recipient, implode("\r\n", $headers) . "\r\n\r\n" . $body);
}

function rik_encode_mime_header(string $value): string
{
    if (function_exists('mb_encode_mimeheader')) {
        return mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
    }
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function rik_smtp_send(string $from, string $recipient, string $message): void
{
    $host = trim(rik_config('SMTP_HOST'));
    $port = rik_config_int('SMTP_PORT', 587);
    $username = rik_config('SMTP_USERNAME');
    $password = rik_config('SMTP_PASSWORD');
    $useTls = rik_config_bool('SMTP_USE_TLS', true);
    $useSsl = rik_config_bool('SMTP_USE_SSL', false);
    $timeout = max(5, min(60, rik_config_int('SMTP_TIMEOUT_SECONDS', 30)));

    if ($host === '' || $port < 1 || $port > 65535) {
        throw new RikMailConfigurationException('SMTP host or port is missing');
    }
    if ($username !== '' && $password === '') {
        throw new RikMailConfigurationException('SMTP password is missing');
    }
    if ($useSsl && $useTls) {
        throw new RikMailConfigurationException('SMTP SSL and STARTTLS cannot both be enabled');
    }

    $sslOptions = [
        'verify_peer' => true,
        'verify_peer_name' => true,
        'allow_self_signed' => false,
        'peer_name' => $host,
        'SNI_enabled' => true,
    ];
    $caFile = trim(rik_config('SMTP_CA_FILE'));
    if ($caFile !== '') {
        if (!is_file($caFile)) {
            throw new RikMailConfigurationException('SMTP CA file is missing');
        }
        $sslOptions['cafile'] = $caFile;
    }
    $context = stream_context_create(['ssl' => $sslOptions]);
    $target = ($useSsl ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $errorNumber = 0;
    $errorText = '';
    $socket = @stream_socket_client($target, $errorNumber, $errorText, $timeout, STREAM_CLIENT_CONNECT, $context);
    if (!is_resource($socket)) {
        throw new RikSmtpException('connect failed (' . $errorNumber . ')');
    }

    stream_set_timeout($socket, $timeout);
    try {
        rik_smtp_expect($socket, [220], 'greeting');
        $serverName = preg_replace('/[^a-z0-9.-]/i', '', (string) ($_SERVER['SERVER_NAME'] ?? 'rik-vent.ru')) ?: 'rik-vent.ru';
        rik_smtp_command($socket, 'EHLO ' . $serverName, [250], 'ehlo');

        if ($useTls) {
            rik_smtp_command($socket, 'STARTTLS', [220], 'starttls');
            if (@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) {
                throw new RikSmtpException('starttls negotiation failed');
            }
            rik_smtp_command($socket, 'EHLO ' . $serverName, [250], 'ehlo after starttls');
        }

        if ($username !== '') {
            rik_smtp_command($socket, 'AUTH LOGIN', [334], 'auth login');
            rik_smtp_command($socket, base64_encode($username), [334], 'auth username');
            rik_smtp_command($socket, base64_encode($password), [235], 'auth password');
        }

        rik_smtp_command($socket, 'MAIL FROM:<' . $from . '>', [250], 'mail from');
        rik_smtp_command($socket, 'RCPT TO:<' . $recipient . '>', [250, 251], 'recipient');
        rik_smtp_command($socket, 'DATA', [354], 'data');

        $normalized = preg_replace("/\r?\n/", "\r\n", $message) ?? $message;
        $normalized = preg_replace('/(?m)^\./', '..', $normalized) ?? $normalized;
        rik_smtp_write($socket, rtrim($normalized, "\r\n") . "\r\n.\r\n", 'message');
        rik_smtp_expect($socket, [250], 'message accepted');

        rik_smtp_write($socket, "QUIT\r\n", 'quit');
        try {
            rik_smtp_expect($socket, [221], 'quit');
        } catch (RikSmtpException $ignored) {
            // The message was already accepted; a server may close before replying to QUIT.
        }
    } finally {
        fclose($socket);
    }
}

/** @param resource $socket @param list<int> $expected */
function rik_smtp_command($socket, string $command, array $expected, string $stage): void
{
    rik_smtp_write($socket, $command . "\r\n", $stage);
    rik_smtp_expect($socket, $expected, $stage);
}

/** @param resource $socket */
function rik_smtp_write($socket, string $data, string $stage): void
{
    $length = strlen($data);
    $written = 0;
    while ($written < $length) {
        $count = @fwrite($socket, substr($data, $written));
        if (!is_int($count) || $count <= 0) {
            throw new RikSmtpException($stage . ' write failed');
        }
        $written += $count;
    }
}

/** @param resource $socket @param list<int> $expected */
function rik_smtp_expect($socket, array $expected, string $stage): void
{
    $code = 0;
    $lines = 0;
    do {
        $line = @fgets($socket, 8192);
        if (!is_string($line)) {
            $meta = stream_get_meta_data($socket);
            throw new RikSmtpException($stage . (!empty($meta['timed_out']) ? ' timed out' : ' read failed'));
        }
        $lines++;
        if ($lines > 100 || strlen($line) < 3 || !ctype_digit(substr($line, 0, 3))) {
            throw new RikSmtpException($stage . ' invalid response');
        }
        $code = (int) substr($line, 0, 3);
        $more = strlen($line) > 3 && $line[3] === '-';
    } while ($more);

    if (!in_array($code, $expected, true)) {
        throw new RikSmtpException($stage . ' failed with status ' . $code);
    }
}
