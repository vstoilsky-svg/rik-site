import unittest

from backend.app.request_mailer import normalized_filename, validate_attachment


class RequestMailerTests(unittest.TestCase):
    def test_pdf_signature_is_accepted(self) -> None:
        self.assertEqual(validate_attachment("drawing.pdf", b"%PDF-1.7\n"), "application/pdf")

    def test_mismatched_signature_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            validate_attachment("drawing.pdf", b"PK\x03\x04not-a-pdf")

    def test_filename_is_reduced_to_basename(self) -> None:
        self.assertEqual(normalized_filename("../folder/drawing.pdf"), "drawing.pdf")


if __name__ == "__main__":
    unittest.main()
