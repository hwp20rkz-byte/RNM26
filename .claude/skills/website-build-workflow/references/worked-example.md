# Worked Example — premium subscription one-pager ("Verdant Ritual" pattern)

A reference walkthrough of the full Synapsea pipeline on a compact brief. Use as the few-shot template for any "premium product, single page, converts a subscription" build.

## Phase 0 — Brief lock (four paragraphs; planning time pays back in build time)
| Paragraph | Example content |
|---|---|
| Who | urban renters who want greenery but repeatedly kill houseplants |
| What | monthly curated low-maintenance plant kits with care cards and seasonal swaps |
| Why different | species matched to light/humidity profile, ceramic pots included, pause or skip anytime |
| Feel | "Botanical editorial": calm, tactile, confident; deep forest base, warm stone accents |

## Phase 1 — Tokens (derived from the Feel paragraph)
```css
/* excerpt — full tokens.css per design-foundations */
--bg-base: hsl(150 14% 7%);
--bg-elevated: hsl(150 10% 11%);
--text-primary: hsl(45 8% 94%);
--accent: hsl(38 42% 78%);
--font-display: 'Instrument Serif', serif;
--font-body: 'DM Sans', sans-serif;
--ease-default: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--duration-reveal: 550ms;
```
Subtle paper-grain overlay reserved for hero only.

## Phase 2 — Section plan (6 sections, conversion-ordered)
1. **Hero** — abstract terracotta pot form (left visual desktop / stacked mobile), outcome headline, sub, primary CTA with price ("Begin your ritual — $29/mo")
2. **Problem** — one centered hook ("Most plants fail before they get a chance")
3. **The ritual** — 3 steps as cards, 80ms stagger
4. **This month's kit** — featured species card: origin climate, care level, pot finish
5. **Proof** — 3 short testimonials + two press mentions
6. **Pricing + FAQ** — single plan, includes-list, cancel-anytime note, 3 accordion questions, final CTA

## Phase 3–4 — Build + motion notes
- 3D hero spec: symbolic geometry (not photoreal product), matte terracotta material, soft key + rim lighting, gentle mouse tilt (≤8°), 24° Y-rotation over first 80vh scroll, gradient scrim for text legibility
- Mobile: 3D replaced by static poster; reduced-motion: static hero image
- Waitlist CTA → form-to-email via Resend (default) or `/api/waitlist` + Supabase only when the brief requires a dashboard

## Phase 5 — Polish pass specifics (the deliverable delta)
| Item | Recipe |
|---|---|
| Grain | 512×512 SVG noise tile, 2.5% opacity, fixed |
| Favicon | custom mark, never framework default |
| OG image | editorial card, logo + ≤8-word headline (@vercel/og or static) |
| Micro-copy | every CTA = verb + outcome; FAQ in the customer's voice; ban "Learn more" / "Get started" |
| 404 | same grain + one on-brand line |
| Loading | hero skeleton while 3D loads; submit button shows inline pending state |

## Why this example matters
Every decision traces to the four-paragraph brief — the Feel paragraph alone drives tokens, motion easing, hero concept, and copy voice. Swap the vertical (skincare, stationery, meal kits) but keep the traceability chain: brief → tokens → sections → motion → polish.
