# HOA Yard Service — Ақмешіт 9

Сервис эксплуатации и благоустройства территории ЖК. См. `ARCHITECTURE.md` и `ROADMAP.md`.

## Ограничения деплоя на GitHub Pages

GitHub Pages отдаёт **только статику** — там нет сервера, который мог бы исполнять Java.
Поэтому на Pages публикуется исключительно `frontend/` (статичный React PWA), а `backend/`
(Spring Boot) там в принципе не может работать и должен размещаться отдельно (VPS,
контейнерный хостинг, PaaS с поддержкой JVM и т.д.) — см. `ARCHITECTURE.md`.

Поскольку live-backend на Pages нет, фронтенд собран с **demo-режимом**: если переменная
окружения `VITE_API_BASE_URL` не задана при сборке, `whatsappService.ts` вместо реальных
HTTP-запросов имитирует ответы backend (создание задач, отправку WhatsApp) на клиенте —
без этого вкладка «Диспетчер» на статичной странице просто падала бы на сетевой ошибке.
Карта двора (`CourtyardMap`) не завязана на backend вообще и работает как есть.

Когда backend будет где-то развёрнут — пересоберите фронтенд с
`VITE_API_BASE_URL=https://ваш-backend/api/v1`, и demo-режим выключится сам.

### Как включить публикацию

1. В репозитории: **Settings → Pages → Source → GitHub Actions** (разовая настройка,
   руками в UI — воркфлоу этого сделать не может).
2. Смёржить ветку с воркфлоу (`.github/workflows/deploy-pages.yml`) в `main` — он
   триггерится на push в `main` (или запускается вручную через `workflow_dispatch`
   на вкладке Actions).
3. После успешного запуска сайт будет на `https://<owner>.github.io/RNM26/`.

## Локальный запуск

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, demo-режим (backend не нужен)
```

### Backend
```bash
cd backend
# нужен Postgres, см. переменные DB_URL/DB_USER/DB_PASSWORD в application.yml
./mvnw spring-boot:run
```

Чтобы фронтенд локально ходил в реальный backend вместо demo-режима:
```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1 npm run dev
```

## Известные ограничения (актуально на момент этого коммита)

- Координаты зон в `frontend/src/components/map/zones.data.ts` — плейсхолдер, не реальная
  геодезия двора.
- Номера телефонов Никиты/Владимира в `backend/.../V1__init.sql` — фейковые заглушки,
  WhatsApp OTP не заработает без замены на реальные E.164-номера.
- `GET /api/v1/tasks` не форсирует `assigneeId` из JWT для роли CLEANER (см.
  `TODO(security)` в `TaskController`) — до продакшена это дыра доступа.
- Тестов, docker-compose и CI для backend нет.
- npm audit показывает известную esbuild/vite advisory (GHSA-67mh-4wv8-2f99) — она
  затрагивает только dev-сервер (`vite dev`), не собранную статику, которая уходит на Pages.
