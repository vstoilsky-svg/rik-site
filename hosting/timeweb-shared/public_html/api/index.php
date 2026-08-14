<?php
declare(strict_types=1);

$appRoot = getenv('RIK_APP_ROOT');
if (!is_string($appRoot) || $appRoot === '') {
    $appRoot = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'rik_app';
}

require $appRoot . DIRECTORY_SEPARATOR . 'lib' . DIRECTORY_SEPARATOR . 'bootstrap.php';
require $appRoot . DIRECTORY_SEPARATOR . 'lib' . DIRECTORY_SEPARATOR . 'chat.php';
require $appRoot . DIRECTORY_SEPARATOR . 'lib' . DIRECTORY_SEPARATOR . 'request.php';

rik_bootstrap($appRoot);

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$route = rik_api_route();

if ($method === 'GET' && $route === 'health') {
    rik_json(['status' => 'ok', 'runtime' => 'timeweb-shared-php']);
}

if ($method === 'POST' && $route === 'chat') {
    rik_handle_chat(false);
}

if ($method === 'POST' && $route === 'chat/stream') {
    rik_handle_chat(true);
}

if ($method === 'POST' && $route === 'request') {
    rik_handle_request();
}

rik_json(['ok' => false, 'error' => 'Маршрут не найден'], 404);
