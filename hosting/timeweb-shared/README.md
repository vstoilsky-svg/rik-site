# Timeweb shared Hosting package

This target keeps the production React frontend and replaces the container-only FastAPI runtime with a PHP 8.2 API compatible with the existing Timeweb Hosting account.

## Resulting server layout

```text
dev-rik-vent/
  public_html/       # built frontend, .htaccess and api/index.php
  rik_app/           # config.env, prompt, knowledge and writable data
```

`rik_app/config.env` must stay outside `public_html` and must never be committed.

The request form preserves the container mail route: authenticated SMTP with the same `SMTP_*` and `REQUEST_RECIPIENT` values. PHP `mail()` is not used.

The public endpoints remain unchanged:

- `GET /api/health`
- `POST /api/chat`
- `POST /api/chat/stream`
- `POST /api/request`

The streaming endpoint emits valid SSE in one complete message. The existing chat widget supports this without frontend changes.

Run `build.ps1` from this directory to create a self-contained upload archive outside the repository. The archive contains `public_html_new`, sibling `rik_app`, a manifest, and deployment instructions. Secrets are copied from the named local container into `rik_app/config.env`; the script never prints their values.

The production chatbot requires the authenticated local relay because shared-hosting egress to the inference provider can be blocked. Release assembly therefore fails closed unless the source container provides a non-empty `LOCAL_RELAY_TOKEN`; `LOCAL_RELAY_ENABLED=true` is the committed production default. On Windows, schedule `worker/rik_chat_worker_bootstrap.pyw` with `pythonw.exe` directly. Do not schedule the PowerShell helper: the `.pyw` bootstrap decrypts the DPAPI config, enforces endpoint allowlists and runs without creating any console window.
