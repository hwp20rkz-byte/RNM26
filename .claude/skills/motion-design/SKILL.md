---
name: motion-design
description: Use when adding any animation, transition, scroll effect, hover state, page transition, or "make it feel alive/cinematic" request — and when choosing between GSAP, Framer Motion, Anime.js, Motion One, or plain CSS. Covers easing/duration recipes, scroll experiences (Lenis, ScrollTrigger, Intersection Observer), signature interactions, and motion restraint. Read before writing any animation code.
---

# Motion Design

CSS first (GPU-cheap, zero deps) for ~70% of motion. One JS library per project, chosen by need, not habit. Every animation must justify itself.

## The motion test (apply to every animation)
Does it serve one of the 4 jobs?
1. **Status** — loading, success, error feedback
2. **Continuity** — where did this come from (enter fades, route transitions)
3. **Hierarchy** — where to look first (staggered reveals)
4. **Personality** — brand expression (memory-layer moves, max 1–2 per site)

No job → it's decoration → cut. After the motion pass, cut 30% of remaining animations; the site reads as more confident.

## Easing recipes
| Feel | Curve |
|---|---|
| Modern snap (Linear/Vercel/Apple) | cubic-bezier(0.32, 0.72, 0, 1) |
| Cinematic out-quint | cubic-bezier(0.16, 1, 0.3, 1) |
| Playful back-out | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Sharp techy in-out | cubic-bezier(0.83, 0, 0.17, 1) |
| entering elements | ease-out |
| leaving elements | ease-in |
Linear easing only for spinners/progress bars.

## Duration recipes
| Animation | Duration |
|---|---|
| Micro-interaction (press, toggle) | 100–200ms |
| UI transition (modal, drawer) | 200–400ms |
| Page reveal / hero | 600–1200ms |
| Cinematic scroll moment | 1.5–4s timeline |
Mobile: −20% across the board.

## Library decision matrix
| Need | Use |
|---|---|
| Scroll-pinned cinematic story | GSAP + ScrollTrigger |
| React UI: tabs, modals, drag, gestures, exit anims | Framer Motion |
| Animated SVG logo / path drawing | Anime.js |
| Sub-5KB bundle, vanilla/Astro/Webflow | Motion One (WAAPI) |
| 50+ effects marketing site | GSAP |
One per project. Two is acceptable. Four is a smell.

## Hard rules
- Transition only transform/opacity/shadow — never layout props (width/height/padding)
- `prefers-reduced-motion` handled globally, always (see references/css-patterns.md)
- ONE flourish per page (Lottie OR shader OR particles) — see references/flourishes.md
- Amateur tells, auto-reject: bounce-on-everything (1/page max), wild parallax (keep factor 0.1–0.3), cursor-following blobs (dead trend), auto-scrolling faster than user, looping logo animations (once on load)

## References
- `references/css-patterns.md` — keyframes, Tailwind micro-interactions, native scroll-driven CSS, reduced-motion block
- `references/scroll-patterns.md` — Lenis, ScrollTrigger, the Lenis+GSAP wiring gotcha, Intersection Observer hook
- `references/signature-moves.md` — memory layer: pointer trail, route veil, attract CTA, typographic cascade, depth-field hero, frame scrub, mask reveal
- `references/performance.md` — cheap vs expensive properties, will-change, code-splitting heavy libs, Lighthouse CI
- `references/3d-webgl.md` — R3F/Drei/Spline toolchain, camera-on-scroll, GLB compression, 3D perf gates
- `references/flourishes.md` — SVG line-draw, Lottie, particles, GLSL shaders, the one-flourish budget
- `references/frontier.md` — Matter.js/Rapier physics, View Transitions API, WebGPU, AI-driven motion, Awwwards checklist
