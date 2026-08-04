# RIK site

Canonical source: private GitHub repository `vstoilsky-svg/rik-site`.

The repository contains the React/Vite frontend, FastAPI backend, production nginx/supervisor container configuration, documents and public assets. A GitHub merge updates source and publishes a container image; it does **not** deploy to Timeweb or change DNS.

## Local Windows setup

Requirements: Node.js 24, npm 11, Python 3.12 x64, PowerShell 5.1+ and Docker Desktop for container checks.

```powershell
git clone https://github.com/vstoilsky-svg/rik-site.git C:\RIK-SITE-LOCAL\RUNNABLE
Set-Location C:\RIK-SITE-LOCAL\RUNNABLE
powershell -ExecutionPolicy Bypass -File .\INSTALL.ps1
Copy-Item .\backend\.env.example .\backend\.env
```

Fill `backend/.env` only through the protected operator handoff. Never commit or paste its values.

```powershell
powershell -ExecutionPolicy Bypass -File .\VERIFY.ps1
powershell -ExecutionPolicy Bypass -File .\START-DEV.ps1
```

Open `http://localhost:5173/`. Other office computers can use the workstation IP while the dev server is running and the firewall allows port 5173.

## Container

```powershell
docker compose build
docker compose up -d
curl.exe http://127.0.0.1:8080/healthz
```

The image listens on port 8080 and runs as the non-root `rik` user. Runtime variables are injected from `backend/.env`; they are not baked into the image.

## Change workflow

Create a branch, make focused changes, run `GENERATE-MANIFEST.ps1`, then run `VERIFY.ps1`. Push the branch and open a pull request. GitHub CI validates source, manifest, tests, full history for secrets, the production image, deep links, 404 assets and the non-root runtime.

On a successful merge to `main`, GitHub publishes:

- `ghcr.io/vstoilsky-svg/rik-site:latest`
- `ghcr.io/vstoilsky-svg/rik-site:<commit-sha>`

Use the immutable SHA tag for rollback. Deployment and domain cutover require a separate explicit decision by the operator.

See `CONTRIBUTING.md`, `SECURITY.md`, `docs/AUDIT-CLOSURE.md` and `docs/REPOSITORY-SIZE.md`.
