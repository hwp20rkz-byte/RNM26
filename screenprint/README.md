# ScreenPrint FabLab & MES/CRM

Экосистема шелкографии: параметрические станки из фанеры ЧПУ и алюминиевого профиля, 3D-конфигуратор с экспортом раскроя и спецификации, сайт с конструктором мерча, CRM/MES цеха. Правила проекта и дорожная карта — в `CLAUDE.md`.

## Состояние: этап 0 закрыт, этап 1 начат

- Инженерное описание печатного станка: `docs/01-press-engineering.md`.
- Параметрическая модель станка (S/M/L/XL), расчёт пружин, спецификация с поисковыми строками: `src/domain/press`.
- Раскрой фанеры SVG/DXF и спецификация CSV для типоразмера M: `docs/cut`, `docs/bom-press-M.csv`.
- Бизнес-план с интерактивной финансовой моделью на 24 месяца: страница `/plan`, расчёт `src/domain/business/plan.ts` с тестами.
- Схема данных CRM/MES и конфигураций станков: `prisma/schema.prisma`.
- Каркас приложения Next.js + React Three Fiber + Prisma: `src/app` (статический экспорт; CRM с базой данных потребует серверного хостинга на этапе 5).

Адрес после деплоя: `https://hwp20rkz-byte.github.io/RNM26/screenprint/`. Workflow Pages запускается только с ветки `main`, поэтому сайт появится после слияния ветки.

## Запуск

```bash
cd screenprint
npm install
npm test                 # тесты доменной модели
npm run typecheck
npm run export -- M      # раскрой, BOM, расчёт пружин → out/ (S, L, XL — так же)
cp .env.example .env && npm run db:push   # SQLite dev.db
npm run dev              # http://localhost:3200
```

## Экспорт раскроя

`npm run export -- M out` пишет: `press-M-18mm-sheet1.svg/.dxf`, `press-M-12mm-sheet2.svg/.dxf`, `bom-press-M.csv`, `parts-press-M.csv`, `balance-press-M.md`. SVG в миллиметрах, слои по цвету (чёрный рез, синий отверстия, красный карманы, зелёный гравировка); DXF R12 со слоями CUT/HOLE/POCKET/TEXT. Компенсацию фрезы задаёт CAM мастерской.
