<?php
declare(strict_types=1);

/** @return array{0:bool,1:string,2:?string} */
function rik_local_relay_complete(array $messages): array
{
    if (!rik_config_bool('LOCAL_RELAY_ENABLED', false) || rik_config('LOCAL_RELAY_TOKEN') === '') {
        return [false, rik_chat_provider_fallback(), null];
    }

    $root = rik_local_relay_root();
    if ($root === '') {
        return [false, rik_chat_provider_fallback(), null];
    }
    rik_local_relay_cleanup($root);

    $maxQueued = max(1, rik_config_int('LOCAL_RELAY_MAX_QUEUED_JOBS', 50));
    $queued = count(glob($root . DIRECTORY_SEPARATOR . 'pending' . DIRECTORY_SEPARATOR . '*.json') ?: [])
        + count(glob($root . DIRECTORY_SEPARATOR . 'processing' . DIRECTORY_SEPARATOR . '*.json') ?: []);
    if ($queued >= $maxQueued) {
        error_log('RIK local relay queue is full');
        return [false, rik_chat_provider_fallback(), null];
    }

    $jobId = bin2hex(random_bytes(16));
    $waitSeconds = max(5, min(90, rik_config_int('LOCAL_RELAY_WAIT_SECONDS', 45)));
    $createdAt = time();
    $job = [
        'jobId' => $jobId,
        'createdAt' => $createdAt,
        'expiresAt' => $createdAt + $waitSeconds + 30,
        'messages' => $messages,
    ];
    $pendingPath = rik_local_relay_path($root, 'pending', $jobId);
    if (!rik_local_relay_write_json($pendingPath, $job)) {
        error_log('RIK local relay could not enqueue job');
        return [false, rik_chat_provider_fallback(), null];
    }

    $completedPath = rik_local_relay_path($root, 'completed', $jobId);
    $failedPath = rik_local_relay_path($root, 'failed', $jobId);
    $deadline = microtime(true) + $waitSeconds;
    $pollMicroseconds = max(50000, min(1000000, rik_config_int('LOCAL_RELAY_POLL_MILLISECONDS', 200) * 1000));

    while (microtime(true) < $deadline) {
        clearstatcache(true, $completedPath);
        if (is_file($completedPath)) {
            $result = rik_local_relay_read_json($completedPath);
            @unlink($completedPath);
            $answer = trim((string) ($result['answer'] ?? ''));
            $model = trim((string) ($result['model'] ?? ''));
            if (($result['ok'] ?? false) === true && $answer !== '' && $model !== '' && $model !== 'local:knowledge') {
                return [true, $answer, 'local-relay:' . rik_safe_header($model, 120)];
            }
            return [false, rik_chat_provider_fallback(), null];
        }

        clearstatcache(true, $failedPath);
        if (is_file($failedPath)) {
            @unlink($failedPath);
            return [false, rik_chat_provider_fallback(), null];
        }
        usleep($pollMicroseconds);
    }

    @unlink($pendingPath);
    error_log('RIK local relay timed out for job ' . $jobId);
    return [false, rik_chat_provider_fallback(), null];
}

function rik_handle_local_relay_claim(): never
{
    rik_local_relay_require_auth();
    $root = rik_local_relay_root();
    if ($root === '') {
        rik_json(['ok' => false, 'error' => 'Очередь модели недоступна'], 503);
    }
    rik_local_relay_cleanup($root);

    $paths = glob($root . DIRECTORY_SEPARATOR . 'pending' . DIRECTORY_SEPARATOR . '*.json') ?: [];
    sort($paths, SORT_STRING);
    foreach ($paths as $pendingPath) {
        $jobId = pathinfo($pendingPath, PATHINFO_FILENAME);
        if (!rik_local_relay_valid_job_id($jobId)) {
            @unlink($pendingPath);
            continue;
        }
        $processingPath = rik_local_relay_path($root, 'processing', $jobId);
        if (!@rename($pendingPath, $processingPath)) {
            continue;
        }
        $job = rik_local_relay_read_json($processingPath);
        if (($job['jobId'] ?? '') !== $jobId || !is_array($job['messages'] ?? null)) {
            @unlink($processingPath);
            continue;
        }
        $job['claimedAt'] = time();
        rik_local_relay_write_json($processingPath, $job);
        rik_json(['ok' => true, 'job' => $job]);
    }

    http_response_code(204);
    header('Cache-Control: no-store');
    exit;
}

