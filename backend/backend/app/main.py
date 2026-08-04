from __future__ import annotations

import asyncio
import ipaddress
import json
import re
import smtplib
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.datastructures import UploadFile

from . import config
from .chat_store import FileChatStore
from .knowledge_base import KnowledgeBase
from .models import ChatRequest, ChatResponse
from .openrouter_client import OpenRouterClient
from .prompt_builder import PromptBuilder
from .questionnaire_rules import build_direct_questionnaire_answer
from .rate_limiter import RateLimiter
from .request_mailer import MailConfigurationError, RequestAttachment, normalized_filename, send_request_email, validate_attachment
from .local_rag import LocalVectorRagRetriever
from .supabase_rag import SupabaseRagRetriever


app = FastAPI(title="RIK Website Chat API")

chat_store = FileChatStore(
    file_path=config.DATA_DIR / "chat-sessions.json",
    stats_path=config.DATA_DIR / "usage-stats.json",
    max_history_messages=config.MAX_HISTORY_MESSAGES,
    max_sessions=config.CHAT_MAX_SESSIONS,
    retention_seconds=config.CHAT_SESSION_RETENTION_SECONDS,
)
knowledge_base = KnowledgeBase(config.KNOWLEDGE_DIR, config.KNOWLEDGE_MAX_CHARS)
prompt_builder = PromptBuilder(config.PROMPT_PATH, knowledge_base)
openrouter = OpenRouterClient()
rag_retriever = SupabaseRagRetriever(openrouter)
local_rag_retriever = LocalVectorRagRetriever(openrouter)
rate_limiter = RateLimiter(
    config.RATE_LIMIT_WINDOW_SECONDS,
    config.RATE_LIMIT_MAX_REQUESTS,
    config.RATE_LIMIT_MAX_BUCKETS,
)
request_rate_limiter = RateLimiter(
    config.REQUEST_RATE_LIMIT_WINDOW_SECONDS,
    config.REQUEST_RATE_LIMIT_MAX_REQUESTS,
    config.RATE_LIMIT_MAX_BUCKETS,
)


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.post("/api/request")
async def submit_request(request: Request) -> JSONResponse:
    if not request_rate_limiter.check(f"request:{request_client_ip(request)}"):
        return JSONResponse({"ok": False, "error": "Слишком много заявок. Попробуйте позже."}, status_code=429)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > config.REQUEST_MAX_BODY_BYTES:
                return JSONResponse({"ok": False, "error": "Размер запроса превышает допустимый"}, status_code=413)
        except ValueError:
            return JSONResponse({"ok": False, "error": "Некорректный размер запроса"}, status_code=400)

    form = await request.form()
    fields: dict[str, str] = {}
    uploads: list[UploadFile] = []
    for key, value in form.multi_items():
        if isinstance(value, UploadFile):
            if value.filename:
                uploads.append(value)
        else:
            field_value = str(value).strip()
            if len(field_value) > config.REQUEST_MAX_FIELD_CHARS:
                return JSONResponse({"ok": False, "error": "Слишком длинное значение поля"}, status_code=422)
            fields[key] = field_value

    # Honeypot: bots receive a neutral success response without triggering e-mail.
    if fields.get("website"):
        return JSONResponse({"ok": True})

    required = ("name", "phone", "email")
    if any(not fields.get(name) for name in required) or "@" not in fields.get("email", ""):
        return JSONResponse({"ok": False, "error": "Заполните имя, телефон и корректный e-mail"}, status_code=422)
    if fields.get("consent") not in {"on", "true", "1", "yes"}:
        return JSONResponse({"ok": False, "error": "Требуется согласие на обработку данных"}, status_code=422)
    if len(uploads) > config.REQUEST_MAX_FILES:
        return JSONResponse({"ok": False, "error": "Слишком много файлов"}, status_code=413)

    attachments: list[RequestAttachment] = []
    total_size = 0
    try:
        for upload in uploads:
            filename = normalized_filename(upload.filename or "attachment")
            validate_attachment(filename)
            chunks: list[bytes] = []
            file_size = 0
            while chunk := await upload.read(64 * 1024):
                file_size += len(chunk)
                total_size += len(chunk)
                if file_size > config.REQUEST_MAX_FILE_BYTES or total_size > config.REQUEST_MAX_TOTAL_BYTES:
                    return JSONResponse({"ok": False, "error": "Размер файлов превышает допустимый"}, status_code=413)
                chunks.append(chunk)
            content = b"".join(chunks)
            content_type = validate_attachment(filename, content)
            attachments.append(RequestAttachment(filename, content_type, content))
    except ValueError as error:
        return JSONResponse({"ok": False, "error": str(error)}, status_code=415)
    finally:
        for upload in uploads:
            await upload.close()

    try:
        await asyncio.to_thread(send_request_email, fields, attachments)
    except MailConfigurationError:
        return JSONResponse({"ok": False, "error": "Сервис отправки заявок не настроен"}, status_code=503)
    except (OSError, smtplib.SMTPException):
        return JSONResponse({"ok": False, "error": "Не удалось отправить заявку"}, status_code=502)

    return JSONResponse({"ok": True, "recipient": "zakaz@rik-vent.ru"})


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> JSONResponse:
    session_id = normalize_session_id(payload.sessionId)
    message = normalize_message(payload.message)

    if not message:
        response = ChatResponse(answer="Напишите сообщение, и я постараюсь помочь.", sessionId=session_id)
        return JSONResponse(
            response_to_dict(response)
        )

    if not rate_limiter.check(rate_limit_key(request, session_id)):
        response = ChatResponse(answer=config.CHAT_FALLBACK_MESSAGE, sessionId=session_id)
        return JSONResponse(
            response_to_dict(response),
            status_code=429,
        )

    history = request_history(payload, session_id)
    direct_answer = build_direct_questionnaire_answer(message)
    if direct_answer:
        chat_store.append(session_id, "user", message)
        chat_store.append(session_id, "assistant", direct_answer)
        chat_store.increment_successful_answers("rule:questionnaire")
        response = ChatResponse(answer=direct_answer, sessionId=session_id, model="rule:questionnaire")
        return JSONResponse(response_to_dict(response))

    rag_context, sources = await retrieve_rag_context(message)
    messages = prompt_builder.build_messages(
        message,
        history,
        payload.pageUrl,
        knowledge_override=rag_context or None,
    )

    chat_store.append(session_id, "user", message)
    result = await openrouter.complete(messages)

    if result.ok:
        chat_store.append(session_id, "assistant", result.answer)
        chat_store.increment_successful_answers(result.model)

    response = ChatResponse(answer=result.answer, sessionId=session_id, model=result.model, sources=sources)
    return JSONResponse(response_to_dict(response))


