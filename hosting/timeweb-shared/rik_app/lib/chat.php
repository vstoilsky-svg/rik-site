<?php
declare(strict_types=1);

/** @param array<string, mixed> $payload */
function rik_chat_result(array $payload): array
{
    $sessionId = rik_normalize_session_id(isset($payload['sessionId']) ? (string) $payload['sessionId'] : '');
    $message = trim((string) ($payload['message'] ?? ''));
    $message = rik_text_substr($message, 0, rik_config_int('MAX_MESSAGE_CHARS', 3000));

    if ($message === '') {
        return ['answer' => 'Напишите сообщение, и я постараюсь помочь.', 'sessionId' => $sessionId, 'model' => null, 'sources' => []];
    }

    if (!rik_rate_limit('chat:' . rik_client_ip(), rik_config_int('RATE_LIMIT_WINDOW_SECONDS', 60), rik_config_int('RATE_LIMIT_MAX_REQUESTS', 20))) {
        return [
            'answer' => rik_config('CHAT_FALLBACK_MESSAGE', 'Сейчас я немного перегружен. Попробуйте написать чуть позже.'),
            'sessionId' => $sessionId,
            'model' => null,
            'sources' => [],
            '_status' => 429,
        ];
    }

    $history = rik_sanitize_history($payload['history'] ?? rik_chat_history($sessionId));
    $direct = rik_direct_questionnaire_answer($message);
    if ($direct !== null) {
        rik_chat_append($sessionId, 'user', $message);
        rik_chat_append($sessionId, 'assistant', $direct);
        rik_increment_answer_stats('rule:questionnaire');
        return ['answer' => $direct, 'sessionId' => $sessionId, 'model' => 'rule:questionnaire', 'sources' => []];
    }

    [$knowledge, $sources] = rik_retrieve_knowledge($message);
    $messages = rik_build_messages($message, $history, isset($payload['pageUrl']) ? (string) $payload['pageUrl'] : '', $knowledge);

    rik_chat_append($sessionId, 'user', $message);
    [$ok, $answer, $model] = rik_openrouter_complete($messages);
    if ($ok) {
        rik_chat_append($sessionId, 'assistant', $answer);
        rik_increment_answer_stats($model ?? 'unknown');
    }

    return ['answer' => $answer, 'sessionId' => $sessionId, 'model' => $model, 'sources' => $sources];
}

function rik_handle_chat(bool $stream): never
{
    $result = rik_chat_result(rik_read_json_body());
    $status = (int) ($result['_status'] ?? 200);
    unset($result['_status']);

    if (!$stream) {
        rik_json($result, $status);
    }

    http_response_code($status);
    header('Content-Type: text/event-stream; charset=utf-8');
    header('Cache-Control: no-cache, no-store');
    header('X-Accel-Buffering: no');
    echo rik_sse('message', ['delta' => (string) ($result['answer'] ?? '')]);
    echo rik_sse('done', [
        'sessionId' => (string) ($result['sessionId'] ?? ''),
        'model' => $result['model'] ?? null,
        'sources' => $result['sources'] ?? [],
    ]);
    exit;
}

function rik_normalize_session_id(string $value): string
{
    return preg_match('/^[a-zA-Z0-9_-]{12,80}$/', $value) ? $value : rik_uuid_v4();
}

function rik_uuid_v4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/** @param mixed $history @return list<array{role:string,content:string}> */
function rik_sanitize_history(mixed $history): array
{
    if (!is_array($history)) {
        return [];
    }
    $clean = [];
    $limit = rik_config_int('MAX_HISTORY_MESSAGES', 20);
    foreach (array_slice($history, -$limit) as $item) {
        if (!is_array($item)) {
            continue;
        }
        $role = (string) ($item['role'] ?? '');
        $content = rik_text_substr(trim((string) ($item['content'] ?? '')), 0, 3000);
        if (in_array($role, ['user', 'assistant'], true) && $content !== '') {
            $clean[] = ['role' => $role, 'content' => $content];
        }
    }
    return $clean;
}

function rik_sse(string $event, array $data): string
{
    return 'event: ' . $event . "\n" . 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
}

