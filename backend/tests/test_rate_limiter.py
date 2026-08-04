import unittest

from backend.app.rate_limiter import RateLimiter


class RateLimiterTests(unittest.TestCase):
    def test_limit_and_expiry(self) -> None:
        now = [100.0]
        limiter = RateLimiter(10, 2, clock=lambda: now[0])
        self.assertTrue(limiter.check("client"))
        self.assertTrue(limiter.check("client"))
        self.assertFalse(limiter.check("client"))
        now[0] = 111.0
        self.assertTrue(limiter.check("client"))

    def test_bucket_count_is_bounded(self) -> None:
        limiter = RateLimiter(60, 1, max_buckets=3, clock=lambda: 10.0)
        for index in range(20):
            limiter.check(f"client-{index}")
        self.assertLessEqual(len(limiter.buckets), 3)


if __name__ == "__main__":
    unittest.main()
