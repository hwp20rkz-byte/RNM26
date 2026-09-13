# Frontier Techniques

Award-tier differentiation: tomorrow's tech today. All still obey the motion test, flourish budget, reduced-motion, and perf gates.

## 2D physics — Matter.js
Draggable/falling elements with real gravity and collisions (falling-letters hero, sticky floors). Pattern: Engine + Render(transparent bg) + static ground body + per-element rectangles (restitution ~0.6) + MouseConstraint for dragging; full cleanup on unmount (Render.stop, World.clear, Engine.clear). Provide a reset action. Desktop-first; verify touch dragging or disable on mobile.

## 3D physics — @react-three/rapier
Rigid bodies/joints/colliders inside R3F: `<Physics gravity={[0,-9.8,0]}>` wrapping `<RigidBody>` meshes + `<CuboidCollider>` floors. Same 3D perf gates as 3d-webgl.md.

## View Transitions API (native page-morph)
```js
function navigate(to){
  if (!document.startViewTransition) return router.push(to);
  document.startViewTransition(() => router.push(to));
}
```
```css
.hero-image { view-transition-name: hero; } /* same name across pages = browser morphs it */
```
Thumbnail→detail morphs for galleries/case studies. Feature-detect; fallback = instant navigation. Documented fallback is part of done.

## WebGPU
Three.js WebGPURenderer for heavy shaders/compute. Broad Chrome/Edge/Safari support in 2026, but feature-detect and fall back to WebGL regardless.

## AI-driven motion (runtime-generated params)
Server endpoint: user input (e.g. mood) → LLM returns JSON-only animation params `{duration, easing, scaleFrom, yFrom, rotation}` → applied to GSAP/Framer. Strict schema, JSON-only contract, server-side call (key never in client), validated before applying, sane fallback params on parse failure.

## Awwwards-ready checklist (the differentiation bar)
- Original concept — not a Linear clone
- ONE signature animation nobody else has
- Lighthouse 90+/80+ · reduced-motion respected · no-white-flash loading
- Surprising interactive element, used sparingly
- 404 is designed too
- 1–2 sentence intent line pinned at top
