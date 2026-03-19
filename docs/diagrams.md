# Диаграммы (текстовое представление)

## 1) IDEF0 (декомпозиция)

`A0: Управление сменами, наблюдениями и отчётами`
- Inputs (I): регистрации пользователей/подтверждения ролей, полигоны зон, график смен, данные из Google Sheets (5-мин интервалы), критерии отчета (период+зоны)
- Controls (C): политики ролей (user/employee/manager), JWT-авторизация, OAuth-область доступа Google, правила 5-мин интервалов
- Outputs (O): созданные смены, события в Google Calendar, сохраненные Observations, созданные документы в Google Docs
- Mechanisms (M): backend-сервисы (Express/TS), Prisma+PostgreSQL, Google APIs (OAuth/Calendar/Sheets/Docs)

`A1: Регистрация и подтверждение пользователей`
- I: данные регистрации, Google OAuth token/code
- C: роли user/employee/manager
- O: user без роли → подтвержден employee, manager создан автоматически
- M: Prisma seed, Auth сервис

`A2: Управление зонами`
- I: имя зоны и polygon (массив координат)
- C: права manager, валидация полигона
- O: сохраненная Zone с polygon JSON
- M: Zone service + Leaflet-подбор полигона во frontend

`A3: Назначение смен`
- I: дата+время+зона, employeeId
- C: role-check manager, наличие Google refresh_token у employee
- O: Shift в БД + событие в Google Calendar
- M: Shift service + Google Calendar API

`A4: Синхронизация Observations`
- I: данные из Google Sheets
- C: права manager, формат таблицы (колонки: zoneName, intervalStart, intervalEnd?, metrics?)
- O: Observation записи по 5-мин интервалам (upsert)
- M: Google Sheets API + Observations service

`A5: Генерация Reports`
- I: период+выбранные зоны
- C: role-check manager, доступ к Google Docs (tokens)
- O: созданный Google Docs документ с агрегированной статистикой
- M: Reports service + Google Docs API

## 2) ER-диаграмма (связи)

Сущности:
- `Role(id, name)`
- `User(id, username, email?, passwordHash?, roleId?, googleRefreshToken?)`
- `Zone(id, name, polygon: Json, createdById)`
- `Shift(id, zoneId, employeeId, createdById, startAt, endAt, googleEventId?)`
- `Observation(id, zoneId, intervalStart, intervalEnd, metrics: Json)`
- `Report(id, createdById, fromAt, toAt, zoneIds Int[], googleDocId?, googleDocUrl?, summary?)`

Связи:
- `Role 1 — N User` (User.roleId → Role.id, roleId nullable)
- `User 1 — N Zone` (createdById → User.id)
- `User 1 — N Shift` как employee (employeeId → User.id)
- `User 1 — N Shift` как createdBy (createdById → User.id)
- `Zone 1 — N Shift` (zoneId → Zone.id)
- `Zone 1 — N Observation` (zoneId → Zone.id)
- `Report — User` (createdById → User.id)

Ограничения:
- `Observation` уникальна по `(zoneId, intervalStart)` (5-мин интервалы)

## 3) Use Case (кратко)

- User:
  - Register (создать аккаунт, role отсутствует до подтверждения manager)
  - Login
  - OAuth Google (подключить Google для дальнейших интеграций)
- Manager:
  - Confirm pending users → назначить role `employee`
  - Create zone (polygon через карту)
  - Create shifts (дата+время+зона, привязка к employeeId)
  - Sync observations из Google Sheets
  - Generate report (период+зоны) → создание Google Docs
- Employee:
  - Login
  - OAuth Google
  - Просмотр своих shifts

## 4) Deployment (схема)

Обычно production разворачивается так:
- `frontend` (Vite/React) — статическая сборка в CDN или на отдельном web-сервере
- `backend` (Node/Express) — контейнер/VM, порт `4000`
- `postgres` — managed DB (например, RDS/Cloud SQL), env `DB_URL`
- Google:
  - OAuth consent экран
  - Calendar API для создания событий смен
  - Sheets API для чтения Observations
  - Docs API для генерации Reports

