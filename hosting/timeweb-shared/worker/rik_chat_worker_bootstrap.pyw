"""Console-free launcher for the RIK site chat worker on Windows.

Secrets stay protected with DPAPI CurrentUser.  This launcher is intentionally
started by pythonw.exe so Task Scheduler never creates a console window.
"""

from __future__ import annotations

import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import runpy
import sys


APP_DIR = Path(__file__).resolve().parent
SECRETS_PATH = APP_DIR.parent / "worker-secrets.dpapi"
WORKER_PATH = APP_DIR / "rik_chat_worker.py"
LOG_PATH = APP_DIR.parent / "worker.log"
ENTROPY = b"RIK-SITE-CHAT-WORKER-V1"
MUTEX_NAME = "Local\\RIKSiteChatWorker"


class DATA_BLOB(ctypes.Structure):
    _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]


def blob(data: bytes) -> tuple[DATA_BLOB, ctypes.Array[ctypes.c_ubyte]]:
    buffer = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    return DATA_BLOB(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_ubyte))), buffer


def unprotect(data: bytes) -> bytes:
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    kernel32.LocalFree.restype = ctypes.c_void_p
    encrypted, encrypted_buffer = blob(data)
    entropy, entropy_buffer = blob(ENTROPY)
    clear = DATA_BLOB()
    if not crypt32.CryptUnprotectData(
        ctypes.byref(encrypted), None, ctypes.byref(entropy), None, None, 0, ctypes.byref(clear)
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(clear.pbData, clear.cbData)
    finally:
        kernel32.LocalFree(clear.pbData)
        del encrypted_buffer, entropy_buffer


def require(value: object, name: str) -> str:
    result = str(value or "").strip()
    if not result:
        raise RuntimeError(f"Protected worker config is missing {name}")
    return result


def main() -> None:
    if not SECRETS_PATH.is_file() or not WORKER_PATH.is_file():
        raise RuntimeError("RIK chat worker runtime is incomplete")

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateMutexW.argtypes = [ctypes.c_void_p, wintypes.BOOL, wintypes.LPCWSTR]
    kernel32.CreateMutexW.restype = wintypes.HANDLE
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL
    mutex = kernel32.CreateMutexW(None, False, MUTEX_NAME)
    if not mutex:
        raise ctypes.WinError(ctypes.get_last_error())
    if ctypes.get_last_error() == 183:  # ERROR_ALREADY_EXISTS
        kernel32.CloseHandle(mutex)
        return

    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    log_handle = LOG_PATH.open("a", encoding="utf-8", buffering=1)
    sys.stdout = log_handle
    sys.stderr = log_handle
    try:
        config = json.loads(unprotect(SECRETS_PATH.read_bytes()).decode("utf-8"))
        relay = require(config.get("RelayBaseUrl"), "RelayBaseUrl")
        inference = require(config.get("InferenceBaseUrl"), "InferenceBaseUrl")
        if relay.rstrip("/") != "https://rik-vent.ru/api/chat-worker":
            raise RuntimeError("Protected relay URL failed the allowlist")
        if inference.rstrip("/") != "https://openrouter.ai/api/v1":
            raise RuntimeError("Protected inference URL failed the allowlist")

        os.environ["RIK_CHAT_WORKER_BASE_URL"] = relay
        os.environ["RIK_CHAT_WORKER_TOKEN"] = require(config.get("RelayToken"), "RelayToken")
        os.environ["RIK_CHAT_INFERENCE_BASE_URL"] = inference
        os.environ["RIK_CHAT_INFERENCE_API_KEY"] = require(config.get("InferenceApiKey"), "InferenceApiKey")
        os.environ["RIK_CHAT_INFERENCE_MODELS"] = require(config.get("Models"), "Models")
        runpy.run_path(str(WORKER_PATH), run_name="__main__")
    finally:
        os.environ.pop("RIK_CHAT_WORKER_TOKEN", None)
        os.environ.pop("RIK_CHAT_INFERENCE_API_KEY", None)
        kernel32.CloseHandle(mutex)
        log_handle.close()


if __name__ == "__main__":
    main()
