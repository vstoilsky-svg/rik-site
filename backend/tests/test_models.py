import unittest

from pydantic import ValidationError

from backend.app.models import ChatRequest


class ChatRequestTests(unittest.TestCase):
    def test_history_is_bounded(self) -> None:
        history = [{"role": "user", "content": "ok"}] * 21
        with self.assertRaises(ValidationError):
            ChatRequest(message="hello", history=history)

    def test_roles_are_restricted(self) -> None:
        with self.assertRaises(ValidationError):
            ChatRequest(message="hello", history=[{"role": "system", "content": "bad"}])

    def test_metadata_values_are_bounded(self) -> None:
        with self.assertRaises(ValidationError):
            ChatRequest(message="hello", metadata={"key": "x" * 501})


if __name__ == "__main__":
    unittest.main()
