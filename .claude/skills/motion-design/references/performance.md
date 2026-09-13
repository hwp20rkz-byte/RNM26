# Animation Performance & Production

An animated site that fails Core Web Vitals is broken, however good it looks. Gates: LCP <2.5s, CLS <0.1, INP <200ms.

## Cheap vs expensive properties
| Animate freely | Why |
|---|---|
| transform | GPU, never triggers layout |
| opacity | compositor-level, free |
| filter (careful with blur) | GPU but blur is costly |
| clip-path (modern) | compositor in modern browsers |

NEVER animate: width, height, top, left, padding, margin, font-size — all trigger layout reflow.

## will-change
```css
.animated-card { will-change: transform, opacity; }
```
Remove it AFTER the animation finishes — leaving it reserves GPU memory permanently.

## Heavy library code-splitting
Three.js/R3F ≈200KB — never on every page:
```jsx
const ThreeScene = lazy(() => import('./ThreeScene'));
<Suspense fallback={<div className='h-[500px]' />}><ThreeScene /></Suspense>
```
Fallback reserves the height (CLS protection).

## Image & font checklist (overlaps polish — both enforce it)
AVIF/WebP only for photos · width+height on every img · lazy below-fold · self-hosted subsetted fonts with font-display: swap · preload hero image + primary font.

## Accessibility line
- prefers-reduced-motion everywhere (repeat: everywhere)
- Decorative SVG/Lottie → aria-hidden="true"
- Interactive 3D → static-image fallback
- Animations ≤5s; infinite loops need a pause control
- WCAG contrast applies to text-over-video too

## Lighthouse CI (make slow code unmergeable)
```json
// .lighthouserc.json
{ "ci": { "collect": { "url": ["http://localhost:3000/"], "numberOfRuns": 3 },
  "assert": { "assertions": {
    "categories:performance": ["error", { "minScore": 0.85 }],
    "categories:accessibility": ["error", { "minScore": 0.95 }] } } } }
```
`npx lhci autorun` in CI on every PR; a deliberately slow PR must get blocked — that's the test the setup works.
