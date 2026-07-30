from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from . import config
from .models import ChatSource
from .openrouter_client import OpenRouterClient


@dataclass
class RagChunk:
    content: str
    source: ChatSource


@dataclass
class RagResult:
    context: str
    sources: list[ChatSource]


class SupabaseRagRetriever:
    def __init__(self, openrouter: OpenRouterClient) -> None:
        self.openrouter = openrouter
        self.supabase_url = config.SUPABASE_URL
        self.supabase_key = config.SUPABASE_SERVICE_ROLE_KEY
        self.top_k = config.RAG_TOP_K
        self.threshold = config.RAG_SIMILARITY_THRESHOLD
        self.namespace = config.RAG_NAMESPACE
        self.max_context_chars = config.RAG_MAX_CONTEXT_CHARS

    @property
    def enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    async def retrieve(self, question: str) -> RagResult:
        if not self.enabled:
            return RagResult(context="", sources=[])

        embedding = await self.openrouter.create_embedding(question)
        rows = await self._match_chunks(embedding)
        chunks = [self._row_to_chunk(row) for row in rows]
        return self._build_context(chunks)

    async def _match_chunks(self, embedding: list[float]) -> list[dict[str, Any]]:
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "query_embedding": embedding,
            "match_count": self.top_k,
            "similarity_threshold": self.threshold,
            "namespace_filter": self.namespace,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.supabase_url}/rest/v1/rpc/match_rag_chunks",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, list) else []

    @staticmethod
    def _row_to_chunk(row: dict[str, Any]) -> RagChunk:
        source = ChatSource(
            title=str(row.get("source_title") or row.get("source_key") or "knowledge"),
            documentTitle=row.get("document_title"),
            heading=row.get("heading"),
            chunkId=str(row.get("chunk_id")) if row.get("chunk_id") else None,
            similarity=float(row["similarity"]) if row.get("similarity") is not None else None,
        )
        return RagChunk(content=str(row.get("content") or ""), source=source)

    def _build_context(self, chunks: list[RagChunk]) -> RagResult:
        blocks: list[str] = []
        sources: list[ChatSource] = []
        used_chars = 0

        for index, chunk in enumerate(chunks, start=1):
            heading = f" / {chunk.source.heading}" if chunk.source.heading else ""
            block = f"[{index}] Source: {chunk.source.title}{heading}\n{chunk.content.strip()}"
            if used_chars + len(block) > self.max_context_chars:
                break
            blocks.append(block)
            sources.append(chunk.source)
            used_chars += len(block)

        return RagResult(context="\n\n".join(blocks), sources=sources)