function rik_direct_questionnaire_answer(string $message): ?string
{
    $normalized = rik_normalize_text($message);
    if (!rik_matches_any($normalized, ['подбор', 'подобрать', 'подберите', 'заказ', 'купить', 'стоимост', 'цена', 'цены', 'цену', 'расчет', 'рассчита', 'опросн', 'коммерческое предложение', 'кп'])) {
        return null;
    }

    if (rik_is_fan_query($normalized)) {
        return "Для подбора вентилятора лучше заполнить опросный лист: там инженер увидит расход воздуха, давление, условия работы и ограничения по монтажу.\n\n[Скачать опросный лист на вентилятор](/downloads/oprosny-list-ventilyator.xlsx)\n\nЕсли уже есть ТЗ, спецификация или проект, можно приложить их вместе с листом — так расчет получится точнее.";
    }

    if (rik_is_central_query($normalized)) {
        return "У РИК есть центральные кондиционеры / центральные установки RIK-M и RIK-S. Для подбора лучше заполнить опросный лист: по нему инженер сможет корректно учесть расход воздуха, состав секций, режимы и требования к объекту.\n\n[Скачать опросный лист на центральный кондиционер](/downloads/oprosny-list-centralny-konditsioner.xlsx)\n\nЕсли есть ТЗ, спецификация или проект, приложите их вместе с листом — это ускорит расчет.";
    }

    if (rik_is_other_equipment_query($normalized)) {
        return "По этому оборудованию лучше уточнить задачу и параметры, чтобы инженер мог подобрать решение без ошибок.\n\nДля точного подбора лучше оформить расчет — пришлите, пожалуйста:\n- что нужно подобрать (тип оборудования, расход воздуха, назначение);\n- есть ли ТЗ, спецификация или проект;\n- контакт для связи (телефон / email).\n\nМенеджер или инженер РИК свяжется с расчетом.";
    }
    return null;
}

function rik_questionnaire_context(string $message): string
{
    $normalized = rik_normalize_text($message);
    if (rik_is_fan_query($normalized)) {
        return 'ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: пользователь спрашивает про вентиляторы. В ответе обязательно дай ссылку [Скачать опросный лист на вентилятор](/downloads/oprosny-list-ventilyator.xlsx).';
    }
    if (rik_is_central_query($normalized)) {
        return 'ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: пользователь спрашивает про центральный кондиционер / ЦК. В ответе обязательно дай ссылку [Скачать опросный лист на центральный кондиционер](/downloads/oprosny-list-centralny-konditsioner.xlsx).';
    }
    if (rik_is_other_equipment_query($normalized)) {
        return 'Для этого типа оборудования отдельный опросный лист не задан. Дай краткую информацию и предложи отправить ТЗ через форму расчета.';
    }
    return '';
}

function rik_normalize_text(string $value): string
{
    return str_replace('ё', 'е', rik_text_lower($value));
}

/** @param list<string> $needles */
function rik_matches_any(string $value, array $needles): bool
{
    foreach ($needles as $needle) {
        if (rik_text_contains_case_insensitive($value, $needle)) {
            return true;
        }
    }
    return false;
}

function rik_is_fan_query(string $value): bool
{
    return rik_matches_any($value, ['вентилятор', 'krv', 'крв', 'rop', 'роп', 'wrn', 'канальн', 'крышн', 'радиальн']);
}

function rik_is_central_query(string $value): bool
{
    return rik_matches_any($value, ['кондиционер', 'кондиционировани', 'центральн', 'цк', 'rik-m', 'rik-s', 'приточн']);
}

function rik_is_other_equipment_query(string $value): bool
{
    return rik_matches_any($value, ['клапан', 'воздуховод', 'решетк', 'диффузор', 'шумоглушител', 'фильтр', 'калорифер', 'охладител', 'нагревател', 'увлажнител', 'осушител', 'рекуператор', 'теплоутилизатор', 'теплообменник', 'чиллер']);
}

