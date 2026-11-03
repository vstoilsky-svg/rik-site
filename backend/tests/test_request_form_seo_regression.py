"""Регрессия: заявка принимается без имени, но только с полным телефоном."""

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import main
from backend.app.rate_limiter import RateLimiter


class RequestFormSeoRegressionTests(unittest.TestCase):
    def setUp(self) -> None:
        main.request_rate_limiter = RateLimiter(600, 20, 100)
        self.client = TestClient(main.app)

    @patch("backend.app.main.send_request_email")
    def test_empty_name_with_masked_phone_is_accepted(self, send_mail) -> None:
        response = self.client.post(
            "/api/request",
            data={"name": "", "phone": "+7 (999) 123-45-67", "consent": "true"},
        )
        self.assertEqual(response.status_code, 200)
        send_mail.assert_called_once()

    @patch("backend.app.main.send_request_email")
    def test_compact_phone_remains_compatible(self, send_mail) -> None:
        response = self.client.post(
            "/api/request",
            data={"phone": "+79991234567", "consent": "true"},
        )
        self.assertEqual(response.status_code, 200)
        send_mail.assert_called_once()

    @patch("backend.app.main.send_request_email")
    def test_incomplete_phone_is_rejected_without_mail(self, send_mail) -> None:
        response = self.client.post(
            "/api/request",
            data={"phone": "+7 (999) 12", "consent": "true"},
        )
        self.assertEqual(response.status_code, 422)
        send_mail.assert_not_called()

    @patch("backend.app.main.send_request_email")
    def test_phone_without_plus_is_rejected_without_mail(self, send_mail) -> None:
        response = self.client.post(
            "/api/request",
            data={"phone": "89991234567", "consent": "true"},
        )
        self.assertEqual(response.status_code, 422)
        send_mail.assert_not_called()


if __name__ == "__main__":
    unittest.main()
