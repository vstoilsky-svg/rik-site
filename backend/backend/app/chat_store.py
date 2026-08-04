from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from typing import Any


class FileChatStore:
    def __init__(
        self,
        file_path: Path,
        stats_path: Path,
        max_history_messages: int,
        max_sessions: int = 5000,
        retention_seconds: int = 7 * 24 * 60 * 60,
    ) -> None:
        self.file_path = file_path
        self.stats_path = stats_path
        self.max_history_messages = max_history_messages
        self.max_sessions = max(1, max_sessions)
        self.retention = timedelta(seconds=max(60, retention_seconds))
        self.lock = Lock()
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self.sessions: dict[str, list[dict[str, Any]]] = self._read_json(self.file_path, {})
        self.stats: dict[str, Any] = self._read_json(
            self.stats_path,
            {"successfulAnswers": 0, "byModel": {}},
        )
        self._cleanup(datetime.now(timezone.utc))

    def get_history(self, session_id: str) -> list[dict[str, str]]:
        with self.lock:
            self._cleanup(datetime.now(timezone.utc))
            history = self.sessions.get(session_id, [])
            return [
                {"role": item["role"], "content": item["content"]}
                for item in history[-self.max_history_messages :]
                if item.get("role") in {"user", "assistant"} and item.get("content")
            ]

    def append(self, session_id: str, role: str, content: str) -> None:
        with self.lock:
            now = datetime.now(timezone.utc)
            self._cleanup(now)
            history = self.sessions.setdefault(session_id, [])
            history.append(
                {
                    "role": role,
                    "content": content,
                    "timestamp": now.isoformat(),
                }
            )
            self.sessions[session_id] = history[-self.max_history_messages :]
            # The new session can put the store over the configured bound.
            # Re-run cleanup after insertion so the invariant is strict.
            self._cleanup(now)
            self._write_json(self.file_path, self.sessions)

    def _cleanup(self, now: datetime) -> None:
        cutoff = now - self.retention
        retained: list[tuple[str, datetime]] = []
        for session_id, history in list(self.sessions.items()):
            timestamp = self._last_timestamp(history)
            if timestamp is None or timestamp < cutoff:
                self.sessions.pop(session_id, None)
            else:
                retained.append((session_id, timestamp))
        overflow = len(retained) - self.max_sessions
        if overflow > 0:
            for session_id, _ in sorted(retained, key=lambda item: item[1])[:overflow]:
                self.sessions.pop(session_id, None)

    @staticmethod
    def _last_timestamp(history: list[dict[str, Any]]) -> datetime | None:
        if not history:
            return None
        try:
            value = datetime.fromisoformat(str(history[-1].get("timestamp", "")))
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

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
        temporary = path.with_suffix(f"{path.suffix}.tmp")
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(path)
