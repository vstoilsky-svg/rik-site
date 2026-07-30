from __future__ import annotations

import time
from threading import Lock


class RateLimiter:
    def __init__(self, window_seconds: int, max_requests: int) -> None:
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.lock = Lock()
        self.buckets: dict[str, dict[str, float]] = {}

    def check(self, key: str) -> bool:
        now = time.time()
        with self.lock:
            bucket = self.buckets.get(key, {"count": 0, "reset_at": now + self.window_seconds})
            if bucket["reset_at"] <= now:
                bucket = {"count": 0, "reset_at": now + self.window_seconds}
            bucket["count"] += 1
            self.buckets[key] = bucket
            return bucket["count"] <= self.max_requests
