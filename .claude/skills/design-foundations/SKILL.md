---
name: design-foundations
description: Use when choosing fonts, building a color palette, defining a type scale, setting up design tokens, planning page layout, or fixing a site that "feels cheap/chaotic". Covers typography pairing, HSL palettes, 12-column grid, 8-point spacing, visual hierarchy, and whitespace. Produces tokens.css and a layout plan. Read before writing any CSS for a new site.
---

# Design Foundations

Type and color are the two 80% levers of perceived quality; grid is the invisible discipline users feel as "professional". Lock all three as tokens before building anything.

## Workflow

0. For distinctive briefs: run structural reference synthesis -> `references/reference-synthesis.md` (steal structure, never style)
1. From the brief (industry, audience, 3-word vibe) pick a font system → `references/typography.md`
2. Generate a 7-token HSL palette → `references/color.md`
3. Define the spatial system and per-section layout patterns → `references/layout.md`
3b. For competitive refresh tasks: follow `references/redesign-workflow.md` (diagnostic audit → positioning brief → six-phase plan)
4. Emit `tokens.css` (custom properties: fonts, sizes, palette, spacing scale) and a hierarchy map

## Non-negotiables

- Max 2 fonts (1 display + 1 body; optional mono third), max 5 type sizes
- Exactly 3 colors (primary, accent, neutral) with tonal variants; HSL only
- Every spacing value is a multiple of 8
- One level-1 anchor per section; if everything is emphasized, nothing is
- Contrast: body 4.5:1 minimum, display 3:1, buttons 3:1 against their background
- Never pure #000 on pure #fff — use near-black on near-white (e.g. hsl(225 8% 6%) on hsl(0 0% 98%))

## tokens.css template

```css
:root {
  /* type */
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --text-display: clamp(3.5rem, 8vw, 7rem);   /* 56–112 */
  --text-h1: clamp(2rem, 5vw, 4.5rem);
  --text-h2: clamp(1.5rem, 3vw, 2.5rem);
  --text-body: 1.0625rem;                      /* 17 */
  --text-small: 0.8125rem;                     /* 13 */
  /* color — vary L on fixed H+S for tonal coherence */
  --bg-base: hsl(225 18% 5%);
  --bg-elevated: hsl(225 14% 8%);
  --border-subtle: hsl(225 12% 14%);
  --text-primary: hsl(225 6% 95%);
  --text-mute: hsl(225 8% 60%);
  --accent: hsl(220 100% 65%);
  --accent-hover: hsl(220 100% 75%);
  /* space: 8pt scale */
  --space-1: 8px; --space-2: 16px; --space-3: 24px; --space-4: 32px;
  --space-6: 48px; --space-8: 64px; --space-12: 96px; --space-16: 128px;
  --container: 1360px;
}
```
