# RIK Chatbot Backend Handoff

This package contains the Python/FastAPI backend code for the RIK website chatbot.

## What It Does

- Exposes `POST /api/chat`.
- Exposes optional `POST /api/chat/stream` SSE.
- Uses OpenRouter chat completions with model fallback.
- Uses OpenRouter embeddings for the user question.
- Retrieves relevant chunks from Supabase `match_rag_chunks`.
- Adds RAG snippets to the system prompt.
- Keeps API keys and Supabase service role on backend only.
- Stores short session history in a local file store unless the host replaces it.
- Returns human-friendly fallbacks instead of raw provider errors.

## Files

- `backend/app/main.py` - FastAPI routes.
- `backend/app/openrouter_client.py` - chat completions and embeddings.
- `backend/app/supabase_rag.py` - Supabase RAG retriever.
- `backend/app/prompt_builder.py` - system prompt + RAG snippets + history.
- `backend/app/chat_store.py` - replaceable local session store.
- `backend/app/rate_limiter.py` - simple rate limiting.
- `backend/API-CONTRACT.md` - request/response contract.
- `prompts/system.md` - bot behavior rules.
- `requirements.txt` - Python dependencies.

## Required Env

Use the already transferred backend-only `SERVER-SECRETS.env`.

Important values:

```env
OPENROUTER_API_KEY=...
OPENROUTER_MODELS=poolside/laguna-m.1:free,tencent/hy3:free,google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RAG_EMBEDDING_PROVIDER=openrouter
RAG_EMBEDDING_MODEL=openai/text-embedding-3-small
RAG_EMBEDDING_DIMENSIONS=1536
RAG_TOP_K=8
RAG_SIMILARITY_THRESHOLD=0.25
RAG_NAMESPACE=site
```

Do not expose these values to frontend.

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

For reload during development:

```powershell
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Smoke Test

```powershell
$body = @{
  message = "Какие вентиляторы есть у РИК?"
  sessionId = "smoke-test"
  history = @()
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:8000/api/chat" -Method Post -ContentType "application/json" -Body $body
```

Expected behavior:

- response contains an `answer`;
- `model` is one of `OPENROUTER_MODELS`;
- `sources` includes RIK fan/catalog chunks from Supabase.

## Notes For Viktor Agents

- Frontend should call backend only.
- Backend should be deployed on Viktor machine `.31` or near the main site.
- `SERVER-SECRETS.env` stays backend-only.
- If Supabase RAG temporarily fails, backend logs the failure and falls back to local knowledge if present.
- Local `knowledge/` is not the production RAG store; it is a fallback/starter source.

