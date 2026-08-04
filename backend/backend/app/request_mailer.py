from __future__ import annotations

import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path

from . import config


ALLOWED_EXTENSIONS = {
    ".pdf", ".xls", ".xlsx", ".doc", ".docx", ".dwg", ".dxf", ".rvt",
    ".ifc", ".jpg", ".jpeg", ".png", ".zip", ".rar", ".7z",
}

CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".dwg": "image/vnd.dwg",
    ".dxf": "image/vnd.dxf",
    ".rvt": "application/octet-stream",
    ".ifc": "application/x-step",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".zip": "application/zip",
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed",
}


@dataclass(frozen=True)
class RequestAttachment:
    filename: str
    content_type: str
    content: bytes


class MailConfigurationError(RuntimeError):
    pass


def safe_header(value: str, limit: int = 200) -> str:
    return " ".join(value.replace("\r", " ").replace("\n", " ").split())[:limit]


def normalized_filename(value: str) -> str:
    return safe_header(Path(value or "attachment").name, 180) or "attachment"


def validate_attachment(filename: str, content: bytes | None = None) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Недопустимый тип файла: {extension or 'без расширения'}")
    if content is not None and not _signature_matches(extension, content[:4096]):
        raise ValueError(f"Содержимое файла не соответствует расширению: {extension}")
    return CONTENT_TYPES[extension]


def _signature_matches(extension: str, head: bytes) -> bool:
    if not head:
        return False
    signatures = {
        ".pdf": (b"%PDF-",),
        ".png": (b"\x89PNG\r\n\x1a\n",),
        ".jpg": (b"\xff\xd8\xff",),
        ".jpeg": (b"\xff\xd8\xff",),
        ".zip": (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"),
        ".docx": (b"PK\x03\x04",),
        ".xlsx": (b"PK\x03\x04",),
        ".rar": (b"Rar!\x1a\x07",),
        ".7z": (b"7z\xbc\xaf\x27\x1c",),
        ".doc": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
        ".xls": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
        ".rvt": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
        ".dwg": (b"AC10",),
    }
    if extension in signatures:
        return any(head.startswith(signature) for signature in signatures[extension])
    normalized = head.lstrip().upper()
    if extension == ".dxf":
        return normalized.startswith(b"0") and b"SECTION" in normalized
    if extension == ".ifc":
        return normalized.startswith(b"ISO-10303-21")
    return False


def send_request_email(fields: dict[str, str], attachments: list[RequestAttachment]) -> None:
    if not config.SMTP_HOST or not config.SMTP_FROM:
        raise MailConfigurationError("SMTP is not configured")

    kind = fields.get("form_kind", "request-calculation")
    subject_prefix = "Проект с сайта РИК" if kind == "send-project" else "Запрос расчёта с сайта РИК"
    sender_name = safe_header(fields.get("name", "Без имени"))

    message = EmailMessage()
    message["Subject"] = f"{subject_prefix}: {sender_name}"
    message["From"] = config.SMTP_FROM
    message["To"] = config.REQUEST_RECIPIENT
    reply_to = safe_header(fields.get("email", ""))
    if reply_to:
        message["Reply-To"] = reply_to

    labels = (
        ("Форма", "Отправить проект" if kind == "send-project" else "Запросить расчёт"),
        ("Имя", fields.get("name", "")),
        ("Компания", fields.get("company", "")),
        ("Телефон", fields.get("phone", "")),
        ("E-mail", fields.get("email", "")),
        ("Комментарий", fields.get("comment", "")),
    )
    body = "\n".join(f"{label}: {value.strip() or '—'}" for label, value in labels)
    message.set_content(body)

    for attachment in attachments:
        content_type = attachment.content_type if "/" in attachment.content_type else "application/octet-stream"
        maintype, subtype = content_type.split("/", 1)
        message.add_attachment(
            attachment.content,
            maintype=maintype,
            subtype=subtype,
            filename=normalized_filename(attachment.filename),
        )

    if config.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, timeout=30, context=ssl.create_default_context()) as client:
            _authenticate_and_send(client, message)
        return

    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=30) as client:
        client.ehlo()
        if config.SMTP_USE_TLS:
            client.starttls(context=ssl.create_default_context())
            client.ehlo()
        _authenticate_and_send(client, message)


def _authenticate_and_send(client: smtplib.SMTP, message: EmailMessage) -> None:
    if config.SMTP_USERNAME:
        client.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
    client.send_message(message)
