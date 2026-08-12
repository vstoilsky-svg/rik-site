# Развёртывание сайта РИК в Timeweb Cloud

Контейнер объединяет:

- React/Vite frontend;
- FastAPI backend;
- Nginx на внешнем порту `8080`.

Секреты не входят в Docker-образ и не должны попадать в репозиторий.

## App Platform из Dockerfile

1. Подключить канонический Git-репозиторий `vstoilsky-svg/rik-site`. Секреты и
   локальные `.env` не должны попадать в репозиторий независимо от его видимости.
2. В Timeweb Cloud открыть App Platform и выбрать тип `Dockerfile`.
3. Подключить репозиторий. Dockerfile находится в корне проекта.
4. Путь директории проекта оставить пустым.
5. Указать путь проверки состояния: `/healthz`.
6. Добавить переменные из локального файла `backend/.env` через интерфейс
   Timeweb. Сам `.env` в репозиторий не загружать.
7. Запустить деплой. Timeweb определит порт `8080` по инструкции `EXPOSE`.

Обязательные защищённые переменные:

- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `REQUEST_RECIPIENT`

Чтобы полностью сохранить текущие настройки чат-бота и форм, перенести также
остальные переменные из `backend/.env`.

## Локальная проверка

```powershell
docker compose build
docker compose up -d
curl.exe --noproxy "*" http://127.0.0.1:8080/healthz
curl.exe --noproxy "*" http://127.0.0.1:8080/projects
docker compose down
```

## Экспорт и загрузка готового образа

```powershell
docker save --output rik-site-20260730-amd64.tar rik-site:2026-07-30
```

Для загрузки в OCI-совместимый реестр Timeweb образ нужно авторизовать,
перетегировать адресом выданного реестра и выполнить `docker push`. Адрес
реестра и токен берутся только из панели Timeweb и не сохраняются в проекте.
