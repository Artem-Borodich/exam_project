# exam_project (дипломный production-проект)

## Стек
- Backend: Node.js + Express, TypeScript, MySQL + Prisma, JWT, Google OAuth
- Frontend: React + TypeScript, Axios, Zustand, React Router, Leaflet
- Интеграции: Google OAuth (login), Google Calendar API (опционально для напоминаний)

## Структура проекта
```
/backend
  /src
    /controllers
    /services
    /routes
    /middlewares
    /models
    /utils
    /config
  server.ts
/frontend
  /src
    /pages
    /components
    /services
    /hooks
    /store
  main.tsx
/docs
  diagrams.md
```

## Роли и логика
- `user` (без роли) создаётся при `POST /api/auth/register` или через Google OAuth
- `manager подтверждает → employee` через `GET /api/roles/pending` + `POST /api/roles/confirm`
- автоматически создаётся `manager`:
  - login/email: `manager`
  - password: `12345`

## Настройка окружения

### Backend `.env`
Создайте `backend/.env` на основе `backend/.env.example`:
- `DB_URL=mysql://user:password@host:3306/dbname`
- `JWT_SECRET=...`
- `FRONTEND_URL=http://localhost:5173`

Google OAuth + API:
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback`
- `GOOGLE_CALENDAR_ID=primary` (опционально)

### Frontend `.env`
Создайте `frontend/.env`:
- `VITE_API_BASE_URL=http://localhost:4000`

## Запуск

1) Установка
- Backend:
  - `cd backend`
  - `npm install`
- Frontend:
  - `cd ../frontend`
  - `npm install`

2) База данных и миграции (Prisma)
- `cd backend`
- `npm run setup`
  - скрипт сам создаст/обновит `backend/.env` (DB_URL и JWT_SECRET)
  - при необходимости переключит auth plugin MySQL (например `sha256_password` -> `mysql_native_password`)
  - создаст БД (если её нет)
  - запустит `prisma migrate` и seed (создаст roles и manager: `manager` / `12345`)

3) Запуск backend
- `cd backend`
- `npm run dev`

4) Запуск frontend
- `cd frontend`
- `npm run dev`

## Что реализовано из интеграций
- Google OAuth Authorization Code flow:
  - `GET /api/auth/google/start` → redirect на Google
  - `GET /api/auth/google/callback` → обмен code на refresh_token → выпуск JWT
- Google Calendar:
  - при создании duty (`POST /api/duties`) backend создаёт событие (если у employee есть connected Google),
    с напоминаниями за `1 день` и `1 час`

## Диаграммы
См. `docs/diagrams.md`.

