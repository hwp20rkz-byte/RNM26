# Flourishes: SVG, Lottie, Particles, Shaders

Tiny in bytes, huge in personality — and the easiest way to ruin a site by stacking them.

## THE FLOURISH BUDGET RULE
**ONE flourish per page.** One Lottie OR one shader OR one particle layer. Two compete; three read amateur. When in doubt, build the alternatives and compare — the single-flourish version almost always wins.

## SVG line-draw (0KB-class brand reveal)
```css
.draw path { stroke-dasharray: 200; stroke-dashoffset: 200;
  animation: draw 2s cubic-bezier(0.32,0.72,0,1) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
```
Single-path logo/signature, trigger via Intersection Observer. Target total weight <5KB. The highest taste-per-byte move available.

## Lottie (designer-made motion as JSON)
```jsx
import Lottie from 'lottie-react';
<Lottie animationData={anim} loop autoplay style={{ width: 240 }} />
```
For: success states, micro-illustrations, branded loaders. Source: lottiefiles.com or commissioned. Decorative Lottie → `aria-hidden`.

## Particles (tsparticles, slim build)
Atmosphere only: 30–60 particles, opacity ~0.4, speed ~0.5, subtle link lines. More = visual noise + CPU burn. Init engine once (`loadSlim`).

## GLSL shaders (the elite touch)
Premium effects — gradient noise, ink ripples, glass distortion — are fragment shaders on a plane (R3F shaderMaterial, `uTime` uniform driven by `useFrame`). Pattern: orthographic camera + planeGeometry + frag shader mixing 2 brand colors over time/UV.

Workflow: describe the effect in plain language → generate GLSL with comments → iterate visually. Treat the LLM as the GLSL translator; judge results by eye, not by code review.

## Routing note
Shaders and particle systems are strongest-model work; SVG draw and Lottie embeds are fast-model work.
