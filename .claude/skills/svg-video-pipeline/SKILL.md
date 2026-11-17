---
name: svg-video-pipeline
description: Vertical (9:16) bilingual explainer videos in pure SVG line art with Remotion — storyboard JSON → TTS (Piper offline or edge-tts) → timing from ffprobe → React/SVG scenes → 4K60 render → 32K tiled stills → QC frames. Use for «make an animated learning video», storyboards, voice-over fitted to scenes, vector key frames.
---

# SVG video pipeline (reference project: `almaty-zoo-video/`)

Load `remotion-best-practices` first for Remotion APIs; this skill is the house workflow around it.

1. **Storyboard first** — `storyboard/storyboard.json` is the single source: scenes (shot, camera, composition,
   animation, UI with times), speaker, line per language, SFX, voices. `STORYBOARD.md` is generated from it + timing.
2. **Voices** — `python3 scripts/tts.py --voices <dir>`: Piper packs from the sherpa-onnx GitHub releases
   (`vits-piper-<lang>-<voice>.tar.bz2`; Hugging Face LFS is blocked by the proxy); child timbre = pitch ×1.06–1.25
   with tempo kept (`asetrate` + `atempo`), −16 LUFS. `--engine edge` for edge-tts when `speech.platform.bing.com` is
   allowed. Never invent a voice of a real person.
3. **Sound** — `python3 scripts/sound.py`: everything synthesised with numpy (no samples to license).
4. **Timing** — `npm run timing`: scene length = max(nominal, lead + line(s) + tail) by ffprobe; lip-sync envelopes
   at the video fps → `src/lipsync.json`.
5. **Scenes** — pure functions of (frame, fps): no `Math.random`, no hooks inside the art, so the same component renders
   to video, to `.svg`, and to 32K. Line style from `theme.ts` (`LINE`), palette tokens only.
6. **Render** — `npm run render:all` (scale 2 → 2160×3840 @ 60 fps, Chromium from `/opt/pw-browsers`), ~1.6 fps on 4
   CPUs. Do not run the 32K export at the same time (memory).
7. **32K** — `npm run export:32k-frames`: SVG via `react-dom/server`, raster in a 4×4 tile grid (librsvg would need
   ~8 GB for 530 Mpx at once), stitched with sharp.
8. **QC** — `npm run qc`: ffprobe format/duration/loudness + one frame per scene + contact sheets; look at them.

Content rules: no profanity or adult memes in children's material; facts about real places marked for checking.
