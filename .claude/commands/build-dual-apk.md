---
description: QazaqVerse — по команде владельца: проверка секретов, все тесты, сборка боевого и тестового APK, чек-лист для телефона
argument-hint: [prod|test|both]
---
Собрать: **$ARGUMENTS** (по умолчанию both). Эта команда и есть разрешение владельца на сборку. Работай в `kazakh-kids-app/`.

1. **Секреты:** `tools/scan-secrets.sh --all` (gitleaks, если установлен, иначе встроенные шаблоны). Найден секрет — стоп.
2. **Тесты:** `npm test`; `cd suite && npx vitest run && npm run build && npm run budget`; сквозные:
   `node tests/phrasebook.e2e.js`, `node tests/voice-roles.e2e.js`, `node tests/voice-packs.e2e.mjs`,
   `node tests/voice-lab.e2e.mjs`, `cd suite && npm run e2e`. Что-то красное — стоп и отчёт.
3. **Сборка:** prod — `./build.sh`; test — `TEST=1 ./build.sh`. Проверь в APK: нет `test-mode.js` и `voice-lab` в
   боевом, нет `verify.csv` / `skip.json` / `heroes-fs.json`, ключ не встречается (`unzip -p … | grep`).
4. **Отчёт:** версия, размер обоих APK (бюджет ≤ 75 МБ), отправь файлы владельцу, выведи чек-лист:
   - [ ] Тестовая ставится рядом с обычной, прогресс раздельный
   - [ ] Профиль → Голос: ISEKE и «Томирис», без ISSAI
   - [ ] Сөздік: диалоги по ролям, «Оқу бұрышы», карточки «Бұйрық рай», «Сағат неше?»
   - [ ] Формы аузым, мұрны, кітабым, жабыңыз
   - [ ] Тіл Кереметі (загадки Баян апай), Сәулетші шеберханасы (вопросы Әнел)
   - [ ] 3D-зал: все 5 игр, нажатия на телефоне
5. Коммит APK и push (GitHub предупреждает о файлах > 50 МБ — напомни о Releases).
