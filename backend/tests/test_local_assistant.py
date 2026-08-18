import unittest

from backend.app.local_assistant import LOCAL_KNOWLEDGE_MODEL, local_knowledge_answer


class LocalAssistantTests(unittest.TestCase):
    def test_core_questions_have_useful_answers(self) -> None:
        cases = {
            "Что производит РИК?": "/products",
            "Какие есть вентиляторы?": "/downloads/oprosny-list-ventilyator.xlsx",
            "Где сертификаты?": "/certificates",
            "Как связаться?": "+7 (495) 104-37-79",
            "Расскажите про RIK-M": "/product/centralnye-ustanovki",
            "Какие есть противопожарные клапаны?": "РИК-3",
        }
        for question, expected in cases.items():
            with self.subTest(question=question):
                self.assertIn(expected, local_knowledge_answer(question))

    def test_unknown_question_asks_for_product_marker(self) -> None:
        self.assertIn("маркировку", local_knowledge_answer("Помогите"))

    def test_model_name_is_stable(self) -> None:
        self.assertEqual(LOCAL_KNOWLEDGE_MODEL, "local:knowledge")


if __name__ == "__main__":
    unittest.main()
