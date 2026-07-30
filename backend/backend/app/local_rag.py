from __future__ import annotations

import json
import math
from pathlib import Path

from . import config
from .models import ChatSource
from .openrouter_client import OpenRouterClient
from .supabase_rag import RagChunk, RagResult


INDEX_PATH = config.KNOWLEDGE_DIR / "knowledge-index.json"


class LocalVectorRagRetriever:
    """Векторный поиск по knowledge/knowledge-index.json (без внешней БД).

    Индекс собирается tools/build-local-rag-index.py; вопрос эмбеддится тем же
    OpenRouter-эндпоинтом, что и чанки, дальше cosine top-k в памяти.
    """

    def __init__(self, openrouter: OpenRouterClient) -> None:
        self.openrouter = openrouter
        self.top_k = config.RAG_TOP_K
        self.threshold = config.RAG_SIMILARITY_THRESHOLD
        self.max_context_chars = config.RAG_MAX_CONTEXT_CHARS
        self._chunks: list[dict] | None = None
        self._mtime: float | None = None

    @property
    def enabled(self) -> bool:
        return INDEX_PATH.is_file()

    def _load(self) -> list[dict]:
        mtime = INDEX_PATH.stat().st_mtime
        if self._chunks is None or self._mtime != mtime:
            data = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
            self._chunks = data.get("chunks", [])
            self._mtime = mtime
        return self._chunks

    async def retrieve(self, question: str) -> RagResult:
        if not self.enabled:
            return RagResult(context="", sources=[])

        chunks = self._load()
        if not chunks:
            return RagResult(context="", sources=[])

        query = await self.openrouter.create_embedding(question)
        qnorm = math.sqrt(sum(x * x for x in query)) or 1.0

        scored: list[tuple[float, dict]] = []
        for chunk in chunks:
            vec = chunk.get("embedding") or []
            if len(vec) != len(query):
                continue
            dot = sum(a * b for a, b in zip(query, vec))
            sim = dot / (qnorm * (chunk.get("norm") or 1.0))
            if sim >= self.threshold:
                scored.append((sim, chunk))
        scored.sort(key=lambda item: item[0], reverse=True)

        picked = [
            RagChunk(
                content=str(chunk.get("content") or ""),
                source=ChatSource(
                    title=str(chunk.get("source") or "knowledge"),
                    documentTitle=chunk.get("source"),
                    heading=chunk.get("heading"),
                    chunkId=str(chunk.get("id")) if chunk.get("id") is not None else None,
                    similarity=round(sim, 4),
                ),
            )
            for sim, chunk in scored[: self.top_k]
        ]

        blocks: list[str] = []
        sources: list[ChatSource] = []
        used = 0
        for index, chunk in enumerate(picked, start=1):
            heading = f" / {chunk.source.heading}" if chunk.source.heading else ""
            block = f"[{index}] Source: {chunk.source.title}{heading}\n{chunk.content.strip()}"
            if used + len(block) > self.max_context_chars:
                break
            blocks.append(block)
            sources.append(chunk.source)
            used += len(block)

        return RagResult(context="\n\n".join(blocks), sources=sources)
