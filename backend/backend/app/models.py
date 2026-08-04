from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=3000)


class ChatRequest(BaseModel):
    sessionId: str | None = Field(default=None, max_length=80)
    message: str = Field(default="", max_length=3000)
    pageUrl: str | None = Field(default=None, max_length=500)
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=20)
    metadata: dict[str, str] = Field(default_factory=dict, max_length=20)

    @field_validator("metadata")
    @classmethod
    def bound_metadata(cls, value: dict[str, str]) -> dict[str, str]:
        if any(len(key) > 80 or len(item) > 500 for key, item in value.items()):
            raise ValueError("metadata keys or values are too long")
        return value


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
