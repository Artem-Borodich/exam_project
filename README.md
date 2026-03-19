# exam_project (дипломный production-проект)

## Стек
- Backend: Node.js + Express, TypeScript, PostgreSQL + Prisma, JWT, Google OAuth
- Frontend: React + TypeScript, Axios, Zustand, React Router, Leaflet
- Интеграции: Google Calendar API, Google Sheets API, Google Docs API

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
  - login: `manager`
  - password: `12345`

## Настройка окружения

### Backend `.env`
Создайте `backend/.env` на основе `backend/.env.example`:
- `DB_URL=postgresql://...`
- `JWT_SECRET=...`
- `FRONTEND_URL=http://localhost:5173`

Google OAuth + API:
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback`
- `GOOGLE_CALENDAR_ID=primary` (опционально)
- `GOOGLE_SHEETS_ID=...` (для `/api/observations/sync`)
- `GOOGLE_SHEETS_RANGE=Observations!A:C` (опционально)

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

2) База данных (Prisma)
- `cd backend`
- `npm run prisma:generate`
- `npm run prisma:migrate` (нужен доступ к Postgres)
- (опционально) `npm run prisma:studio`

После миграций Prisma seed создаст роли и manager автоматически.

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
  - при создании смены (`POST /api/shifts`) backend создаёт событие в Calendar (через refresh_token employee)
- Google Sheets:
  - `/api/observations/sync` читает строки и upsert-ит `Observations` по `(zoneId, intervalStart)`
  - формат строк (по умолчанию ожидаются колонки):
    - `[0] zoneName`
    - `[1] intervalStart`
    - `[2] intervalEnd` (опционально; иначе +5 минут)
    - `[3] metrics JSON` (опционально)
- Google Docs:
  - `POST /api/reports/generate` агрегирует Observation по выбранным зонам и периоду, затем создаёт Google Doc

## Диаграммы
См. `docs/diagrams.md`.

