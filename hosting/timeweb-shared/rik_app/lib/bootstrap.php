<?php
declare(strict_types=1);

/** @var array<string, string> */
$GLOBALS['RIK_CONFIG'] = [];
$GLOBALS['RIK_APP_ROOT'] = '';

function rik_bootstrap(string $appRoot): void
{
    $resolved = realpath($appRoot);
    if ($resolved === false || !is_dir($resolved)) {
        rik_json(['ok' => false, 'error' => 'Серверная конфигурация сайта не найдена'], 503);
    }

    $GLOBALS['RIK_APP_ROOT'] = $resolved;
    $GLOBALS['RIK_CONFIG'] = rik_load_env($resolved . DIRECTORY_SEPARATOR . 'config.env');

    $dataDir = rik_app_path('data');
    if (!is_dir($dataDir) && !mkdir($dataDir, 0770, true) && !is_dir($dataDir)) {
        rik_json(['ok' => false, 'error' => 'Хранилище API недоступно'], 503);
    }

    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    ini_set('default_charset', 'UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
}

/** @return array<string, string> */
function rik_load_env(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $values = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return [];
    }

    foreach ($lines as $line) {
        $line = trim(ltrim($line, "\xEF\xBB\xBF"));
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        if (!preg_match('/^[A-Z][A-Z0-9_]*$/', $key)) {
            continue;
        }
        $value = trim($value);
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }
        $values[$key] = $value;
    }
    return $values;
}

function rik_config(string $name, string $default = ''): string
{
    $value = $GLOBALS['RIK_CONFIG'][$name] ?? getenv($name);
    return is_string($value) && $value !== '' ? $value : $default;
}

function rik_config_int(string $name, int $default): int
{
    $value = rik_config($name, (string) $default);
    return preg_match('/^-?\d+$/', $value) ? (int) $value : $default;
}

function rik_config_float(string $name, float $default): float
{
    $value = rik_config($name, (string) $default);
    return is_numeric($value) ? (float) $value : $default;
}

function rik_config_bool(string $name, bool $default): bool
{
    $value = strtolower(trim(rik_config($name, $default ? 'true' : 'false')));
    if (in_array($value, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }
    if (in_array($value, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }
    return $default;
}

function rik_app_path(string $relative): string
{
    $relative = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($relative, '/\\'));
    return $GLOBALS['RIK_APP_ROOT'] . DIRECTORY_SEPARATOR . $relative;
}

function rik_api_route(): string
{
    $route = isset($_GET['route']) ? trim((string) $_GET['route'], '/') : '';
    if ($route !== '') {
        return $route;
    }

    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    $path = is_string($path) ? $path : '';
    return trim((string) preg_replace('#^/api/?#', '', $path), '/');
}

/** @param array<string, mixed> $payload */
function rik_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** @return array<string, mixed> */
function rik_read_json_body(): array
{
    $limit = rik_config_int('REQUEST_MAX_BODY_BYTES', 31457280);
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > $limit) {
        rik_json(['ok' => false, 'error' => 'Размер запроса превышает допустимый'], 413);
    }

    $raw = file_get_contents('php://input', false, null, 0, $limit + 1);
    if ($raw === false || strlen($raw) > $limit) {
        rik_json(['ok' => false, 'error' => 'Размер запроса превышает допустимый'], 413);
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        rik_json(['ok' => false, 'error' => 'Некорректный JSON'], 400);
    }
    return $decoded;
}

function rik_client_ip(): string
{
    $peer = trim((string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'));
    if (filter_var($peer, FILTER_VALIDATE_IP) === false) {
        return 'invalid';
    }

    $trusted = array_filter(array_map('trim', explode(',', rik_config('TRUSTED_PROXY_IPS', '127.0.0.1,::1'))));
    if (!in_array($peer, $trusted, true)) {
        return $peer;
    }

    $forwarded = array_reverse(array_map('trim', explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))));
    foreach ($forwarded as $candidate) {
        if (filter_var($candidate, FILTER_VALIDATE_IP) !== false && !in_array($candidate, $trusted, true)) {
            return $candidate;
        }
    }
    return $peer;
}

