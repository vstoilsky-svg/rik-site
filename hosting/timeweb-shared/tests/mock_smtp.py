from __future__ import annotations

import argparse
import json
import socket
import socketserver
import ssl
from pathlib import Path


class State:
    auth_used = False
    mail_from = ""
    recipient = ""
    message = b""


class SmtpHandler(socketserver.StreamRequestHandler):
    def reply(self, value: bytes) -> None:
        self.wfile.write(value + b"\r\n")
        self.wfile.flush()

    def handle(self) -> None:
        self.reply(b"220 mock-smtp ESMTP")
        while True:
            raw = self.rfile.readline(8192)
            if not raw:
                return
            command = raw.rstrip(b"\r\n")
            upper = command.upper()
            if upper.startswith(b"EHLO "):
                self.wfile.write(b"250-mock-smtp\r\n250-AUTH LOGIN\r\n250 SIZE 40000000\r\n")
                self.wfile.flush()
            elif upper == b"AUTH LOGIN":
                self.reply(b"334 VXNlcm5hbWU6")
                username = self.rfile.readline(8192).strip()
                self.reply(b"334 UGFzc3dvcmQ6")
                password = self.rfile.readline(8192).strip()
                if not username or not password:
                    self.reply(b"535 authentication failed")
                    continue
                State.auth_used = True
                self.reply(b"235 authentication successful")
            elif upper.startswith(b"MAIL FROM:"):
                State.mail_from = command.decode("utf-8", "replace")
                self.reply(b"250 sender accepted")
            elif upper.startswith(b"RCPT TO:"):
                State.recipient = command.decode("utf-8", "replace")
                self.reply(b"250 recipient accepted")
            elif upper == b"DATA":
                self.reply(b"354 end with <CRLF>.<CRLF>")
                chunks: list[bytes] = []
                while True:
                    line = self.rfile.readline(1024 * 1024)
                    if line == b".\r\n" or not line:
                        break
                    chunks.append(line[1:] if line.startswith(b"..") else line)
                State.message = b"".join(chunks)
                self.reply(b"250 message accepted")
            elif upper == b"QUIT":
                self.reply(b"221 closing connection")
                return
            else:
                self.reply(b"500 unsupported command")


class TlsServer(socketserver.TCPServer):
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], context: ssl.SSLContext):
        self.ssl_context = context
        super().__init__(address, SmtpHandler)

    def get_request(self) -> tuple[socket.socket, tuple[str, int]]:
        connection, address = super().get_request()
        return self.ssl_context.wrap_socket(connection, server_side=True), address


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--cert", type=Path, required=True)
    parser.add_argument("--key", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(args.cert, args.key)
    with TlsServer((args.host, args.port), context) as server:
        server.handle_request()

    message_lower = State.message.lower()
    result = {
        "auth_used": State.auth_used,
        "mail_from_set": State.mail_from.startswith("MAIL FROM:<"),
        "recipient_set": State.recipient.startswith("RCPT TO:<"),
        "message_bytes": len(State.message),
        "has_subject": b"subject:" in message_lower,
        "has_from": b"from:" in message_lower,
        "has_to": b"to:" in message_lower,
        "has_multipart": b"multipart/mixed" in message_lower,
    }
    args.output.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
