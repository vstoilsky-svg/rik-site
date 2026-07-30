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


def validate_attachment(filename: str) -> None:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Недопустимый тип файла: {extension or 'без расширения'}")


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
