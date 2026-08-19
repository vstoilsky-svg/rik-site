<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/rik_app/lib/bootstrap.php';
require_once dirname(__DIR__) . '/rik_app/lib/local_relay.php';
require_once dirname(__DIR__) . '/rik_app/lib/chat.php';

$temporaryRoot = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'rik-chat-relay-' . bin2hex(random_bytes(8));
if (!mkdir($temporaryRoot, 0770, true) && !is_dir($temporaryRoot)) {
    fwrite(STDERR, "Cannot create relay test root.\n");
    exit(1);
}

try {
    $GLOBALS['RIK_APP_ROOT'] = $temporaryRoot;
    $GLOBALS['RIK_CONFIG'] = [
        'LOCAL_RELAY_ENABLED' => 'true',
        'LOCAL_RELAY_TOKEN' => 'test-token-not-a-secret',
    ];

    $root = rik_local_relay_root();
    if ($root === '' || !is_dir($root . '/pending') || !is_dir($root . '/processing')) {
        throw new RuntimeException('Relay directories were not created.');
    }

    $jobId = str_repeat('a', 32);
    if (!rik_local_relay_valid_job_id($jobId) || rik_local_relay_valid_job_id('../escape')) {
        throw new RuntimeException('Relay jobId validation failed.');
    }
    $pending = rik_local_relay_path($root, 'pending', $jobId);
    $processing = rik_local_relay_path($root, 'processing', $jobId);
    $completed = rik_local_relay_path($root, 'completed', $jobId);
    $job = [
        'jobId' => $jobId,
        'createdAt' => time(),
        'expiresAt' => time() + 60,
        'messages' => [['role' => 'user', 'content' => 'Проверка']],
    ];
    if (!rik_local_relay_write_json($pending, $job) || !rename($pending, $processing)) {
        throw new RuntimeException('Atomic relay claim failed.');
    }
    $job['claimedAt'] = time();
    if (!rik_local_relay_write_json($processing, $job)) {
        throw new RuntimeException('Processing state write failed.');
    }
    if (!rik_local_relay_write_json($completed, [
        'ok' => true,
        'jobId' => $jobId,
        'answer' => 'Тестовый ответ модели',
        'model' => 'Qwen2.5-3B-Instruct-Q4_K_M',
    ])) {
        throw new RuntimeException('Completion write failed.');
    }
    $result = rik_local_relay_read_json($completed);
    if (($result['ok'] ?? false) !== true || ($result['model'] ?? '') === 'local:knowledge') {
        throw new RuntimeException('Completion result validation failed.');
    }

    $relaySource = (string) file_get_contents(dirname(__DIR__) . '/rik_app/lib/local_relay.php');
    if (!str_contains($relaySource, 'hash_equals($expected, $provided)')) {
        throw new RuntimeException('Constant-time worker auth guard is missing.');
    }
    $apiSource = (string) file_get_contents(dirname(__DIR__) . '/public_html/api/index.php');
    foreach (['chat-worker/health', 'chat-worker/claim', 'chat-worker/complete'] as $route) {
        if (!str_contains($apiSource, $route)) {
            throw new RuntimeException("Worker route is missing: {$route}");
        }
    }
    $exampleConfig = (string) file_get_contents(dirname(__DIR__) . '/rik_app/config.env.example');
    if (!str_contains($exampleConfig, "LOCAL_RELAY_ENABLED=true\n")) {
        throw new RuntimeException('Production relay default is not enabled.');
    }
    $buildSource = (string) file_get_contents(dirname(__DIR__) . '/build.ps1');
    if (!str_contains($buildSource, "'LOCAL_RELAY_TOKEN'") || !str_contains($buildSource, 'refusing a chatbot-degrading release')) {
        throw new RuntimeException('Release build does not fail closed without the relay token.');
    }
    $bootstrapSource = (string) file_get_contents(dirname(__DIR__) . '/worker/rik_chat_worker_bootstrap.pyw');
    if (!str_contains($bootstrapSource, 'pythonw.exe') || !str_contains($bootstrapSource, 'MUTEX_NAME')) {
        throw new RuntimeException('Console-free worker bootstrap guard is missing.');
    }
    $workerSource = (string) file_get_contents(dirname(__DIR__) . '/worker/rik_chat_worker.py');
    if (!str_contains($workerSource, 'RIK_CHAT_MODEL_TIMEOUT_SECONDS') || !str_contains($workerSource, 'timeout=self.model_timeout_seconds')) {
        throw new RuntimeException('Bounded per-model timeout guard is missing.');
    }
} finally {
    $iterator = is_dir($temporaryRoot)
        ? new RecursiveIteratorIterator(new RecursiveDirectoryIterator($temporaryRoot, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST)
        : null;
    if ($iterator !== null) {
        foreach ($iterator as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($temporaryRoot);
    }
}

echo "Timeweb local relay guard PASS.\n";