/** @return array{0:string,1:list<array<string,mixed>>} */
function rik_retrieve_knowledge(string $message): array
{
    try {
        if (rik_config('SUPABASE_URL') !== '' && rik_config('SUPABASE_SERVICE_ROLE_KEY') !== '' && rik_config('OPENROUTER_API_KEY') !== '') {
            $embedding = rik_openrouter_embedding($message);
            $url = rtrim(rik_config('SUPABASE_URL'), '/') . '/rest/v1/rpc/match_rag_chunks';
            $key = rik_config('SUPABASE_SERVICE_ROLE_KEY');
            $response = rik_http_json($url, [
                'apikey' => $key,
                'Authorization' => 'Bearer ' . $key,
                'Content-Type' => 'application/json',
            ], [
                'query_embedding' => $embedding,
                'match_count' => rik_config_int('RAG_TOP_K', 8),
                'similarity_threshold' => rik_config_float('RAG_SIMILARITY_THRESHOLD', 0.25),
                'namespace_filter' => rik_config('RAG_NAMESPACE', 'site'),
            ], 30);

            if ($response['status'] >= 200 && $response['status'] < 300 && array_is_list($response['body'])) {
                $blocks = [];
                $sources = [];
                $used = 0;
                $max = rik_config_int('RAG_MAX_CONTEXT_CHARS', 12000);
                foreach ($response['body'] as $index => $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $title = (string) ($row['source_title'] ?? $row['source_key'] ?? 'knowledge');
                    $heading = (string) ($row['heading'] ?? '');
                    $block = '[' . ($index + 1) . '] Source: ' . $title . ($heading !== '' ? ' / ' . $heading : '') . "\n" . trim((string) ($row['content'] ?? ''));
                    if ($used + rik_text_length($block) > $max) {
                        break;
                    }
                    $blocks[] = $block;
                    $sources[] = [
                        'title' => $title,
                        'documentTitle' => $row['document_title'] ?? null,
                        'heading' => $heading !== '' ? $heading : null,
                        'chunkId' => isset($row['chunk_id']) ? (string) $row['chunk_id'] : null,
                        'similarity' => isset($row['similarity']) ? (float) $row['similarity'] : null,
                    ];
                    $used += rik_text_length($block);
                }
                if ($blocks !== []) {
                    return [implode("\n\n", $blocks), $sources];
                }
            }
        }
    } catch (Throwable $error) {
        error_log('RIK Supabase RAG failed: ' . $error->getMessage());
    }
    return [rik_keyword_knowledge($message), []];
}

