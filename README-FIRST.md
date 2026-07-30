# RIK site — portable current-state handoff for Georgiy

Snapshot source:

- frontend: `C:\Users\user2\rik-site\app`
- live backend: `C:\Users\user2\rik-chatbot-backend`
- snapshot id: `20260729-074519`

The original `.31` host was not moved, stopped or deleted. This directory is an
independent copy of the current code/content state.

## Contents

- `frontend/` — current React/Vite source, package lock and all public assets.
- `backend/` — current FastAPI source, prompts, knowledge and Supabase schema
  references.
- `INSTALL.ps1` — creates clean Node/Python dependencies.
- `START-DEV.ps1` — starts backend on `127.0.0.1:8011` and frontend on
  `0.0.0.0:5173`.
- `STOP-DEV.ps1` — stops only the processes recorded by `START-DEV.ps1`.
- `VERIFY.ps1` — TypeScript/Vite build, Python compile and pip consistency.
- `MANIFEST.csv` — SHA-256 inventory of the portable bundle.

## Required software

- Windows 10/11 x64.
- Node.js 24.x and npm 11.x. `.31` used Node `24.15.0`, npm `11.12.1`.
- Python 3.12+; `.31` backend venv used Python `3.14.6`.
- PowerShell 5.1 or newer.

## First launch

1. Copy the entire `RUNNABLE` folder from USB to a local SSD.
2. Run:

   `powershell -ExecutionPolicy Bypass -File .\INSTALL.ps1`

3. Open `backend\.env`, replace every `<SET_SEPARATELY>` value using the
   protected credential handoff from Viktor/admin. Secrets are intentionally
   absent from USB.
4. Run:

   `powershell -ExecutionPolicy Bypass -File .\VERIFY.ps1`

5. Start:

   `powershell -ExecutionPolicy Bypass -File .\START-DEV.ps1`

6. Open `http://localhost:5173/`.

To work only on frontend before credentials are available:

`powershell -ExecutionPolicy Bypass -File .\START-DEV.ps1 -FrontendOnly`

## Important boundaries

- Do not run production from Vite dev server. Production must use `npm run
  build` plus a hardened static/reverse-proxy service.
- Frontend `/api` is proxied to local `127.0.0.1:8011`; chat and request form
  require the backend.
- The current source intentionally includes the findings from the read-only
  audit. Read `AUDIT\report.md` before fixes.
- Never copy `.env`, SMTP password, OpenRouter key or Supabase service-role key
  into git, site-bridge, Obsidian or reports.
- Make a restore point and use minimal diffs; no blind overwrite.

## What was excluded

- frontend `node_modules/` and `dist/` — reproducible by `npm ci` / build;
- backend `.venv/` — recreated by `INSTALL.ps1`;
- `.env`, `secrets/`, runtime logs and chat-session data;
- historical backend backups and Python caches.

The complete unmodified site snapshot, including old restore/incoming/tmp
folders, is separately stored under `FULL_BACKUP\rik-site`.

