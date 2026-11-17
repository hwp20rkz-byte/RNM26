---
description: QazaqVerse — озвучка новых фраз (ISEKE, Томирис, герои Freedom Speech, OmniVoice) с ASR-проверкой и отбраковкой
argument-hint: [iseke|tomiris|heroes|omnivoice|all]
---
Что озвучить: **$ARGUMENTS** (по умолчанию all). Работай в `kazakh-kids-app/`.

**Ключи.** `FS_API_KEY`, `HF_TOKEN` — только из окружения или `.env` (инструменты читают его сами через
`tools/load-env.mjs`). Ключ не вставлять в команды, которые пишутся в файлы, и не создавать скриптов с ключом.
Если ключа нет — честно сообщить, какой слой не озвучен, и продолжить с остальными.

1. `node tools/collect-phrases.js > <scratch>/phrases.json`; посчитай новые ключи относительно прошлого списка.
2. **ISEKE (диктор, офлайн):** `python3 tools/make-audio.py <phrases> --narrator <kk_KZ-iseke-x_low.onnx> --out audio-iseke --var QAUDIO_ISEKE`.
3. **Герои:** `node tools/make-audio-fs.mjs <phrases> --heroes tools/voice_studio/fs-cast.json --transport http --verify`.
4. **Томирис:** `node tools/make-audio-fs.mjs <phrases> --voice tomiris --transport http --verify` (долго — в фоне).
5. **OmniVoice** (детские голоса, если HF доступен): `python3 tools/voice-studio.py ...` — сначала `probe`.
6. **ASR-отбраковка.** Разбери `verify.csv`: похожесть < 0,80 → перепроверь распознаванием с паузами по краям
   (короткие клипы распознаются плохо); фразы с местоимением в начале — проверь, что первое слово услышано.
   Стабильно испорченные — в `web/audio-<пакет>/skip.json` (звучат ISEKE), пересобери манифест (`--limit 0`).
7. `npm test` (проверка «у каждой фразы есть звук»), `npm run test:voice-packs`. Отчёт: сколько новых, сколько
   отбраковано и почему. Коммит (сначала `tools/scan-secrets.sh`).
