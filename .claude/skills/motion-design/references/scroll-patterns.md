# Scroll Experience Patterns

Scroll quality is perceived quality. Three layers, cheapest first: native reveal → smooth scroll → pinned/scrubbed scenes.

## Layer 1 — Intersection Observer reveal (default, no library)
```js
export function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setInView(true), obs.disconnect()),
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}
```
Use for fade/slide-on-view — lighter than any animation library.

## Layer 2 — Lenis smooth scroll (optional polish)
```js
import Lenis from 'lenis';

export function useLenis(enabled = true) {
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let rafId;
    const raf = (time) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(rafId); lenis.destroy(); };
  }, [enabled]);
}
```
Call once in root layout. Disable on reduced-motion and low-end devices.

## Layer 3 — ScrollTrigger pinned scene
```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(ScrollTrigger);

useGSAP(() => {
  const ctx = gsap.context(() => {
    gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=180%', scrub: 0.8, pin: true },
    })
    .to('.scene-bg', { scale: 1.25, ease: 'none' })
    .to('.scene-title', { yPercent: -80, opacity: 0, ease: 'none' }, 0)
    .from('.scene-next', { yPercent: 60, opacity: 0, ease: 'none' }, 0);
  }, ref);
  return () => ctx.revert();
}, { scope: ref });
```
Mobile: pinning often breaks — degrade to sequential IO reveals. Call `ScrollTrigger.refresh()` after fonts/images load.

## Lenis + ScrollTrigger wiring (when both are active)
```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

## Horizontal gallery (vertical scroll drives horizontal movement)
Per GSAP best practice — animate `xPercent`, not fixed `vw` magic numbers:
```js
const scrollTween = gsap.to('.gallery-track', {
  xPercent: () => {
    const track = document.querySelector('.gallery-track');
    const panel = track?.parentElement;
    if (!track || !panel) return 0;
    return -100 * (track.scrollWidth / panel.offsetWidth - 1);
  },
  ease: 'none',
  scrollTrigger: {
    trigger: '.gallery-wrap',
    pin: true,
    start: 'top top',
    end: () => '+=' + document.querySelector('.gallery-track')!.scrollWidth,
    scrub: true,
  },
});
```
Nested triggers inside horizontal sections use `containerAnimation: scrollTween`.

## Pattern menu
| Pattern | When to use |
|---|---|
| Pinned hero with scrub | Product storytelling, cinematic heroes |
| Horizontal gallery inside vertical scroll | case studies, feature tours |
| Subtle parallax (factor 0.08–0.25) | editorial heroes only |
| Snap-to-section | presentation-style landings (use sparingly) |