function rik_rate_limit(string $key, int $windowSeconds, int $maxRequests): bool
{
    $path = rik_app_path('data/rate-limits.json');
    $handle = fopen($path, 'c+');
    if ($handle === false) {
        return false;
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            return false;
        }
        rewind($handle);
        $raw = stream_get_contents($handle);
        $buckets = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        if (!is_array($buckets)) {
            $buckets = [];
        }

        $now = time();
        foreach ($buckets as $bucketKey => $bucket) {
            if (!is_array($bucket) || (int) ($bucket['reset_at'] ?? 0) <= $now) {
                unset($buckets[$bucketKey]);
            }
        }

        $bucket = $buckets[$key] ?? ['count' => 0, 'reset_at' => $now + $windowSeconds];
        if ((int) ($bucket['reset_at'] ?? 0) <= $now) {
            $bucket = ['count' => 0, 'reset_at' => $now + $windowSeconds];
        }
        $bucket['count'] = (int) ($bucket['count'] ?? 0) + 1;
        $buckets[$key] = $bucket;

        $maxBuckets = max(100, rik_config_int('RATE_LIMIT_MAX_BUCKETS', 10000));
        if (count($buckets) > $maxBuckets) {
            uasort($buckets, static fn(array $a, array $b): int => ((int) $a['reset_at']) <=> ((int) $b['reset_at']));
            $buckets = array_slice($buckets, -$maxBuckets, null, true);
        }

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($buckets, JSON_UNESCAPED_SLASHES));
        fflush($handle);
        return (int) $bucket['count'] <= $maxRequests;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

/**
 * @param array<string, string> $headers
 * @param array<string, mixed> $payload
 * @return array{status:int, body:array<string, mixed>|list<mixed>}
 */
function rik_http_json(string $url, array $headers, array $payload, int $timeout): array
{
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($body)) {
        throw new RuntimeException('JSON encoding failed');
    }

    $headerLines = [];
    foreach ($headers as $name => $value) {
        $headerLines[] = $name . ': ' . $value;
    }

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        if ($curl === false) {
            throw new RuntimeException('HTTP client initialization failed');
        }
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CONNECTTIMEOUT => min(10, $timeout),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        $responseBody = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($responseBody)) {
            throw new RuntimeException($error !== '' ? $error : 'HTTP request failed');
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headerLines),
                'content' => $body,
                'timeout' => $timeout,
                'ignore_errors' => true,
            ],
        ]);
        $responseBody = file_get_contents($url, false, $context);
        if (!is_string($responseBody)) {
            throw new RuntimeException('HTTP request failed');
        }
        $status = 0;
        foreach ($http_response_header ?? [] as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $match)) {
                $status = (int) $match[1];
            }
        }
    }

    $decoded = json_decode($responseBody, true);
    return ['status' => $status, 'body' => is_array($decoded) ? $decoded : []];
}

function rik_safe_header(string $value, int $limit = 200): string
{
    $value = preg_replace('/[\r\n]+/', ' ', $value) ?? '';
    $value = preg_replace('/\s+/u', ' ', trim($value)) ?? '';
    return rik_text_substr($value, 0, $limit);
}

function rik_text_length(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    $count = preg_match_all('/./us', $value, $unused);
    return is_int($count) && $count >= 0 ? $count : strlen($value);
}

function rik_text_substr(string $value, int $offset, ?int $length = null): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, $offset, $length, 'UTF-8');
    }
    $characters = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
    if (!is_array($characters)) {
        return $length === null ? substr($value, $offset) : substr($value, $offset, $length);
    }
    return implode('', array_slice($characters, $offset, $length));
}

function rik_text_lower(string $value): string
{
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($value, 'UTF-8');
    }
    $upper = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
    $lower = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    $upperChars = preg_split('//u', $upper, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $lowerChars = preg_split('//u', $lower, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    return strtolower(strtr($value, array_combine($upperChars, $lowerChars) ?: []));
}

function rik_text_contains_case_insensitive(string $haystack, string $needle): bool
{
    if (function_exists('mb_stripos')) {
        return mb_stripos($haystack, $needle, 0, 'UTF-8') !== false;
    }
    return str_contains(rik_text_lower($haystack), rik_text_lower($needle));
}
