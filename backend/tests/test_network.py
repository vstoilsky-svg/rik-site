import os
import unittest
from unittest.mock import patch

from starlette.requests import Request

from backend.app import config, main


def make_request(peer: str, forwarded: str | None = None) -> Request:
    headers = []
    if forwarded is not None:
        headers.append((b"x-forwarded-for", forwarded.encode("ascii")))
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/chat",
        "headers": headers,
        "client": (peer, 12345),
        "server": ("test", 80),
        "scheme": "http",
        "query_string": b"",
    }
    return Request(scope)


class NetworkIdentityTests(unittest.TestCase):
    def test_blank_trusted_proxy_setting_uses_safe_default(self) -> None:
        with patch.dict(os.environ, {"TRUSTED_PROXY_IPS": ""}):
            self.assertEqual(
                config.env_csv("TRUSTED_PROXY_IPS", "127.0.0.1,::1"),
                ("127.0.0.1", "::1"),
            )

    def test_untrusted_peer_cannot_spoof_forwarded_header(self) -> None:
        request = make_request("203.0.113.5", "198.51.100.8")
        self.assertEqual(main.request_client_ip(request), "203.0.113.5")

    def test_trusted_proxy_uses_forwarded_client(self) -> None:
        request = make_request("127.0.0.1", "198.51.100.8")
        self.assertEqual(main.request_client_ip(request), "198.51.100.8")

    def test_session_id_does_not_change_rate_key(self) -> None:
        request = make_request("203.0.113.5")
        self.assertEqual(main.rate_limit_key(request, "session-one"), main.rate_limit_key(request, "session-two"))


if __name__ == "__main__":
    unittest.main()