function rik_handle_local_relay_complete(): never
{
    rik_local_relay_require_auth();
    $root = rik_local_relay_root();
    if ($root === '') {
        rik_json(['ok' => false, 'error' => 'Очередь модели недоступна'], 503);
    }
    $payload = rik_read_json_body();
    $jobId = trim((string) ($payload['jobId'] ?? ''));
    if (!rik_local_relay_valid_job_id($jobId)) {
        rik_json(['ok' => false, 'error' => 'Некорректный jobId'], 400);
    }

    $processingPath = rik_local_relay_path($root, 'processing', $jobId);
    if (!is_file($processingPath)) {
        rik_json(['ok' => false, 'error' => 'Задание не найдено или уже завершено'], 409);
    }

    $ok = ($payload['ok'] ?? false) === true;
    $answer = rik_text_substr(trim((string) ($payload['answer'] ?? '')), 0, 12000);
    $model = rik_safe_header(trim((string) ($payload['model'] ?? '')), 120);
    if ($ok && ($answer === '' || $model === '' || $model === 'local:knowledge')) {
        rik_json(['ok' => false, 'error' => 'Неполный ответ модели'], 422);
    }

    $bucket = $ok ? 'completed' : 'failed';
    $result = [
        'ok' => $ok,
        'jobId' => $jobId,
        'answer' => $ok ? $answer : '',
        'model' => $ok ? $model : '',
        'completedAt' => time(),
    ];
    if (!rik_local_relay_write_json(rik_local_relay_path($root, $bucket, $jobId), $result)) {
        rik_json(['ok' => false, 'error' => 'Не удалось сохранить результат'], 503);
    }
    @unlink($processingPath);
    rik_json(['ok' => true]);
}

function rik_handle_local_relay_health(): never
{
    rik_local_relay_require_auth();
    $root = rik_local_relay_root();
    if ($root === '') {
        rik_json(['ok' => false, 'error' => 'Очередь модели недоступна'], 503);
    }
    rik_local_relay_cleanup($root);
    $counts = [];
    foreach (['pending', 'processing', 'completed', 'failed'] as $bucket) {
        $counts[$bucket] = count(glob($root . DIRECTORY_SEPARATOR . $bucket . DIRECTORY_SEPARATOR . '*.json') ?: []);
    }
    rik_json(['ok' => true, 'relayEnabled' => rik_config_bool('LOCAL_RELAY_ENABLED', false), 'queue' => $counts]);
}

function rik_local_relay_require_auth(): void
{
    $expected = rik_config('LOCAL_RELAY_TOKEN');
    $provided = trim((string) ($_SERVER['HTTP_X_RIK_WORKER_TOKEN'] ?? ''));
    if ($expected === '') {
        rik_json(['ok' => false, 'error' => 'Worker relay не настроен'], 503);
    }
    if ($provided === '' || !hash_equals($expected, $provided)) {
        rik_json(['ok' => false, 'error' => 'Доступ запрещён'], 401);
    }
}

function rik_local_relay_root(): string
{
    $root = rik_app_path('data/chat-relay');
    foreach (['pending', 'processing', 'completed', 'failed'] as $bucket) {
        $path = $root . DIRECTORY_SEPARATOR . $bucket;
        if (!is_dir($path) && !mkdir($path, 0770, true) && !is_dir($path)) {
            return '';
        }
    }
    return $root;
}

function rik_local_relay_valid_job_id(string $jobId): bool
{
    return preg_match('/^[a-f0-9]{32}$/', $jobId) === 1;
}

function rik_local_relay_path(string $root, string $bucket, string $jobId): string
{
    return $root . DIRECTORY_SEPARATOR . $bucket . DIRECTORY_SEPARATOR . $jobId . '.json';
}

/** @param array<string,mixed> $value */
function rik_local_relay_write_json(string $path, array $value): bool
{
    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    if (!is_string($encoded)) {
        return false;
    }
    $temporary = $path . '.tmp-' . bin2hex(random_bytes(6));
    if (file_put_contents($temporary, $encoded, LOCK_EX) === false) {
        return false;
    }
    if (!@rename($temporary, $path)) {
        @unlink($temporary);
        return false;
    }
    return true;
}

/** @return array<string,mixed> */
function rik_local_relay_read_json(string $path): array
{
    $raw = @file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function rik_local_relay_cleanup(string $root): void
{
    $now = time();
    $claimTimeout = max(60, rik_config_int('LOCAL_RELAY_CLAIM_TIMEOUT_SECONDS', 180));
    foreach (glob($root . DIRECTORY_SEPARATOR . 'processing' . DIRECTORY_SEPARATOR . '*.json') ?: [] as $path) {
        $job = rik_local_relay_read_json($path);
        $claimedAt = (int) ($job['claimedAt'] ?? @filemtime($path) ?: 0);
        if ($claimedAt > 0 && $claimedAt + $claimTimeout < $now) {
            $jobId = pathinfo($path, PATHINFO_FILENAME);
            if ((int) ($job['expiresAt'] ?? 0) > $now && rik_local_relay_valid_job_id($jobId)) {
                @rename($path, rik_local_relay_path($root, 'pending', $jobId));
            } else {
                @unlink($path);
            }
        }
    }
    $retention = max(300, rik_config_int('LOCAL_RELAY_RESULT_RETENTION_SECONDS', 900));
    foreach (['pending', 'completed', 'failed'] as $bucket) {
        foreach (glob($root . DIRECTORY_SEPARATOR . $bucket . DIRECTORY_SEPARATOR . '*.json') ?: [] as $path) {
            $mtime = @filemtime($path);
            if (is_int($mtime) && $mtime + $retention < $now) {
                @unlink($path);
            }
        }
    }
}
