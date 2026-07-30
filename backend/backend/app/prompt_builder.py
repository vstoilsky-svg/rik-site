from __future__ import annotations

from pathlib import Path

from .knowledge_base import KnowledgeBase
from .questionnaire_rules import build_questionnaire_context


class PromptBuilder:
    def __init__(self, system_prompt_path: Path, knowledge_base: KnowledgeBase) -> None:
        self.system_prompt_path = system_prompt_path
        self.knowledge_base = knowledge_base

    def build_messages(
        self,
        user_message: str,
        history: list[dict[str, str]],
        page_url: str | None,
        knowledge_override: str | None = None,
    ) -> list[dict[str, str]]:
        system_prompt = self.system_prompt_path.read_text(encoding="utf-8").strip()
        knowledge = knowledge_override if knowledge_override is not None else self.knowledge_base.get_relevant(user_message)
        questionnaire_context = build_questionnaire_context(user_message)
        questionnaire_block = (
            f"\n\nMandatory questionnaire/download rule for the current user message:\n{questionnaire_context}"
            if questionnaire_context
            else ""
        )
        knowledge_context = (
            f"\n\nProject knowledge snippets:\n{knowledge}"
            if knowledge
            else "\n\nNo relevant project knowledge was found. Do not invent project facts."
        )
        page_context = f"\n\nCurrent page URL: {page_url}" if page_url else ""

        messages = [{"role": "system", "content": f"{system_prompt}{questionnaire_block}{knowledge_context}{page_context}"}]
        messages.extend(self._sanitize_history(history))
        messages.append({"role": "user", "content": user_message})
        return messages

    @staticmethod
    def _sanitize_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
        clean: list[dict[str, str]] = []
        for item in history:
            role = item.get("role")
            content = str(item.get("content", ""))[:3000]
            if role in {"user", "assistant"} and content:
                clean.append({"role": role, "content": content})
        return clean
