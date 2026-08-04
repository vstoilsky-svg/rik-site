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

RUN apk add --no-cache ca-certificates nginx supervisor \
    && addgroup -S rik \
    && adduser -S -D -H -G rik rik

COPY backend/requirements.lock.txt ./requirements.lock.txt
RUN python -m pip install --no-cache-dir --upgrade pip==26.2 \
    && pip install --no-cache-dir --require-hashes -r requirements.lock.txt

COPY --chown=rik:rik backend/backend ./backend
COPY --chown=rik:rik backend/prompts ./prompts
COPY --chown=rik:rik backend/knowledge ./knowledge
RUN mkdir -p /app/data /tmp/nginx/client /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
    && chown -R rik:rik /app/data /tmp/nginx

COPY --from=frontend-builder --chown=rik:rik /build/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/rik-supervisor.conf /etc/supervisor.d/rik.ini

USER rik

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=3).read()" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
