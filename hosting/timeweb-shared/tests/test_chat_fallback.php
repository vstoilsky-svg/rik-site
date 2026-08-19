<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/rik_app/lib/bootstrap.php';
require_once dirname(__DIR__) . '/rik_app/lib/local_relay.php';
require_once dirname(__DIR__) . '/rik_app/lib/chat.php';

$legacy = 'Сейчас я немного перегружен. Попробуйте написать чуть позже.';
$expected = 'Чат-ассистент временно недоступен: модель не ответила вовремя. Попробуйте позже или отправьте заявку через «Запросить расчёт».';

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

$GLOBALS['RIK_CONFIG'] = [
    'CHAT_FORCE_LOCAL' => 'false',
    'LOCAL_RELAY_ENABLED' => 'false',
    'LOCAL_RELAY_TOKEN' => '',
    'OPENROUTER_API_KEY' => '',
    'OPENROUTER_MODELS' => '',
];
[$ok, $answer, $model] = rik_complete_chat_answer('Что производит РИК?', []);
if ($ok || $model !== null || $answer !== $expected) {
    fwrite(STDERR, "Provider failure was incorrectly masked as a local model.\n");
    exit(1);
}

$GLOBALS['RIK_APP_ROOT'] = dirname(__DIR__, 3) . '/backend';
$GLOBALS['RIK_CONFIG']['KNOWLEDGE_MAX_CHARS'] = '6000';
$fanKnowledge = rik_keyword_knowledge('Какие бывают вентиляторы РИК?');
if (!str_contains($fanKnowledge, 'KRV') || !str_contains($fanKnowledge, 'RR') || !str_contains($fanKnowledge, 'ROP')) {
    fwrite(STDERR, "Keyword RAG did not return the fan-family evidence.\n");
    exit(1);
}

$valveKnowledge = rik_keyword_knowledge('Перечисли серии противопожарных клапанов РИК без выдуманных характеристик.');
if (!str_contains($valveKnowledge, 'РИК-1') || !str_contains($valveKnowledge, 'РИК-2') || !str_contains($valveKnowledge, 'РИК-3')) {
    fwrite(STDERR, "Keyword RAG did not normalize Russian valve word endings.\n");
    exit(1);
}

$systemPrompt = (string) file_get_contents(dirname(__DIR__, 3) . '/backend/prompts/system.md');
if (!str_contains($systemPrompt, 'Никогда не проси и не принимай в чате') || !str_contains($systemPrompt, '](/request)')) {
    fwrite(STDERR, "System prompt does not fail closed on personal data in chat.\n");
    exit(1);
}

echo "Timeweb chat fallback guard PASS.\n";
