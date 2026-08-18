import unittest

from pydantic import ValidationError

from backend.app import config
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

    def test_legacy_chat_fallback_is_replaced_with_honest_provider_error(self) -> None:
        self.assertEqual(
            config.resolve_chat_fallback_message(config.LEGACY_CHAT_FALLBACK_MESSAGE),
            config.DEFAULT_CHAT_FALLBACK_MESSAGE,
        )

    def test_custom_chat_fallback_is_preserved(self) -> None:
        self.assertEqual(config.resolve_chat_fallback_message("custom message"), "custom message")


if __name__ == "__main__":
    unittest.main()
