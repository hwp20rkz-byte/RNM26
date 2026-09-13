# Typography Reference

## The single fix for 70% of cheap-looking sites
Lock: 1 display font + 1 body font, 4–5 sizes total. Nothing else.

## Pairing strategies
| Strategy | Example | Reads as |
|---|---|---|
| Sans + serif | Space Grotesk + Source Serif | Classic, safe, premium |
| Display sans + humanist sans | Druk + Inter | Editorial, modern |
| Grotesk + mono | Inter + JetBrains Mono | Tech-forward (default for SaaS/dev tools) |
| Serif + grotesk | PP Editorial + Söhne | Luxury |
| AVOID | two similar-weight sans; two serifs; decorative "brand" fonts | amateur |

## Font shortlist (2026)
Free: Inter (default body), Space Grotesk (modern tech display+body), Geist (tech default), Manrope (soft modern), IBM Plex (corporate), JetBrains Mono (code/captions).
Commercial when brief screams premium: Söhne (premium grotesk), PP Editorial New / Migra (modern serif), Druk (massive display, hero only).
Default to free Google Fonts unless premium is justified.

## Type scale
- Pick ONE ratio: 1.25 / 1.333 / 1.414 / 1.5. Apply religiously, max 5 sizes.
- Desktop px: display 80–120 (hero only), h1 48–72, h2 32–40, body 16–18, small 12–14.
- Mobile: scale everything down 25–35% (display → 56–80, h1 → 32–48).

## Micro-rules
- Display letter-spacing: -0.02em … -0.04em (tight = confident)
- Display line-height: 0.95–1.05
- Body line-height: 1.5–1.65
- All-caps eyebrow labels: letter-spacing 0.1–0.2em
- No italic body paragraphs (readability)

## Variable fonts
Prefer variable .woff2, self-hosted (never Google Fonts CDN — CLS + perf). One file = all weights = animatable weight.

## Decision prompt pattern (when generating a system for a brief)
Given industry/audience/vibe, output: 1 display font, 1 variable body font, optional mono, scale ratio, the 5 sizes desktop+mobile, letter-spacing rules for display vs body. Justify each in one sentence.
