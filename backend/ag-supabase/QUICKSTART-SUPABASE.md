# Быстрый старт Supabase для Георгия

Это короткая версия. Если запутался, смотри `README-GEORGIY.md`.

## 1. Зайти в Supabase

Открыть:

```text
https://supabase.com/dashboard
```

Войти в аккаунт, который разрешит Виктор.

## 2. Создать проект

Нажать:

```text
New project
```

Название:

```text
rik-chatbot-rag
```

Пароль базы сохранить в надежное место. Он может понадобиться позже.

## 3. Открыть SQL Editor

В левом меню:

```text
SQL Editor → New query
```

Сначала выполнить:

```sql
create extension if not exists vector;
```

Потом скопировать весь файл:

```text
rag-supabase/schema.sql
```

и нажать `Run`.

## 4. Проверить таблицы

В левом меню:

```text
Table Editor
```

Должны появиться:

- `rag_sources`
- `rag_documents`
- `rag_chunks`
- `rag_ingest_runs`

## 5. Забрать API данные

В левом меню:

```text
Project Settings → API
```

Скопировать:

- Project URL
- service_role key

Не отправлять service_role key в общий чат и не класть во frontend.

## 6. Заполнить env на сервере Виктора

Взять шаблон:

```text
rag-supabase/env.example
```

Заполнить:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 7. Написать в site-bridge

После создания проекта отписаться в:

```text
\\192.168.1.121\Share\2026 РИК\Обмен\site-bridge\to-rik\inbox
```

Написать:

- Supabase-проект создан;
- schema применена;
- таблицы проверены;
- env готовы на машине Виктора или переданы Виктору;
- нужен следующий шаг: ingestion или подключение backend.

