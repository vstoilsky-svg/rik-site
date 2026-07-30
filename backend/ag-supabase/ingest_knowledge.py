from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[1]
RAG_DIR = Path(__file__).resolve().parent
KNOWLEDGE_DIR = ROOT_DIR / "knowledge"


@dataclass
class Chunk:
    index: int
    heading: str | None
    content: str


def main() -> int:
    load_env(ROOT_DIR / ".env")
    load_env(RAG_DIR / ".env.supabase.local")

    supabase_url = require_env("SUPABASE_URL").rstrip("/")
    supabase_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    openrouter_key = require_env("OPENROUTER_API_KEY")
    embedding_model = os.getenv("RAG_EMBEDDING_MODEL", "openai/text-embedding-3-small")
    chunk_max_chars = env_int("RAG_CHUNK_MAX_CHARS", 1200)
    chunk_overlap_chars = env_int("RAG_CHUNK_OVERLAP_CHARS", 180)
    namespace = os.getenv("RAG_NAMESPACE", "site")

    run_key = f"knowledge-{int(time.time())}"
    run_id = create_ingest_run(supabase_url, supabase_key, run_key)
    source_count = document_count = chunk_count = 0

    try:
        for path in sorted(KNOWLEDGE_DIR.iterdir()):
            if path.suffix.lower() not in {".md", ".json"} or not path.is_file():
                continue

            raw = path.read_text(encoding="utf-8").strip()
            content = json.dumps(json.loads(raw), ensure_ascii=False, indent=2) if path.suffix == ".json" else raw
            title = extract_title(content) or path.stem
            source_key = path.name
            document_key = path.name
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

            source_id = upsert_source(
                supabase_url,
                supabase_key,
                source_key=source_key,
                title=title,
                source_type=path.suffix.lower().lstrip("."),
                uri=f"knowledge/{path.name}",
                metadata={"namespace": namespace, "visibility": "public-chatbot"},
            )
            source_count += 1

            document_id = upsert_document(
                supabase_url,
                supabase_key,
                source_id=source_id,
                document_key=document_key,
                title=title,
                content_hash=content_hash,
                metadata={"namespace": namespace, "path": f"knowledge/{path.name}"},
            )
            document_count += 1

            delete_old_chunks(supabase_url, supabase_key, document_id)
            chunks = split_markdown(content, chunk_max_chars, chunk_overlap_chars)
            for chunk in chunks:
                embedding = create_embedding(openrouter_key, embedding_model, chunk.content)
                insert_chunk(
                    supabase_url,
                    supabase_key,
                    document_id=document_id,
                    source_id=source_id,
                    chunk=chunk,
                    chunk_key=f"{document_key}:{chunk.index}",
                    embedding=embedding,
                    metadata={"namespace": namespace, "source_path": f"knowledge/{path.name}"},
                )
                chunk_count += 1
                print(f"inserted {path.name} chunk {chunk.index + 1}/{len(chunks)}")

        finish_ingest_run(
            supabase_url,
            supabase_key,
            run_id,
            status="done",
            source_count=source_count,
            document_count=document_count,
            chunk_count=chunk_count,
        )
        print(f"Done. Sources={source_count}, documents={document_count}, chunks={chunk_count}")
        return 0
    except Exception as error:
        finish_ingest_run(
            supabase_url,
            supabase_key,
            run_id,
            status="failed",
            source_count=source_count,
            document_count=document_count,
            chunk_count=chunk_count,
            error=str(error),
        )
        raise


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip().lstrip("\ufeff")
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value or value.startswith("your-") or value == "choose-embedding-model-with-team":
        raise RuntimeError(f"Missing required env: {name}")
    return value


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def extract_title(content: str) -> str | None:
    match = re.search(r"^#\s+(.+)$", content, flags=re.MULTILINE)
    return match.group(1).strip() if match else None


def split_markdown(content: str, max_chars: int, overlap_chars: int) -> list[Chunk]:
    sections: list[tuple[str | None, str]] = []
    current_heading: str | None = None
    current_lines: list[str] = []

    for line in content.splitlines():
        heading_match = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading_match and current_lines:
            sections.append((current_heading, "\n".join(current_lines).strip()))
            current_lines = []
        if heading_match:
            current_heading = heading_match.group(2).strip()
        current_lines.append(line)

    if current_lines:
        sections.append((current_heading, "\n".join(current_lines).strip()))

    chunks: list[Chunk] = []
    for heading, text in sections:
        for part in split_text(text, max_chars, overlap_chars):
            if part.strip():
                chunks.append(Chunk(index=len(chunks), heading=heading, content=part.strip()))
    return chunks


