from __future__ import annotations

import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]


def load_env(path: Path = ROOT_DIR / ".env") -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip().lstrip("\ufeff")
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        os.environ.setdefault(key, value)


load_env()


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


def env_bool(name: str, default: bool) -> bool:
    configured = os.getenv(name)
    if configured is None:
        return default
    return configured.strip().lower() in {"1", "true", "yes", "on"}


def env_csv(name: str, default: str = "") -> tuple[str, ...]:
    configured = os.getenv(name, "").strip()
    source = configured or default
    return tuple(value.strip() for value in source.split(",") if value.strip())


LEGACY_CHAT_FALLBACK_MESSAGE = "Сейчас я немного перегружен. Попробуйте написать чуть позже."
DEFAULT_CHAT_FALLBACK_MESSAGE = (
    "Чат-ассистент временно недоступен: внешний ИИ-провайдер отклонил запрос с сервера сайта. "
    "Попробуйте позже или отправьте заявку через «Запросить расчёт»."
)


def resolve_chat_fallback_message(configured: str | None) -> str:
    message = (configured or "").strip()
    if not message or message == LEGACY_CHAT_FALLBACK_MESSAGE:
        return DEFAULT_CHAT_FALLBACK_MESSAGE
    return message


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODELS = [
    model.strip()
    for model in os.getenv("OPENROUTER_MODELS", "").split(",")
    if model.strip()
]
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "")
OPENROUTER_TIMEOUT_SECONDS = env_float("OPENROUTER_TIMEOUT_SECONDS", 45.0)
OPENROUTER_TEMPERATURE = env_float("OPENROUTER_TEMPERATURE", 0.6)

MAX_HISTORY_MESSAGES = env_int("MAX_HISTORY_MESSAGES", 20)
MAX_MESSAGE_CHARS = env_int("MAX_MESSAGE_CHARS", 3000)
KNOWLEDGE_MAX_CHARS = env_int("KNOWLEDGE_MAX_CHARS", 12000)
RATE_LIMIT_WINDOW_SECONDS = env_int("RATE_LIMIT_WINDOW_SECONDS", 60)
RATE_LIMIT_MAX_REQUESTS = env_int("RATE_LIMIT_MAX_REQUESTS", 20)
RATE_LIMIT_MAX_BUCKETS = env_int("RATE_LIMIT_MAX_BUCKETS", 10000)
TRUSTED_PROXY_IPS = env_csv("TRUSTED_PROXY_IPS", "127.0.0.1,::1")
CHAT_SESSION_RETENTION_SECONDS = env_int("CHAT_SESSION_RETENTION_SECONDS", 7 * 24 * 60 * 60)
CHAT_MAX_SESSIONS = env_int("CHAT_MAX_SESSIONS", 5000)
CHAT_FALLBACK_MESSAGE = resolve_chat_fallback_message(os.getenv("CHAT_FALLBACK_MESSAGE"))
CHAT_FORCE_LOCAL = env_bool("CHAT_FORCE_LOCAL", False)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
RAG_TOP_K = env_int("RAG_TOP_K", 8)
RAG_SIMILARITY_THRESHOLD = env_float("RAG_SIMILARITY_THRESHOLD", 0.25)
RAG_MAX_CONTEXT_CHARS = env_int("RAG_MAX_CONTEXT_CHARS", 12000)
RAG_NAMESPACE = os.getenv("RAG_NAMESPACE", "site")
RAG_EMBEDDING_PROVIDER = os.getenv("RAG_EMBEDDING_PROVIDER", "openrouter")
RAG_EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "openai/text-embedding-3-small")
RAG_EMBEDDING_DIMENSIONS = env_int("RAG_EMBEDDING_DIMENSIONS", 1536)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = env_int("SMTP_PORT", 587)
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USERNAME)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").strip().lower() in {"1", "true", "yes", "on"}
REQUEST_RECIPIENT = os.getenv("REQUEST_RECIPIENT", "zakaz@rik-vent.ru")
REQUEST_MAX_FILES = env_int("REQUEST_MAX_FILES", 10)
REQUEST_MAX_TOTAL_BYTES = env_int("REQUEST_MAX_TOTAL_BYTES", 25 * 1024 * 1024)
REQUEST_MAX_FILE_BYTES = env_int("REQUEST_MAX_FILE_BYTES", 15 * 1024 * 1024)
REQUEST_MAX_BODY_BYTES = env_int("REQUEST_MAX_BODY_BYTES", 30 * 1024 * 1024)
REQUEST_MAX_FIELD_CHARS = env_int("REQUEST_MAX_FIELD_CHARS", 5000)
REQUEST_RATE_LIMIT_WINDOW_SECONDS = env_int("REQUEST_RATE_LIMIT_WINDOW_SECONDS", 10 * 60)
REQUEST_RATE_LIMIT_MAX_REQUESTS = env_int("REQUEST_RATE_LIMIT_MAX_REQUESTS", 5)

PROMPT_PATH = ROOT_DIR / "prompts" / "system.md"
KNOWLEDGE_DIR = ROOT_DIR / "knowledge"
DATA_DIR = ROOT_DIR / "data"
