#!/usr/bin/env python3
"""Poll Timeweb for chat jobs and answer them through an allowlisted inference API."""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any


def log(message: str) -> None:
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"{stamp} {message}", flush=True)


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Required environment variable is missing: {name}")
    return value


def request_json(
    url: str,
    *,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 30,
) -> tuple[int, dict[str, Any]]:
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request_headers = {
        "Accept": "application/json",
        "User-Agent": "RIK-local-chat-worker/1.0",
        **(headers or {}),
    }
    if body is not None:
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=request_headers, method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read(1_000_001)
            if len(raw) > 1_000_000:
                raise RuntimeError("Response exceeds 1 MB")
            if not raw:
                return response.status, {}
            decoded = json.loads(raw.decode("utf-8"))
            return response.status, decoded if isinstance(decoded, dict) else {}
    except urllib.error.HTTPError as error:
        raw = error.read(16_384)
        try:
            decoded = json.loads(raw.decode("utf-8")) if raw else {}
        except (UnicodeDecodeError, json.JSONDecodeError):
            decoded = {}
        return error.code, decoded if isinstance(decoded, dict) else {}


class Worker:
    def __init__(self) -> None:
        self.relay_base = required_env("RIK_CHAT_WORKER_BASE_URL").rstrip("/")
        self.relay_token = required_env("RIK_CHAT_WORKER_TOKEN")
        self.inference_base = os.environ.get("RIK_CHAT_INFERENCE_BASE_URL", "http://127.0.0.1:18088/v1").rstrip("/")
        self.inference_key = os.environ.get("RIK_CHAT_INFERENCE_API_KEY", "").strip()
        configured_models = os.environ.get("RIK_CHAT_INFERENCE_MODELS", "Qwen2.5-3B-Instruct-Q4_K_M")
        self.models = [item.strip() for item in configured_models.split(",") if item.strip()]
        if not self.models:
            raise RuntimeError("RIK_CHAT_INFERENCE_MODELS has no usable model")
        self.model_timeout_seconds = max(
            10.0,
            min(30.0, float(os.environ.get("RIK_CHAT_MODEL_TIMEOUT_SECONDS", "20"))),
        )
        self.poll_seconds = max(0.2, min(10.0, float(os.environ.get("RIK_CHAT_WORKER_POLL_SECONDS", "0.5"))))
        self.worker_id = os.environ.get("RIK_CHAT_WORKER_ID", socket.gethostname()).strip()[:80]
        self.worker_headers = {"X-RIK-Worker-Token": self.relay_token}

    def relay_url(self, endpoint: str) -> str:
        if self.relay_base.endswith("/index.php"):
            return f"{self.relay_base}?{urllib.parse.urlencode({'route': f'chat-worker/{endpoint}'})}"
        return f"{self.relay_base}/{endpoint}"

    def health(self) -> None:
        relay_status, relay = request_json(
            self.relay_url("health"),
            headers=self.worker_headers,
            timeout=15,
        )
        if relay_status != 200 or relay.get("ok") is not True:
            raise RuntimeError(f"Relay health failed: HTTP {relay_status}")
        inference_headers = {"Authorization": f"Bearer {self.inference_key}"} if self.inference_key else {}
        inference_status, inference = request_json(f"{self.inference_base}/models", headers=inference_headers, timeout=20)
        if inference_status != 200 or not isinstance(inference.get("data"), list) or not inference["data"]:
            raise RuntimeError(f"Inference health failed: HTTP {inference_status}")
        log(f"health PASS relay=200 inference=200 models={len(self.models)}")

    def claim(self) -> dict[str, Any] | None:
        status, response = request_json(
            self.relay_url("claim"),
            payload={"workerId": self.worker_id},
            headers=self.worker_headers,
            timeout=20,
        )
        if status == 204:
            return None
        if status != 200 or response.get("ok") is not True or not isinstance(response.get("job"), dict):
            raise RuntimeError(f"Relay claim failed: HTTP {status}")
        return response["job"]

    def infer(self, job: dict[str, Any]) -> tuple[str, str]:
        messages = job.get("messages")
        if not isinstance(messages, list) or not messages or len(messages) > 32:
            raise RuntimeError("Job messages are invalid")
        clean_messages: list[dict[str, str]] = []
        total_chars = 0
        for item in messages:
            if not isinstance(item, dict):
                raise RuntimeError("Job message item is invalid")
            role = str(item.get("role", ""))
            content = str(item.get("content", ""))
            if role not in {"system", "user", "assistant"} or not content:
                raise RuntimeError("Job message role/content is invalid")
            total_chars += len(content)
            if total_chars > 40_000:
                raise RuntimeError("Job context exceeds 40000 characters")
            clean_messages.append({"role": role, "content": content})

        inference_headers = {"Authorization": f"Bearer {self.inference_key}"} if self.inference_key else {}
        failures: list[str] = []
        for model in self.models:
            status, response = request_json(
                f"{self.inference_base}/chat/completions",
                headers=inference_headers,
                payload={
                    "model": model,
                    "messages": clean_messages,
                    "temperature": 0.2,
                    "top_p": 0.9,
                    "max_tokens": 500,
                    "stream": False,
                },
                timeout=self.model_timeout_seconds,
            )
            choices = response.get("choices")
            answer = ""
            if isinstance(choices, list) and choices and isinstance(choices[0], dict):
                message = choices[0].get("message")
                if isinstance(message, dict):
                    answer = str(message.get("content", "")).strip()
            if status == 200 and answer:
                reported_model = str(response.get("model") or model).strip()
                if reported_model and reported_model != "local:knowledge":
                    return answer[:12_000], reported_model[:120]
            failures.append(f"{model}:HTTP{status}")
        raise RuntimeError("Inference completion failed: " + ",".join(failures))

    def complete(self, job_id: str, *, ok: bool, answer: str = "", model: str = "") -> None:
        status, response = request_json(
            self.relay_url("complete"),
            payload={"jobId": job_id, "ok": ok, "answer": answer, "model": model},
            headers=self.worker_headers,
            timeout=20,
        )
        if status != 200 or response.get("ok") is not True:
            raise RuntimeError(f"Relay completion failed: HTTP {status}")

    def run_once(self) -> bool:
        job = self.claim()
        if job is None:
            return False
        job_id = str(job.get("jobId", ""))
        if len(job_id) != 32:
            raise RuntimeError("Relay returned an invalid jobId")
        log(f"claimed job={job_id}")
        try:
            answer, model = self.infer(job)
            self.complete(job_id, ok=True, answer=answer, model=model)
            log(f"completed job={job_id} model={model}")
        except Exception as error:  # keep the daemon alive; never log prompts or secrets
            log(f"failed job={job_id} reason={type(error).__name__}: {error}")
            try:
                self.complete(job_id, ok=False)
            except Exception as completion_error:
                log(f"failed to report job={job_id} reason={type(completion_error).__name__}")
        return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Process at most one queued job")
    parser.add_argument("--health", action="store_true", help="Check relay and llama.cpp, then exit")
    args = parser.parse_args()

    worker = Worker()
    if args.health:
        worker.health()
        return 0
    if args.once:
        worker.run_once()
        return 0

    worker.health()
    log(f"worker started id={worker.worker_id}")
    backoff = worker.poll_seconds
    while True:
        try:
            worked = worker.run_once()
            backoff = worker.poll_seconds
            if not worked:
                time.sleep(worker.poll_seconds)
        except KeyboardInterrupt:
            log("worker stopped")
            return 0
        except Exception as error:
            log(f"poll failed reason={type(error).__name__}: {error}")
            time.sleep(backoff)
            backoff = min(30.0, max(worker.poll_seconds, backoff * 2))


if __name__ == "__main__":
    sys.exit(main())
