from __future__ import annotations

import re


FAN_LINK = "/downloads/oprosny-list-ventilyator.xlsx"
CENTRAL_AC_LINK = "/downloads/oprosny-list-centralny-konditsioner.xlsx"

SELECTION_FALLBACK = """Для точного подбора лучше оформить расчет — пришлите, пожалуйста:
- что нужно подобрать (тип оборудования, расход воздуха, назначение);
- есть ли ТЗ, спецификация или проект;
- контакт для связи (телефон / email).

Менеджер или инженер РИК свяжется с расчетом."""

FAN_PATTERNS = [
    r"\bвентилятор",
    r"\bвентилятор[а-яё]*",
    r"\bkrv\b",
    r"\bkrv-v\b",
    r"\bkrv-du\b",
    r"\bкрв\b",
    r"\brop\b",
    r"\bроп\b",
    r"\brr\b",
    r"\bwrn\b",
    r"\bканальн[а-яё]*\s+вент",
    r"\bкрышн[а-яё]*\s+вент",
    r"\bрадиальн[а-яё]*\s+вент",
]

CENTRAL_AC_PATTERNS = [
    r"\bкондиционер",
    r"\bкондиционер[а-яё]*",
    r"\bкондиционировани[а-яё]*",
    r"\bцентральн[а-яё]*\s+кондиционер",
    r"\bцентральн[а-яё]*\s+установ",
    r"\bцк\b",
    r"\brik-m\b",
    r"\brik-s\b",
    r"\bприточн[а-яё]*\s+установ",
    r"\bприточно-вытяжн[а-яё]*\s+установ",
]

# Намерение подбора/заказа — гейт для детерминированного ответа по «прочему» оборудованию
SELECTION_INTENT_PATTERNS = [
    r"\bподбор",
    r"\bподобрать",
    r"\bподберите",
    r"\bзаказ",
    r"\bкупить",
    r"\bстоимост",
    r"\bцен[аыу]\b",
    r"\bрасчет",
    r"\bрассчита",
    r"\bопросн",
    r"\bкоммерческое предложение",
    r"\bкп\b",
]

OTHER_EQUIPMENT_PATTERNS = [
    r"\bклапан",
    r"\bвоздуховод",
    r"\bрешетк",
    r"\bдиффузор",
    r"\bшумоглушител",
    r"\bфильтр",
    r"\bкалорифер",
    r"\bохладител",
    r"\bнагревател",
    r"\bувлажнител",
    r"\bосушител",
    r"\bрекуператор",
    r"\bтеплоутилизатор",
    r"\bтеплообменник",
    r"\bчиллер",
]


def build_questionnaire_context(message: str) -> str:
    normalized = _normalize(message)
    blocks: list[str] = []

    if _matches(normalized, FAN_PATTERNS):
        blocks.append(
            "ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ДЛЯ ЭТОГО ЗАПРОСА: пользователь спрашивает про вентиляторы. "
            "В ответе обязательно дай ссылку отдельной markdown-кнопкой: "
            f"[Скачать опросный лист на вентилятор]({FAN_LINK}). "
            "Не говори, что конкретной ссылки нет."
        )

    if _matches(normalized, CENTRAL_AC_PATTERNS):
        blocks.append(
            "ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ДЛЯ ЭТОГО ЗАПРОСА: пользователь спрашивает про центральный кондиционер / ЦК. "
            "В ответе обязательно дай ссылку отдельной markdown-кнопкой: "
            f"[Скачать опросный лист на центральный кондиционер]({CENTRAL_AC_LINK}). "
            "Не говори, что конкретной ссылки нет."
        )

    if not blocks and _matches(normalized, OTHER_EQUIPMENT_PATTERNS):
        blocks.append(
            "ПРАВИЛО ДЛЯ ЭТОГО ЗАПРОСА: для этого типа оборудования отдельный опросный лист не задан. "
            "Дай краткую информацию по оборудованию и затем отправь этот текст без изменений:\n\n"
            f"{SELECTION_FALLBACK}"
        )

    return "\n\n".join(blocks)


def build_direct_questionnaire_answer(message: str) -> str | None:
    normalized = _normalize(message)

    # Детерминированный ответ-опросник — только при явном намерении подбора/заказа.
    # Информационные вопросы («что такое KRV-DU», «до какой температуры работает»)
    # уходят в RAG: по вентиляторам и ЦК в знаниях есть страницы с характеристиками,
    # а build_questionnaire_context всё равно добавит LLM ссылку на опросный лист.
    if not _matches(normalized, SELECTION_INTENT_PATTERNS):
        return None

    if _matches(normalized, FAN_PATTERNS):
        return (
            "Для подбора вентилятора лучше заполнить опросный лист: там инженер увидит расход воздуха, давление, "
            "условия работы и ограничения по монтажу.\n\n"
            f"[Скачать опросный лист на вентилятор]({FAN_LINK})\n\n"
            "Если уже есть ТЗ, спецификация или проект, можно приложить их вместе с листом — так расчет получится точнее."
        )

    if _matches(normalized, CENTRAL_AC_PATTERNS):
        return (
            "У РИК есть центральные кондиционеры / центральные установки RIK-M и RIK-S. "
            "Для подбора лучше заполнить опросный лист: по нему инженер сможет корректно учесть расход воздуха, "
            "состав секций, режимы и требования к объекту.\n\n"
            f"[Скачать опросный лист на центральный кондиционер]({CENTRAL_AC_LINK})\n\n"
            "Если есть ТЗ, спецификация или проект, приложите их вместе с листом — это ускорит расчет."
        )

    # Для «прочего» оборудования детерминированный ответ даём только при явном
    # намерении подбора/заказа. Информационные вопросы («какие бывают», «что такое»)
    # уходят в RAG — там теперь есть знания по ППК/КГВ/RAN и т.д.
    if _matches(normalized, OTHER_EQUIPMENT_PATTERNS) and _matches(normalized, SELECTION_INTENT_PATTERNS):
        return (
            "По этому оборудованию лучше уточнить задачу и параметры, чтобы инженер мог подобрать решение без ошибок.\n\n"
            f"{SELECTION_FALLBACK}"
        )

    return None


def _normalize(value: str) -> str:
    return value.casefold().replace("ё", "е")


def _matches(value: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, value, flags=re.IGNORECASE) for pattern in patterns)
