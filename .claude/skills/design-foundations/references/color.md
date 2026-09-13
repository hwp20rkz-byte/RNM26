# Color Reference

## Rule of three
Primary (hero color) + Accent (CTAs/highlights) + Neutral (text/bg/borders). Tonal variants of each are fine. A 4th color breaks harmony unless brand-mandated.

## HSL is the thinking format
Build palettes by varying L (lightness) on a fixed H+S → instant coherent tonal scale.
- H 0–360: same hue family = harmony
- S: high = vibrant, low = quiet
- L: drives the tonal ladder

## The cinematic dark template (battle-tested default; swap accent hue per brand)
```css
--bg-base: hsl(225 18% 5%);        /* very dark navy */
--bg-elevated: hsl(225 14% 8%);
--border-subtle: hsl(225 12% 14%);
--text-primary: hsl(225 6% 95%);
--text-mute: hsl(225 8% 60%);
--accent: hsl(220 100% 65%);       /* electric blue */
--accent-hover: hsl(220 100% 75%);
```

## Vibe → hue mapping
| Vibe | Palette direction |
|---|---|
| Premium / luxury | deep navy, charcoal, ivory, gold accent |
| Cinematic / tech | near-black + electric blue or violet |
| Playful / agency | hot pink, lime, electric yellow |
| Wellness / calm | sage, warm beige, terracotta |
| Editorial / craft | black, white, single color pop |
| Brutalist | pure-contrast B/W + one loud pop |

## Accessibility gates
- Body text 4.5:1 (WCAG AA), display ≥3:1, buttons ≥3:1 vs their background
- Hover states: shift lightness OR saturation by ≥15%
- Verify with webaim.org/resources/contrastchecker

## Known mistakes (auto-reject in review)
- #000 on #fff (use near-black on near-white)
- Gradients with >2 colors
- Different accent hues per section — one accent, repeated
- Coloring border + text + background simultaneously — color exactly one
- No dark-mode equivalents designed

## Generation pattern
From industry + 3-word vibe → emit the 7 tokens as CSS custom properties, one-sentence justification each, plus 1 alternative palette as fallback.
