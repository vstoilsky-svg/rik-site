# РИК чат-бот RAG-бэкенд (FastAPI + OpenRouter + Supabase).
# Секреты НЕ в образ — прокидываются через env_file на запуске.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY prompts ./prompts
COPY knowledge ./knowledge

EXPOSE 8011
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8011", "--log-level", "warning"]
