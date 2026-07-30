# RIK chatbot backend (машина Виктора .31)

Разделение: чатбот (виджет+логика) делает Codex Георгия и передаёт код сюда.
Мы держим backend-окружение: секреты, доступ к Supabase RAG + OpenRouter, деплой.

- secrets/SERVER-SECRETS.env — ТОЛЬКО backend. В .gitignore. Не во frontend.
- ag-supabase/ — схема, ingest, архитектура (референс от Codex).
- Контракт: POST /api/chat {message, sessionId?, history?} -> {answer, sessionId, model, sources?}
- Поток: embedding(question) -> Supabase RPC match_rag_chunks -> prompt -> OpenRouter chat.
