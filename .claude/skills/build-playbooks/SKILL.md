---
name: build-playbooks
description: Use when building a site for a specific vertical — restaurant/hospitality, agency/studio, personal portfolio, SaaS landing, or e-commerce store. Provides the archetype playbook - required sections, phase plan, default stack, conversion patterns, vertical-specific SEO, and image strategy. Pick the playbook in Phase 0 of website-build-workflow; it overrides generic section planning.
---

# Build Playbooks — the 5 archetypes

Almost every site brief maps to one of 5 archetypes. Each has a proven structure; do not reinvent it. Constraint beats open-endedness: the playbook defines scope, the phases define order.

## Archetype selector

| Signals in brief | Playbook |
|---|---|
| menu, reservations, hours, local business food/hospitality | `references/restaurant.md` |
| studio, creative work showcase, "cinematic", case studies | `references/agency.md` |
| individual creative: designer, photographer, architect | `references/portfolio.md` |
| product, trial/signup, pricing tiers, B2B | `references/saas.md` |
| products for sale, cart, checkout, catalog | `references/ecommerce.md` |

Hybrid briefs: pick the dominant archetype, borrow sections from the secondary.

## Default stack (use unless brief dictates otherwise)

- Next.js (App Router) + Tailwind + shadcn/ui + Framer Motion (+GSAP only if scroll-cinema needed)
- Vercel hosting, Cloudflare DNS
- Sanity (or MDX/Notion) for editable content
- Resend for transactional email, Stripe Checkout for payments
- Plausible or PostHog analytics
- Conventions: TypeScript everywhere; server components by default ('use client' only when needed); no inline styles; next/image for all images; reduced-motion respected; no package installs without bundle check

## Phase plan template (the "5-day rhythm", phases for an agent)

1. **Brief + design lock** — 1-page brief, tokens (design-foundations), wireframe of all sections
2. **Skeleton** — all sections static, responsive, deployed to preview
3. **Motion + integrations** — animations (motion-design), forms, CMS, payments
4. **Polish + content** — final copy, images, meta, schema, polish checklist (site-polish-qa)
5. **Launch** — Lighthouse pass, domain, handover notes

Each vertical reference adjusts this plan (agency/SaaS = 7 phases, e-commerce = 10).

## Project CLAUDE.md template (pin to every generated repo)

```markdown
# Project rules
## Stack
Next.js App Router · Tailwind · Framer Motion (+GSAP if scroll scenes) · shadcn/ui · Sanity · Resend · Stripe
## Conventions
TypeScript everywhere. Server components by default. Tailwind only, no inline styles.
All animation respects prefers-reduced-motion. All images via next/image.
## Forbidden
Inline styles. Unchecked package installs. Shipping without the polish checklist.
```

## Handover artifact (every build ends with one)

Produce a handover note: what was built, staging/prod URLs, CMS edit instructions, Lighthouse scores, known tradeoffs, and a 30-day care suggestion. Specific and short — the written equivalent of a 60-second status update.
