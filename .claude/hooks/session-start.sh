#!/bin/bash
# Подготовка облачной сессии: зависимости скилла watch (разбор видео).
# ffmpeg/ffprobe предустановлены в образе; yt-dlp ставится заново, т.к. контейнер эфемерный.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v yt-dlp >/dev/null 2>&1; then
  pip install -q -U "yt-dlp[default]" >/dev/null 2>&1 || echo "[session-start] yt-dlp install failed" >&2
fi

# Локальный движок, без распознавания речи: работает без API-ключей.
# Если в окружении задан GEMINI_API_KEY, скилл сам выберет движок gemini (engine=auto).
python3 "$CLAUDE_PROJECT_DIR/.claude/skills/watch/scripts/setup.py" \
  --backend none --detail balanced >/dev/null 2>&1 || echo "[session-start] watch setup failed" >&2
