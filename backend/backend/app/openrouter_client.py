from __future__ import annotations

import json
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass

import httpx

from . import config


@dataclass
class OpenRouterResult:
    ok: bool
    answer: str
    model: str | None


class OpenRouterClient:
    chat_endpoint = "https://openrouter.ai/api/v1/chat/completions"
    embeddings_endpoint = "https://openrouter.ai/api/v1/embeddings"

    def __init__(self) -> None:
        self.api_key = config.OPENROUTER_API_KEY
        self.models = config.OPENROUTER_MODELS
        self.timeout = config.OPENROUTER_TIMEOUT_SECONDS
        self.fallback_answer = config.CHAT_FALLBACK_MESSAGE

    async def complete(self, messages: list[dict[str, str]]) -> OpenRouterResult:
        if not self.api_key or not self.models:
            return OpenRouterResult(False, self.fallback_answer, None)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for model in self.models:
                try:
                    response = await client.post(
                        self.chat_endpoint,
                        headers=self._headers(),
                        json=self._payload(model, messages, stream=False),
                    )
                    if response.status_code >= 400:
                        continue
                    data = response.json()
                    answer = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                    if answer:
                        return OpenRouterResult(True, answer, model)
                except (httpx.HTTPError, json.JSONDecodeError, KeyError, IndexError):
                    continue

        return OpenRouterResult(False, self.fallback_answer, None)

    async def stream(
        self,
        messages: list[dict[str, str]],
        on_model: Callable[[str], None] | None = None,
    ) -> AsyncIterator[tuple[str, str | None]]:
        if not self.api_key or not self.models:
            yield self.fallback_answer, None
            return

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for model in self.models:
                try:
                    async with client.stream(
                        "POST",
                        self.chat_endpoint,
                        headers=self._headers(),
                        json=self._payload(model, messages, stream=True),
                    ) as response:
                        if response.status_code >= 400:
                            continue

                        if on_model:
                            on_model(model)

                        yielded = False
                        async for line in response.aiter_lines():
                            if not line.startswith("data:"):
                                continue
                            payload = line.removeprefix("data:").strip()
                            if payload == "[DONE]":
                                return
                            try:
                                data = json.loads(payload)
                            except json.JSONDecodeError:
                                continue
                            delta = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                yielded = True
                                yield delta, model

                        if yielded:
                            return
                except httpx.HTTPError:
                    continue

        yield self.fallback_answer, None

    async def create_embedding(self, text: str) -> list[float]:
        if not self.api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not configured")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                self.embeddings_endpoint,
                headers=self._headers(),
                json={
                    "model": config.RAG_EMBEDDING_MODEL,
                    "input": text,
                },
            )
            response.raise_for_status()
            data = response.json()
            embedding = data.get("data", [{}])[0].get("embedding")
            if not isinstance(embedding, list):
                raise RuntimeError("OpenRouter returned invalid embedding response")
            return embedding

    def _headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if config.OPENROUTER_SITE_URL:
            headers["HTTP-Referer"] = config.OPENROUTER_SITE_URL
        if config.OPENROUTER_APP_NAME:
            headers["X-Title"] = config.OPENROUTER_APP_NAME
        return headers

    @staticmethod
    def _payload(model: str, messages: list[dict[str, str]], stream: bool) -> dict[str, object]:
        return {
            "model": model,
            "messages": messages,
            "stream": stream,
            "temperature": config.OPENROUTER_TEMPERATURE,
        }
