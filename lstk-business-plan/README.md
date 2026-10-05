# LSTK Business Plan — конструктор бизнес-плана ЛСТК

Отдельный проект: конструктор бизнес-плана производства / строительства из ЛСТК
(лёгкие стальные тонкостенные конструкции). Код пока не начат — папка зарезервирована.

## Где живёт

- Ветка разработки: `claude/lstk-business-plan-constructor-xv799j`
- Папка: `lstk-business-plan/` (своё приложение, свой `package.json`, как `hoa-yard-service/`)

## Публикация: путь, а не поддомен

Репозиторий уже отдаёт один Pages-сайт `https://hwp20rkz-byte.github.io/RNM26/`
(корень — QazaqOSI, рядом `/hoa-yard-service/`). Пока используется GitHub Pages
этого репозитория, проект публикуется **по пути**:

    https://hwp20rkz-byte.github.io/RNM26/lstk-business-plan/

Настоящий поддомен (`lstk.<домен>`) так получить нельзя:

- у одного репозитория — один Pages-сайт и один custom domain (`CNAME`);
- поддомены `*.github.io` кроме `hwp20rkz-byte.github.io` недоступны;
- нужен собственный домен с DNS-записью `CNAME lstk → …`.

Варианты для поддомена: отдельный репозиторий со своим Pages + custom domain, либо
внешний хостинг (Cloudflare Pages / Vercel / Netlify) с деплоем только этой папки.

## Подключение к общему деплою (когда появится сборка)

В `.github/workflows/deploy-pages.yml` по образцу HOA добавить шаги: `npm ci`,
`npm run build` с base `/RNM26/lstk-business-plan/`, затем копирование сборки
в `out/lstk-business-plan/`. Деплой запускается только с веток, перечисленных в
`on.push.branches`; эта ветка туда не добавлена намеренно — деплой с неё перезапишет
весь сайт (QazaqOSI + HOA) содержимым этой ветки.
