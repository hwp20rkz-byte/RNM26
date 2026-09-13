# CSS Motion Patterns

## Transform-only motion (GPU, never triggers layout)
translate / scale / rotate / skew(sparingly). These are the cheapest motion in the browser — default to them.

## The Linear-grade staggered reveal
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 700ms cubic-bezier(0.32, 0.72, 0, 1) both; }
.fade-up.delay-1 { animation-delay: 100ms; }
.fade-up.delay-2 { animation-delay: 200ms; }
.fade-up.delay-3 { animation-delay: 300ms; }
```

## Tactile button (Tailwind that doesn't look like Tailwind)
```html
<button class="transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
  hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30
  active:scale-[0.98] rounded-2xl px-6 py-3 bg-accent text-white">
```
Three permanent rules: transition transform+shadow only; snap easing on entrances; tiny active scale-down for tactility.

## Native scroll-driven animation (zero JS, Chrome/Edge, graceful fallback)
```css
.progress {
  position: fixed; inset: 0 auto auto 0; width: 100%; height: 4px;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  transform-origin: left;
  animation: progress linear;
  animation-timeline: scroll(root);
}
@keyframes progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

## Reduced motion — mandatory global block
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Ship this on every project. EU/US accessibility requirements increasingly mandate it.
