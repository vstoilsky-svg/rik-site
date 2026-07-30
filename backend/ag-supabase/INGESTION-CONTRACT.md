# Ingestion contract for RIK chatbot RAG

Этот документ для агентов Виктора, которые будут вставлять RAG в основной сайт/сервер.

## Input

Ингестер принимает папку с источниками:

```text
knowledge/
```

Форматы первого этапа:

- `.md`
- `.json`

Позже можно добавить:

- `.html`
- `.pdf`
- `.docx`
- выгрузки из CMS;
- утвержденные сообщения из `site-bridge`.

## Normalize

Каждый источник превращается в документ:

```json
{
  "source_key": "10-product-catalog.md",
  "title": "РИК: каталог продукции",
  "source_type": "markdown",
  "uri": "knowledge/10-product-catalog.md",
  "content": "...",
  "metadata": {
    "namespace": "site",
    "owner": "rik",
    "approved_by": "Viktor or Georgiy",
    "visibility": "public-chatbot"
  }
}
```

## Chunking

Стартовая стратегия:

- резать markdown по заголовкам;
- если секция длинная, резать на чанки до `RAG_CHUNK_MAX_CHARS`;
- делать overlap `RAG_CHUNK_OVERLAP_CHARS`;
- сохранять ближайший heading в `rag_chunks.heading`;
- `chunk_key = document_key + ':' + chunk_index`.

## Embedding

Для каждого чанка:

1. отправить `content` в embedding provider;
2. получить embedding;
3. проверить размерность;
4. записать в `rag_chunks.embedding`.

Размерность в `schema.sql` сейчас `vector(1536)`. Если выбранная модель дает другую размерность, изменить:

```sql
embedding vector(1536)
match_rag_chunks(query_embedding vector(1536), ...)
```

## Upsert logic

Рекомендуемый порядок:

1. Создать `rag_ingest_runs` со статусом `running`.
2. Upsert `rag_sources` по `source_key`.
3. Upsert `rag_documents` по `document_key`.
4. Удалить старые чанки документа или upsert по `chunk_key`.
5. Записать новые чанки.
6. Обновить run status на `done`.

Если ошибка:

- run status = `failed`;
- записать `error`;
- не удалять старую рабочую базу, если новый ingestion не завершился.

## Retrieval API expected by chatbot backend

Backend должен иметь функцию примерно такого вида:

```python
def retrieve_context(question: str) -> list[dict]:
    query_embedding = create_embedding(question)
    return supabase.rpc(
        "match_rag_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": RAG_TOP_K,
            "similarity_threshold": RAG_SIMILARITY_THRESHOLD,
            "namespace_filter": RAG_NAMESPACE,
        },
    )
```

Возвращаемые поля:

- `chunk_id`
- `source_title`
- `document_title`
- `heading`
- `content`
- `similarity`
- `metadata`

## Prompt assembly

Фрагменты нужно собрать компактно:

```text
Project knowledge snippets:

[1] 10-product-catalog.md / Вентиляторы
...

[2] 00-rik-company-and-sales.md / Как принимать заявку
...
```

Если snippets пустые, prompt должен явно сказать модели:

```text
No relevant project knowledge was found. Do not invent project facts.
```

