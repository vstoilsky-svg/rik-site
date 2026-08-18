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

$cases = [
    'Что производит РИК?' => '/products',
    'Какие есть вентиляторы?' => '/downloads/oprosny-list-ventilyator.xlsx',
    'Где сертификаты?' => '/certificates',
    'Как связаться?' => '+7 (495) 104-37-79',
    'Расскажите про RIK-M' => '/product/centralnye-ustanovki',
    'Какие есть противопожарные клапаны?' => 'РИК-3',
];
foreach ($cases as $question => $needle) {
    if (!str_contains(rik_local_knowledge_answer($question), $needle)) {
        fwrite(STDERR, "Local knowledge answer failed for: {$question}\n");
        exit(1);
    }
}

$GLOBALS['RIK_CONFIG'] = ['CHAT_FORCE_LOCAL' => 'true'];
[$ok, $answer, $model] = rik_complete_chat_answer('Что производит РИК?', []);
if (!$ok || $model !== 'local:knowledge' || !str_contains($answer, '/products')) {
    fwrite(STDERR, "Forced local chat mode failed.\n");
    exit(1);
}

echo "Timeweb chat fallback guard PASS.\n";
