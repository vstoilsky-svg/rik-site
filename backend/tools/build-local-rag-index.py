# -*- coding: utf-8 -*-
"""Сборка локального векторного индекса знаний чат-бота.

Читает knowledge/*.md, режет по «## »-секциям (длинные — дорезает по абзацам),
эмбеддит через OpenRouter и пишет knowledge/knowledge-index.json.
Запуск: .venv\\Scripts\\python.exe tools\\build-local-rag-index.py
"""
from __future__ import annotations

import io
import json
import math
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE = ROOT / "knowledge"
OUT = KNOWLEDGE / "knowledge-index.json"
CHUNK_MAX = 1800

env: dict[str, str] = {}
for line in io.open(ROOT / ".env", encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip("'\"")

API_KEY = env.get("OPENROUTER_API_KEY", "")
MODEL = env.get("RAG_EMBEDDING_MODEL", "openai/text-embedding-3-small")
if not API_KEY:
    print("OPENROUTER_API_KEY отсутствует в .env")
    sys.exit(1)

op = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def embed(text: str) -> list[float]:
    payload = json.dumps({"model": MODEL, "input": text}).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/embeddings",
        data=payload,
        headers={"Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"},
    )
    for attempt in range(4):
        try:
            r = json.load(op.open(req, timeout=60))
            vec = r.get("data", [{}])[0].get("embedding")
            if isinstance(vec, list):
                return vec
            raise RuntimeError("bad embedding response: " + json.dumps(r)[:200])
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("unreachable")


def split_doc(name: str, text: str) -> list[dict]:
    chunks: list[dict] = []
    heading = None
    buf: list[str] = []

    def flush() -> None:
        body = "\n".join(buf).strip()
        if not body:
            return
        # длинные секции дорезаем по абзацам
        while len(body) > CHUNK_MAX:
            cut = body.rfind("\n", 0, CHUNK_MAX)
            cut = cut if cut > CHUNK_MAX // 2 else CHUNK_MAX
            chunks.append({"source": name, "heading": heading, "content": body[:cut].strip()})
            body = body[cut:].strip()
        chunks.append({"source": name, "heading": heading, "content": body})

    for line in text.splitlines():
        if line.startswith("## "):
            flush()
            buf = []
            heading = line[3:].strip()
        buf.append(line)
    flush()
    return chunks


all_chunks: list[dict] = []
for path in sorted(KNOWLEDGE.glob("*.md")):
    text = path.read_text(encoding="utf-8")
    doc_chunks = split_doc(path.name, text)
    all_chunks.extend(doc_chunks)
    print(f"{path.name}: {len(doc_chunks)} чанков")

print(f"эмбеддинг {len(all_chunks)} чанков ({MODEL})...")
for i, chunk in enumerate(all_chunks):
    text = ((chunk["heading"] + "\n") if chunk["heading"] else "") + chunk["content"]
    vec = embed(text[:6000])
    chunk["id"] = i
    chunk["embedding"] = vec
    chunk["norm"] = math.sqrt(sum(x * x for x in vec)) or 1.0
    if (i + 1) % 10 == 0:
        print(f"  {i + 1}/{len(all_chunks)}")

OUT.write_text(
    json.dumps({"model": MODEL, "built_at": time.strftime("%Y-%m-%d %H:%M:%S"), "chunks": all_chunks},
               ensure_ascii=False),
    encoding="utf-8",
)
print(f"OK: {OUT} ({OUT.stat().st_size // 1024} КБ, {len(all_chunks)} чанков)")
