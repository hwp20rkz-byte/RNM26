# QazaqVerse 3D — «Неостепь»

Immersive Kazakh-grammar games in a **Neo-Steppe Solarpunk** world: React 19, TypeScript (strict),
Three.js r186, React Three Fiber 9, Drei 10, Rapier physics, `@react-three/postprocessing`, Tailwind 4,
Zustand 5 and a procedural Web Audio synthesizer. One codebase ships to **two targets**: a static web
build and the Android APK (opened from the main game's *Games* tab, served from `file:///android_asset/suite/`).

| Game | Pillar | Status |
|---|---|---|
| **Септік тотемі** (`TotemCases3D`) | 7 cases + personal endings | ✅ playable, tested |
| **Сөйлем экспресі** (`HyperloopBuilder3D`) | SOV word order · imperative (teacher, doctor) | ✅ playable, tested |
| **Ұшқыр монолиттер** (`FloatingMonoliths3D`) | antonyms · KZ↔RU/EN · memory | ✅ playable, tested |
| **Әріп кубтары** (`VoxelAnagram3D`) | Ә І Ң Ғ Ү Ұ Қ Ө Һ vs the Russian look-alikes | ✅ playable, tested |
| **Бәйтерек қорғаны** (`BaiterekDefense3D`) | quick recall: pictures (grades 1–2) and words (3–4) | ✅ playable, tested |

```bash
npm ci            # .npmrc sets legacy-peer-deps (npm 10 crashes on vitest 4's optional peers)
npm run dev       # Vite dev server with HMR
npm test          # 76 unit tests: morphology vs corpus, distractor property test, pair rounds, reducers, stores
npm run build     # tsc --noEmit → vite build (single IIFE) → postbuild (file:// safe)
npm run budget    # size gate: JS ≤ 4.2 MB raw / 1.45 MB gzip, CSS ≤ 60 KB
npm run e2e       # Playwright: Totem on phone + desktop, real drag & tap; Monoliths, Sentence Express, Letter Cubes and Baiterek Defense in all modes, real clicks on 3D
```

## Architecture

```
src/
├── app/                         hash router (works on file:// and any static host)
│   ├── page.tsx                 hub: 5 games, level, streak, best scores
│   └── games/<id>/page.tsx      one route per game (totem-cases, hyperloop, monoliths, anagram, baiterek)
├── components/
│   ├── 3d/canvas/StudioCanvas.tsx       Canvas + quality tiers + post FX + responsive FOV + spring camera
│   ├── 3d/environment/SkyDiorama.tsx    procedural dusk sky, stars, low-poly steppe, floating island
│   ├── 3d/effects/ParticleEmitter.tsx   InstancedMesh sparks + shockwave rings, ambient dust motes
│   ├── 3d/materials/GlassShader.ts      custom GLSL rune glass (fresnel, thin-film, scan line, runes)
│   ├── 3d/CanvasLabel.tsx               3D text from the page font (no SDF font download)
│   ├── games/TotemCases3D.tsx           the game
│   └── ui/                              GameHUD, FeedbackModal, GrammarBadge
├── store/       useGameStore (XP, level, streak, quality — persisted), useAudioStore, useFxStore (shake/focus)
├── lib/         morphology.ts (harmony + assimilation), totemLogic.ts (pure reducer), i18n, kazakhVoice
├── data/        kazakhGrammarCorpus.ts — textbook sentences; endings cross-checked by tests
├── types/       game.types.ts — domain + 3D runtime types
└── utils/       soundEngine.ts — procedural SFX, HRTF positional audio
```

**Pedagogical correctness is enforced, not hoped for.** `lib/morphology.ts` implements the school
tables for the 7 cases and predicate endings: the last vowel decides back/front (сингармонизм), the
last sound decides the consonant (assimilation: vowel / sonorant л р й у / nasal м н ң / ж з / voiceless).
Every hand-written ending in the corpus is asserted against the engine, the textbook's own table
(мүсін → мүсіннің, мүсінге, мүсінді, мүсінде, мүсіннен, мүсінмен, p. 122) is a test, and a property test
over 80 generated rounds proves no option is an invented form. The engine also writes the explanation
shown after a mistake («мүсін + ді: последний звук «н» — носовой… последняя гласная «і» — мягкая»).

## Decisions (and where the brief was changed)

- **Vite, not Next.js.** The suite must run from `file://` inside the APK; Next needs a server or a static
  export with absolute paths and module scripts. Vite builds one IIFE bundle; `postbuild` turns the
  module script into a classic `defer` script because Android WebView rejects ES modules on `file://`.
- **Offline first.** drei `<Text>` (troika) and `<Environment preset>` download fonts/HDRs from CDNs;
  here text is drawn from the bundled Nunito webfont (`CanvasLabel`) and reflections come from
  procedural `Lightformer`s. Rapier's WASM is base64-inlined (the bulk of the 3.5 MB bundle).
- **Quality tiers instead of one look for all.** `auto` starts from cores/memory, then drei's
  `PerformanceMonitor` moves between tiers by real FPS; the HUD lets the player pin a tier.
  *high*: MeshTransmissionMaterial crystals (transmission 0.9, roughness 0.15, chromatic aberration 0.06),
  4× MSAA, soft shadows, Bloom + chromatic aberration + vignette + AgX. *medium*: rune-glass shader, Bloom,
  DPR ≤ 1.5. *low*: no post-processing, no shadows, fewer particles, DPR 1.
- **Juice with restraint.** Critically-damped spring camera, trauma² screen shake, shockwave + sparks on
  success, physical recoil on error; shake is off and CSS motion is cut under `prefers-reduced-motion`.
- **Accessible by construction.** Every crystal has a mirrored DOM button: the game is fully playable with a
  keyboard, a screen reader or without WebGL. Touch targets ≥ 44 px.
- **Palette.** Turquoise (primary), solar gold (accent), obsidian (neutral); jade and coral are status
  colours only; hyper-violet is used in the 3D lighting, not in UI chrome (project design rules).
- **Branding.** The brief names AltynGo / altyngo.com; that site's code was not available here, so the suite
  is built on this repo's own curriculum and keeps the QazaqVerse name. The brand is one string in `index.html`
  and `app/page.tsx`.

## DevOps

- `build.sh` (APK) builds the suite when `suite/node_modules` exists, runs the size budget, copies
  `dist/` to `assets/suite/` and writes `assets/suite/available.js`; the main game shows the 3D-hall card
  only when that file exists. Android *Back* goes game → hub → main game (`window.qBack`).
- CI (`.github/workflows/qazaqverse.yml`, PRs touching `kazakh-kids-app/**`): lesson engine build + tests
  with a check that generated files are committed → suite typecheck, unit tests, build, budget, Playwright
  e2e → APK assembled with Debian Android tools and uploaded as an artifact.
- The full sentences of the corpus are voiced by the main game's TTS pipeline (`tools/collect-phrases.js`
  reads this corpus); the suite plays them from `../audio-iseke/` or `../audio/` by the same FNV key
  (parity is a unit test).

## Known limits

- Frame rate was verified only in headless Chromium with a software GPU; real-device profiling on a low-end
  Android phone is the next step before raising the default tier.
- All five games are playable; the plan for what comes next is in `../methodology/dev-plan.md`.
