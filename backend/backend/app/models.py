from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ChatHistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    sessionId: str | None = Field(default=None, max_length=80)
    message: str = Field(default="", max_length=3000)
    pageUrl: str | None = Field(default=None, max_length=500)
    history: list[ChatHistoryMessage] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatSource(BaseModel):
    title: str
    documentTitle: str | None = None
    heading: str | None = None
    chunkId: str | None = None
    similarity: float | None = None


class ChatResponse(BaseModel):
    answer: str
    sessionId: str
    model: str | None = None
    sources: list[ChatSource] = Field(default_factory=list)