@app.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    session_id = normalize_session_id(payload.sessionId)
    message = normalize_message(payload.message)

    async def events():
        if not message:
            yield sse("message", {"delta": "Напишите сообщение, и я постараюсь помочь."})
            yield sse("done", {"sessionId": session_id, "model": None})
            return

        if not rate_limiter.check(rate_limit_key(request, session_id)):
            yield sse("message", {"delta": config.CHAT_FALLBACK_MESSAGE})
            yield sse("done", {"sessionId": session_id, "model": None})
            return

        history = request_history(payload, session_id)
        direct_answer = build_direct_questionnaire_answer(message)
        if direct_answer:
            chat_store.append(session_id, "user", message)
            chat_store.append(session_id, "assistant", direct_answer)
            chat_store.increment_successful_answers("rule:questionnaire")
            yield sse("message", {"delta": direct_answer})
            yield sse("done", {"sessionId": session_id, "model": "rule:questionnaire", "sources": []})
            return

        rag_context, sources = await retrieve_rag_context(message)
        messages = prompt_builder.build_messages(
            message,
            history,
            payload.pageUrl,
            knowledge_override=rag_context or None,
        )
        chat_store.append(session_id, "user", message)

        full_answer = ""
        used_model: str | None = None

        def set_model(model: str) -> None:
            nonlocal used_model
            used_model = model

        async for delta, model in openrouter.stream(messages, on_model=set_model):
            if model:
                used_model = model
            full_answer += delta
            yield sse("message", {"delta": delta})

        if used_model and full_answer != config.CHAT_FALLBACK_MESSAGE:
            chat_store.append(session_id, "assistant", full_answer)
            chat_store.increment_successful_answers(used_model)

        yield sse("done", {"sessionId": session_id, "model": used_model, "sources": [response_to_dict(source) for source in sources]})

    return StreamingResponse(events(), media_type="text/event-stream")


def normalize_session_id(value: str | None) -> str:
    if value and re.fullmatch(r"[a-zA-Z0-9_-]{12,80}", value):
        return value
    return str(uuid.uuid4())


def normalize_message(value: str) -> str:
    return value.strip()[: config.MAX_MESSAGE_CHARS]


def rate_limit_key(request: Request, session_id: str) -> str:
    del session_id
    return f"chat:{request_client_ip(request)}"


def request_client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "127.0.0.1"
    try:
        peer_ip = ipaddress.ip_address(peer)
    except ValueError:
        return "invalid"

    if str(peer_ip) not in config.TRUSTED_PROXY_IPS:
        return str(peer_ip)

    forwarded = request.headers.get("x-forwarded-for", "")
    for raw_value in reversed(forwarded.split(",")):
        candidate = raw_value.strip()
        if not candidate:
            continue
        try:
            candidate_ip = ipaddress.ip_address(candidate)
        except ValueError:
            continue
        if str(candidate_ip) not in config.TRUSTED_PROXY_IPS:
            return str(candidate_ip)
    return str(peer_ip)


def request_history(payload: ChatRequest, session_id: str) -> list[dict[str, str]]:
    if payload.history:
        return [
            {"role": item.role, "content": item.content}
            for item in payload.history[-config.MAX_HISTORY_MESSAGES :]
            if item.role in {"user", "assistant"} and item.content
        ]
    return chat_store.get_history(session_id)


async def retrieve_rag_context(message: str) -> tuple[str, list]:
    # Каскад: Supabase (если настроен) -> локальный векторный индекс -> ""
    # (пустой контекст дальше уходит в keyword-поиск KnowledgeBase).
    for retriever in (rag_retriever, local_rag_retriever):
        if not retriever.enabled:
            continue
        try:
            result = await retriever.retrieve(message)
            if result.context:
                return result.context, result.sources
        except Exception as error:
            print(f"RAG retrieval failed ({type(retriever).__name__}): {error}")
    return "", []


def sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def response_to_dict(response) -> dict[str, object]:
    if hasattr(response, "model_dump"):
        return response.model_dump()
    return response.dict()
