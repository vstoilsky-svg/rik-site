from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class KnowledgeDocument:
    name: str
    content: str

    @property
    def search_text(self) -> str:
        return f"{self.name}\n{self.content}".lower()


class KnowledgeBase:
    def __init__(self, directory: Path, max_chars: int) -> None:
        self.directory = directory
        self.max_chars = max_chars
        self.directory.mkdir(parents=True, exist_ok=True)

    def get_relevant(self, query: str) -> str:
        docs = self._load_documents()
        if not docs:
            return ""

        terms = self._tokenize(query)
        scored = [
            (sum(1 for term in terms if term in doc.search_text), doc)
            for doc in docs
        ]
        ordered = [doc for score, doc in sorted(scored, key=lambda item: item[0], reverse=True)]

        if all(score == 0 for score, _ in scored):
            ordered = docs

        result = ""
        for doc in ordered:
            block = f"\n\n### {doc.name}\n{doc.content}"
            if len(result) + len(block) > self.max_chars:
                remaining = self.max_chars - len(result)
                if remaining > 500 and not result:
                    result += block[:remaining].rstrip()
                break
            result += block

        return result.strip()

    def _load_documents(self) -> list[KnowledgeDocument]:
        docs: list[KnowledgeDocument] = []
        for path in sorted(self.directory.iterdir()):
            if path.suffix.lower() not in {".md", ".json"} or not path.is_file():
                continue
            raw = path.read_text(encoding="utf-8").strip()
            content = self._json_to_text(raw) if path.suffix.lower() == ".json" else raw
            docs.append(KnowledgeDocument(name=path.name, content=content))
        return docs

    @staticmethod
    def _json_to_text(raw: str) -> str:
        try:
            return json.dumps(json.loads(raw), ensure_ascii=False, indent=2)
        except json.JSONDecodeError:
            return raw

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return [term for term in re.split(r"[^\w]+", text.lower(), flags=re.UNICODE) if len(term) >= 3]
