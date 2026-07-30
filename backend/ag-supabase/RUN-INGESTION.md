# Загрузка знаний в Supabase

После того как:

- Supabase-проект создан;
- `schema.sql` выполнен;
- `rag-supabase/.env.supabase.local` заполнен;
- `OPENROUTER_API_KEY` есть в корневом `.env`;

запусти из корня проекта:

```powershell
cd "C:\Users\USER\Documents\RIK dev"
python rag-supabase\ingest_knowledge.py
```

Скрипт:

1. читает `knowledge/*.md` и `knowledge/*.json`;
2. режет документы на чанки;
3. считает embeddings через OpenRouter `openai/text-embedding-3-small`;
4. записывает данные в Supabase:
   - `rag_sources`;
   - `rag_documents`;
   - `rag_chunks`;
   - `rag_ingest_runs`.

После успешной загрузки в консоли будет:

```text
Done. Sources=..., documents=..., chunks=...
```

Проверить можно в Supabase `Table Editor`.

Фактический первый прогон 2026-07-09:

```text
Done. Sources=8, documents=8, chunks=59
```

