# Analytics & Measurement

A turnkey site ships measuring. Without analytics the conversion targets in the playbooks are unfalsifiable.

## Tool matrix (pick ONE primary, don't stack)
| Tool | When |
|---|---|
| Plausible / Umami (self-host free) | privacy-first default: no cookies → no banner in EU |
| Vercel Analytics | free with Vercel deploys; pageviews + real CWV |
| PostHog | behavioural needs: funnels, session replay, built-in A/B (free ≤1M events) |
| GA4 + GTM | only if client runs Google Ads; requires cookie banner with reject option |
| Fathom | Plausible-class, polished UI |

Max 3 third-party scripts total on a site (analytics counts). Observe 2 weeks before changing anything.

## Search Console — non-negotiable
The only source of real organic data. DNS verification preferred → submit sitemap → monitor coverage, impressions/clicks/position, CWV via Page Experience report. Looker Studio for dashboards.

## The 5 client metrics
1. Organic clicks (Search Console) — the headline
2. Conversions (calls/forms/orders) — from analytics events
3. Conversion rate — the optimizable lever
4. Average position, top-20 keywords
5. Direct + branded traffic — brand-awareness signal

## Event tracking minimum per build
Contact form submit · primary CTA click · checkout/signup start + complete · (vertical-specific: booking, menu view, demo request).

## Monthly report pattern (1 page max)
Headline numbers with MoM delta → top-10 queries (rank+clicks) → top-5 landing pages → wins this month → plan next month. Same day every month.

## Privacy compliance
EU/Brazil/California: explicit consent for non-essential cookies. GA4 → banner mandatory; Plausible/Fathom → none needed. Privacy policy in footer, updated when tools change.

## A/B testing rules
One variable at a time (hero copy / primary CTA / pricing layout) · ≥1,000 visitors per variant · ≥2 weeks before declaring a winner. PostHog free tier covers it.
