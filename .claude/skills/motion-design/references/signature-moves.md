# Memory Layer — distinctive interaction vocabulary

Techniques that make a site memorable without decorating every pixel. Pick **1–2 per project**, reuse across projects for a recognizable Synapsea signature. Every technique must respect `prefers-reduced-motion` and degrade on touch / low-end devices.

## Selection rule
Before adding any item below, run the motion test (status / continuity / hierarchy / personality). No job → skip. Two memory-layer moves maximum per site.

---

## 1. Pointer trail (desktop only)
A lagging outer ring + instant inner dot replaces the default cursor on fine pointers only.

**Spec:** hide native cursor on `(hover: hover) and (pointer: fine)`; outer ring 24px with spring stiffness ~180; inner dot 4px tracks immediately; over `[data-trail='expand']` ring scales to 56px at 60% opacity; over text inputs revert to native caret; touch devices keep system cursor. Implement with motion values — never layout-triggering left/top updates.

---

## 2. Route veil (App Router page transitions)
Soft cross-fade between routes so SPAs feel intentional, not abrupt.

**Spec:** wrap `{children}` in `app/template.tsx` (templates remount per segment — ideal for transition boundaries). Use `AnimatePresence mode="wait"` keyed by `usePathname()`. Enter: opacity 0→1 over 240ms; exit: opacity 1→0 over 180ms; optional 8px Y translate on enter only. Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`. Verify scroll restoration on back navigation; under reduced motion → instant swap. For hash/anchor links use `<Link scroll={false}>` when preserving scroll position.

---

## 3. Attract CTA
Primary buttons subtly lean toward the pointer — signals interactivity without bounce.

**Spec:** child translates toward cursor with damping **0.25**, max displacement **8px** any axis, spring return on leave; `pointer-events` enabled (stylus-safe). One attract CTA per viewport max.

---

## 4. Typographic cascade
Headlines decompose into units that reveal in sequence — the highest-ROI hero move.

**Spec:** `<TypographicCascade text="..." unit="word"|"char"|"line" gap={40} />`; each unit fades + rises **8px**; triggers once via Intersection Observer; preserve kerning on display faces (no per-char transforms on connected scripts).

---

## 5. Depth-field hero (react-three-fiber)
Custom WebGL when stock 3D embeds aren't enough.

**Spec:** dark scene, single brand-colored primitive; **24°** Y-rotation tied to first-scroll progress; mouse parallax camera offset ≤**16px**; light bloom + film grain optional; **mandatory fallback:** `navigator.hardwareConcurrency <= 4` OR `navigator.deviceMemory <= 4` → static poster; single `HeroScene.tsx`, `dynamic(..., { ssr: false })`. Targets: 60fps desktop, mobile shows poster, Lighthouse mobile ≥70.

Cleanup: wrap all GSAP/r3f setup in `gsap.context()` / `useGSAP()` and revert on unmount.

---

## 6. Frame scrub (scroll-driven product story)
Scroll scrubs through a pre-rendered frame sequence — editorial product reveals.

**Spec:** export **48–90** WebP frames (≤**35KB** each, ≤**2MB** total) → preload → canvas draw → scroll progress maps to frame index. Gates: no frame skipping on fast scroll, LCP-friendly poster before sequence loads.

---

## 7. Progressive mask reveal (niche, high craft)
Section enters via expanding `clip-path` or SVG mask — strong for brand moments.

**Spec:** inset mask from `inset(100% 0 0 0)` → `inset(0)` over 700ms on viewport enter; decorative only → `aria-hidden="true"`; reduced motion → show final state immediately.

---

## Delegation note
Pointer physics, App Router transitions, r3f scenes, mask animations → strongest available model. Attract CTAs and typographic cascade → fast model is sufficient.
