from __future__ import annotations

import time
from collections.abc import Callable
from threading import Lock


class RateLimiter:
    def __init__(
        self,
        window_seconds: int,
        max_requests: int,
        max_buckets: int = 10000,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.max_buckets = max(1, max_buckets)
        self.clock = clock
        self.lock = Lock()
        self.buckets: dict[str, dict[str, float]] = {}
        self.checks = 0

    def check(self, key: str) -> bool:
        now = self.clock()
        with self.lock:
            self.checks += 1
            if self.checks % 100 == 0 or len(self.buckets) >= self.max_buckets:
                self._evict(now)
            bucket = self.buckets.get(key, {"count": 0, "reset_at": now + self.window_seconds})
            if bucket["reset_at"] <= now:
                bucket = {"count": 0, "reset_at": now + self.window_seconds}
            bucket["count"] += 1
            self.buckets[key] = bucket
            return bucket["count"] <= self.max_requests

    def _evict(self, now: float) -> None:
        expired = [key for key, bucket in self.buckets.items() if bucket["reset_at"] <= now]
        for key in expired:
            self.buckets.pop(key, None)
        overflow = len(self.buckets) - self.max_buckets + 1
        if overflow > 0:
            oldest = sorted(self.buckets, key=lambda key: self.buckets[key]["reset_at"])
            for key in oldest[:overflow]:
                self.buckets.pop(key, None)
