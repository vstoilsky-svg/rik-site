from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any


class FileChatStore:
    def __init__(self, file_path: Path, stats_path: Path, max_history_messages: int) -> None:
        self.file_path = file_path
        self.stats_path = stats_path
        self.max_history_messages = max_history_messages
        self.lock = Lock()
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self.sessions: dict[str, list[dict[str, Any]]] = self._read_json(self.file_path, {})
        self.stats: dict[str, Any] = self._read_json(
            self.stats_path,
            {"successfulAnswers": 0, "byModel": {}},
        )

    def get_history(self, session_id: str) -> list[dict[str, str]]:
        with self.lock:
            history = self.sessions.get(session_id, [])
            return [
                {"role": item["role"], "content": item["content"]}
                for item in history[-self.max_history_messages :]
                if item.get("role") in {"user", "assistant"} and item.get("content")
            ]

    def append(self, session_id: str, role: str, content: str) -> None:
        with self.lock:
            history = self.sessions.setdefault(session_id, [])
            history.append(
                {
                    "role": role,
                    "content": content,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
            self.sessions[session_id] = history[-self.max_history_messages :]
            self._write_json(self.file_path, self.sessions)

    def increment_successful_answers(self, model: str | None) -> None:
        with self.lock:
            model_key = model or "unknown"
            self.stats["successfulAnswers"] = int(self.stats.get("successfulAnswers", 0)) + 1
            by_model = self.stats.setdefault("byModel", {})
            by_model[model_key] = int(by_model.get(model_key, 0)) + 1
            self._write_json(self.stats_path, self.stats)

    @staticmethod
    def _read_json(path: Path, fallback: Any) -> Any:
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            return fallback

    @staticmethod
    def _write_json(path: Path, data: Any) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
