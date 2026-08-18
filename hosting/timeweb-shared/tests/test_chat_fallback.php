<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/rik_app/lib/bootstrap.php';
require_once dirname(__DIR__) . '/rik_app/lib/chat.php';

$legacy = 'Сейчас я немного перегружен. Попробуйте написать чуть позже.';
$expected = 'Чат-ассистент временно недоступен: внешний ИИ-провайдер отклонил запрос с сервера сайта. Попробуйте позже или отправьте заявку через «Запросить расчёт».';

$GLOBALS['RIK_CONFIG'] = ['CHAT_FALLBACK_MESSAGE' => $legacy];
if (rik_chat_provider_fallback() !== $expected) {
    fwrite(STDERR, "Legacy chat fallback was not replaced.\n");
    exit(1);
}

$GLOBALS['RIK_CONFIG'] = ['CHAT_FALLBACK_MESSAGE' => 'Пользовательское сообщение'];
if (rik_chat_provider_fallback() !== 'Пользовательское сообщение') {
    fwrite(STDERR, "Custom chat fallback was not preserved.\n");
    exit(1);
}

echo "Timeweb chat fallback guard PASS.\n";
