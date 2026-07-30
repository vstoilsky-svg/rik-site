# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS frontend-builder

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
RUN npm run build


FROM python:3.12-alpine AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /app

RUN apk add --no-cache ca-certificates nginx supervisor

COPY backend/requirements.lock.txt ./requirements.lock.txt
RUN python -m pip install --no-cache-dir --upgrade pip==26.2 \
    && pip install --no-cache-dir --require-hashes -r requirements.lock.txt

COPY backend/backend ./backend
COPY backend/prompts ./prompts
COPY backend/knowledge ./knowledge
RUN mkdir -p /app/data

COPY --from=frontend-builder /build/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/rik-supervisor.conf /etc/supervisor.d/rik.ini

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=3).read()" || exit 1

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisord.conf"]
