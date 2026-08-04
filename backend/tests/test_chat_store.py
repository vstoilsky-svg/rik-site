import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.app.chat_store import FileChatStore


class ChatStoreTests(unittest.TestCase):
    def test_retention_and_session_bound(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            store = FileChatStore(root / "sessions.json", root / "stats.json", 4, max_sessions=2, retention_seconds=60)
            store.sessions["expired"] = [{
                "role": "user",
                "content": "old",
                "timestamp": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            }]
            store.append("one", "user", "1")
            store.append("two", "user", "2")
            store.append("three", "user", "3")
            self.assertNotIn("expired", store.sessions)
            self.assertLessEqual(len(store.sessions), 2)
            parsed = json.loads((root / "sessions.json").read_text(encoding="utf-8"))
            self.assertEqual(parsed, store.sessions)


if __name__ == "__main__":
    unittest.main()
