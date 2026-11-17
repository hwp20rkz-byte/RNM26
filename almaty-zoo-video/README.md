# «Дети пошли в Алматинский зоопарк» — векторный обучающий ролик (KZ + PL)

9:16, чистый SVG-лайн-арт, Remotion (React + TypeScript). Три версии: билингва (KZ → PL), только казахский, только польский.

```bash
npm install
python3 scripts/tts.py --voices <папка с vits-piper-*>   # озвучка (или --engine edge)
python3 scripts/sound.py                                  # музыка и звуки (синтез)
npm run timing                                            # длительности сцен по озвучке + липсинк
npm run studio                                            # превью
npm run render:all                                        # out/*.mp4, 720×1280 @ 60 fps (SCALE=2 → 4K)
npm run export:32k-frames                                 # необязательно: frames-32k/*.svg (+ 32K PNG)
npm run qc                                                # проверка форматов и контрольные кадры out/qc/
```

Раскадровка: `storyboard/STORYBOARD.md` (из `storyboard.json`). Пайплайн для повторного использования — скилл
`.claude/skills/svg-video-pipeline`.

**Лицензии.** Remotion бесплатен для частных лиц и компаний до 3 сотрудников, иначе нужна лицензия
(remotion.dev/license). Голоса Piper: Raya (KK) — датасет IS2AI Kazakh TTS, CC-BY-4.0 (нужна атрибуция);
ISEKE, Gosia, Darkman — проверить карточки моделей перед публикацией. Музыка и звуки синтезированы скриптом.
