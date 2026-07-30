# Chatbot Backend API Contract

This backend is prepared for SITE-CLAUDE / Viktor agents.

## Endpoint

```http
POST /api/chat
```

## Request

```json
{
  "message": "string",
  "sessionId": "optional-session-id",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "pageUrl": "optional-current-page-url",
  "metadata": {}
}
```

Only `message` is required. `sessionId`, `history`, `pageUrl` and `metadata` are optional.

## Response

```json
{
  "answer": "string",
  "sessionId": "string",
  "model": "string",
  "sources": [
    {
      "title": "string",
      "documentTitle": "string",
      "heading": "string",
      "chunkId": "uuid",
      "similarity": 0.72
    }
  ]
}
```

`sources` are returned for backend/debug integration. The public frontend does not need to render them.

## Streaming

```http
POST /api/chat/stream
```

Server-Sent Events:

- `message` with `{ "delta": "..." }`
- `done` with `{ "sessionId": "...", "model": "...", "sources": [...] }`

## Retrieval Flow

1. Normalize user message.
2. Create query embedding through OpenRouter:
   - provider: `openrouter`
   - model: `openai/text-embedding-3-small`
   - dimensions: `1536`
3. Call Supabase RPC:
   - `match_rag_chunks(query_embedding, match_count, similarity_threshold, namespace_filter)`
4. Add returned snippets to system prompt.
5. Call OpenRouter chat completions with fallback models.
6. Return answer and sources.