def split_text(text: str, max_chars: int, overlap_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]

    parts: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            boundary = max(text.rfind("\n\n", start, end), text.rfind(". ", start, end))
            if boundary > start + max_chars // 2:
                end = boundary + 1
        parts.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(0, end - overlap_chars)
    return parts


def create_embedding(openrouter_key: str, model: str, text: str) -> list[float]:
    response = request_json(
        "https://openrouter.ai/api/v1/embeddings",
        method="POST",
        headers={
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "RIK Website Chat RAG Ingestion",
        },
        payload={"model": model, "input": text},
    )
    embedding = response["data"][0]["embedding"]
    if not isinstance(embedding, list):
        raise RuntimeError("Embedding provider returned invalid embedding")
    return embedding


def create_ingest_run(supabase_url: str, supabase_key: str, run_key: str) -> str:
    data = supabase_request(
        supabase_url,
        supabase_key,
        "/rest/v1/rag_ingest_runs",
        method="POST",
        payload={"run_key": run_key, "status": "running"},
        prefer="return=representation",
    )
    return data[0]["id"]


def finish_ingest_run(
    supabase_url: str,
    supabase_key: str,
    run_id: str,
    status: str,
    source_count: int,
    document_count: int,
    chunk_count: int,
    error: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "status": status,
        "source_count": source_count,
        "document_count": document_count,
        "chunk_count": chunk_count,
        "finished_at": "now()",
    }
    if error:
        payload["error"] = error
    supabase_request(
        supabase_url,
        supabase_key,
        f"/rest/v1/rag_ingest_runs?id=eq.{run_id}",
        method="PATCH",
        payload=payload,
    )


def upsert_source(
    supabase_url: str,
    supabase_key: str,
    source_key: str,
    title: str,
    source_type: str,
    uri: str,
    metadata: dict[str, Any],
) -> str:
    data = supabase_request(
        supabase_url,
        supabase_key,
        "/rest/v1/rag_sources?on_conflict=source_key",
        method="POST",
        payload={
            "source_key": source_key,
            "title": title,
            "source_type": source_type,
            "uri": uri,
            "status": "active",
            "metadata": metadata,
        },
        prefer="resolution=merge-duplicates,return=representation",
    )
    return data[0]["id"]


def upsert_document(
    supabase_url: str,
    supabase_key: str,
    source_id: str,
    document_key: str,
    title: str,
    content_hash: str,
    metadata: dict[str, Any],
) -> str:
    data = supabase_request(
        supabase_url,
        supabase_key,
        "/rest/v1/rag_documents?on_conflict=document_key",
        method="POST",
        payload={
            "source_id": source_id,
            "document_key": document_key,
            "title": title,
            "content_hash": content_hash,
            "language": "ru",
            "metadata": metadata,
        },
        prefer="resolution=merge-duplicates,return=representation",
    )
    return data[0]["id"]


def delete_old_chunks(supabase_url: str, supabase_key: str, document_id: str) -> None:
    supabase_request(
        supabase_url,
        supabase_key,
        f"/rest/v1/rag_chunks?document_id=eq.{document_id}",
        method="DELETE",
    )


def insert_chunk(
    supabase_url: str,
    supabase_key: str,
    document_id: str,
    source_id: str,
    chunk: Chunk,
    chunk_key: str,
    embedding: list[float],
    metadata: dict[str, Any],
) -> None:
    supabase_request(
        supabase_url,
        supabase_key,
        "/rest/v1/rag_chunks",
        method="POST",
        payload={
            "document_id": document_id,
            "source_id": source_id,
            "chunk_index": chunk.index,
            "chunk_key": chunk_key,
            "heading": chunk.heading,
            "content": chunk.content,
            "token_estimate": max(1, len(chunk.content) // 4),
            "embedding": embedding,
            "metadata": metadata,
        },
    )


def supabase_request(
    supabase_url: str,
    supabase_key: str,
    path: str,
    method: str,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    url = f"{supabase_url}{path}"
    return request_json(url, method=method, headers=headers, payload=payload)


def request_json(url: str, method: str, headers: dict[str, str], payload: Any | None = None) -> Any:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} from {url}: {body}") from error


if __name__ == "__main__":
    sys.exit(main())