function rik_keyword_knowledge(string $query): string
{
    $files = glob(rik_app_path('knowledge/*.md')) ?: [];
    if ($files === []) {
        return '';
    }
    $terms = preg_split('/[^\p{L}\p{N}_]+/u', rik_normalize_text($query), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $terms = array_values(array_filter($terms, static fn(string $term): bool => rik_text_length($term) >= 3));
    $docs = [];
    foreach ($files as $file) {
        $content = file_get_contents($file);
        if (!is_string($content)) {
            continue;
        }
        $haystack = rik_normalize_text(basename($file) . "\n" . $content);
        $score = 0;
        foreach ($terms as $term) {
            if (rik_text_contains_case_insensitive($haystack, $term)) {
                $score++;
            }
        }
        $docs[] = ['name' => basename($file), 'content' => $content, 'score' => $score];
    }
    usort($docs, static fn(array $a, array $b): int => $b['score'] <=> $a['score']);

    $max = rik_config_int('KNOWLEDGE_MAX_CHARS', 12000);
    $result = '';
    foreach ($docs as $doc) {
        $block = "\n\n### " . $doc['name'] . "\n" . trim($doc['content']);
        if (rik_text_length($result . $block) > $max) {
            break;
        }
        $result .= $block;
    }
    return trim($result);
}

/** @param list<array{role:string,content:string}> $history @return list<array{role:string,content:string}> */
function rik_build_messages(string $message, array $history, string $pageUrl, string $knowledge): array
{
    $system = trim((string) @file_get_contents(rik_app_path('prompts/system.md')));
    $rule = rik_questionnaire_context($message);
    if ($rule !== '') {
        $system .= "\n\nMandatory questionnaire/download rule for the current user message:\n" . $rule;
    }
    $system .= $knowledge !== '' ? "\n\nProject knowledge snippets:\n" . $knowledge : "\n\nNo relevant project knowledge was found. Do not invent project facts.";
    if ($pageUrl !== '') {
        $system .= "\n\nCurrent page URL: " . rik_text_substr($pageUrl, 0, 500);
    }
    return array_merge([['role' => 'system', 'content' => $system]], $history, [['role' => 'user', 'content' => $message]]);
}

/** @param list<array{role:string,content:string}> $messages @return array{0:bool,1:string,2:?string} */
function rik_openrouter_complete(array $messages): array
{
    $apiKey = rik_config('OPENROUTER_API_KEY');
    $models = array_values(array_filter(array_map('trim', explode(',', rik_config('OPENROUTER_MODELS')))));
    $fallback = rik_config('CHAT_FALLBACK_MESSAGE', 'Сейчас я немного перегружен. Попробуйте написать чуть позже.');
    if ($apiKey === '' || $models === []) {
        return [false, $fallback, null];
    }
    $headers = ['Authorization' => 'Bearer ' . $apiKey, 'Content-Type' => 'application/json'];
    if (rik_config('OPENROUTER_SITE_URL') !== '') {
        $headers['HTTP-Referer'] = rik_config('OPENROUTER_SITE_URL');
    }
    if (rik_config('OPENROUTER_APP_NAME') !== '') {
        $headers['X-Title'] = rik_config('OPENROUTER_APP_NAME');
    }
    foreach ($models as $model) {
        try {
            $response = rik_http_json('https://openrouter.ai/api/v1/chat/completions', $headers, [
                'model' => $model,
                'messages' => $messages,
                'stream' => false,
                'temperature' => rik_config_float('OPENROUTER_TEMPERATURE', 0.6),
            ], rik_config_int('OPENROUTER_TIMEOUT_SECONDS', 45));
            $answer = trim((string) ($response['body']['choices'][0]['message']['content'] ?? ''));
            if ($response['status'] < 400 && $answer !== '') {
                return [true, $answer, $model];
            }
        } catch (Throwable $error) {
            error_log('RIK OpenRouter chat failed: ' . $error->getMessage());
        }
    }
    return [false, $fallback, null];
}

/** @return list<float> */
function rik_openrouter_embedding(string $text): array
{
    $apiKey = rik_config('OPENROUTER_API_KEY');
    $response = rik_http_json('https://openrouter.ai/api/v1/embeddings', [
        'Authorization' => 'Bearer ' . $apiKey,
        'Content-Type' => 'application/json',
    ], ['model' => rik_config('RAG_EMBEDDING_MODEL', 'openai/text-embedding-3-small'), 'input' => $text], rik_config_int('OPENROUTER_TIMEOUT_SECONDS', 45));
    $embedding = $response['body']['data'][0]['embedding'] ?? null;
    if ($response['status'] >= 400 || !is_array($embedding)) {
        throw new RuntimeException('Embedding response is invalid');
    }
    return array_map('floatval', $embedding);
}

/** @return list<array{role:string,content:string}> */
function rik_chat_history(string $sessionId): array
{
    $store = rik_read_store('chat-sessions.json', []);
    $history = is_array($store[$sessionId] ?? null) ? $store[$sessionId] : [];
    return rik_sanitize_history($history);
}

function rik_chat_append(string $sessionId, string $role, string $content): void
{
    rik_update_store('chat-sessions.json', static function (array $store) use ($sessionId, $role, $content): array {
        $retention = max(60, rik_config_int('CHAT_SESSION_RETENTION_SECONDS', 604800));
        $cutoff = time() - $retention;
        foreach ($store as $id => $history) {
            $last = is_array($history) ? end($history) : false;
            if (!is_array($last) || (int) ($last['timestamp'] ?? 0) < $cutoff) {
                unset($store[$id]);
            }
        }
        $history = is_array($store[$sessionId] ?? null) ? $store[$sessionId] : [];
        $history[] = ['role' => $role, 'content' => $content, 'timestamp' => time()];
        $store[$sessionId] = array_slice($history, -rik_config_int('MAX_HISTORY_MESSAGES', 20));
        if (count($store) > rik_config_int('CHAT_MAX_SESSIONS', 5000)) {
            $store = array_slice($store, -rik_config_int('CHAT_MAX_SESSIONS', 5000), null, true);
        }
        return $store;
    });
}

function rik_increment_answer_stats(string $model): void
{
    rik_update_store('usage-stats.json', static function (array $stats) use ($model): array {
        $stats['successfulAnswers'] = (int) ($stats['successfulAnswers'] ?? 0) + 1;
        $byModel = is_array($stats['byModel'] ?? null) ? $stats['byModel'] : [];
        $byModel[$model] = (int) ($byModel[$model] ?? 0) + 1;
        $stats['byModel'] = $byModel;
        return $stats;
    });
}

/** @param array<string,mixed> $fallback @return array<string,mixed> */
function rik_read_store(string $name, array $fallback): array
{
    $path = rik_app_path('data/' . $name);
    $raw = @file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : $fallback;
}

/** @param callable(array<string,mixed>):array<string,mixed> $callback */
function rik_update_store(string $name, callable $callback): void
{
    $path = rik_app_path('data/' . $name);
    $handle = fopen($path, 'c+');
    if ($handle === false) {
        return;
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            return;
        }
        rewind($handle);
        $raw = stream_get_contents($handle);
        $store = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        $store = $callback(is_array($store) ? $store : []);
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        fflush($handle);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
