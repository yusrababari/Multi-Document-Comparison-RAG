import unittest

from app import build_chat_response


class ChatResponseTests(unittest.TestCase):
    def test_returns_fallback_answer_when_no_rag_store_available(self):
        result = build_chat_response("What is this document about?", None)

        self.assertEqual(result["status"], "ok")
        self.assertIn("fallback", result["answer"].lower())
        self.assertIn("document", result["answer"].lower())


if __name__ == "__main__":
    unittest.main()
