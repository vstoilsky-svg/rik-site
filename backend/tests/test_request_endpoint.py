import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import main
from backend.app.rate_limiter import RateLimiter


class RequestEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        main.request_rate_limiter = RateLimiter(600, 20, 100)
        self.client = TestClient(main.app)
        self.form = {
            "name": "Test",
            "phone": "+70000000000",
            "email": "test@example.com",
            "consent": "true",
        }

    @patch("backend.app.main.send_request_email")
    def test_disguised_upload_is_rejected_before_mail(self, send_mail) -> None:
        response = self.client.post(
            "/api/request",
            data=self.form,
            files={"file": ("drawing.pdf", b"PK\x03\x04not-a-pdf", "application/pdf")},
        )
        self.assertEqual(response.status_code, 415)
        send_mail.assert_not_called()

    @patch("backend.app.main.send_request_email")
    def test_valid_pdf_is_forwarded(self, send_mail) -> None:
        response = self.client.post(
            "/api/request",
            data=self.form,
            files={"file": ("drawing.pdf", b"%PDF-1.7\ncontent", "application/pdf")},
        )
        self.assertEqual(response.status_code, 200)
        send_mail.assert_called_once()

    @patch("backend.app.main.send_request_email")
    def test_email_is_optional(self, send_mail) -> None:
        form = dict(self.form)
        form["email"] = ""
        response = self.client.post("/api/request", data=form)
        self.assertEqual(response.status_code, 200)
        send_mail.assert_called_once()

    @patch("backend.app.main.send_request_email")
    def test_invalid_optional_email_is_rejected(self, send_mail) -> None:
        form = dict(self.form)
        form["email"] = "invalid"
        response = self.client.post("/api/request", data=form)
        self.assertEqual(response.status_code, 422)
        send_mail.assert_not_called()


if __name__ == "__main__":
    unittest.main()
