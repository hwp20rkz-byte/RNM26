---
name: backend-integration
description: Use when a site needs a CMS, database, user accounts/auth, payments/subscriptions, contact forms, transactional email, or automation workflows — and crucially when deciding whether it needs any of those at all. Covers Sanity, Supabase (Postgres/RLS/realtime/storage), auth flows, Stripe (Payment Links → Checkout → Subscriptions), Resend/forms, and serverless/n8n automation. Consult the decision matrix BEFORE adding any backend.
---

# Backend Integration

**The default is NO backend.** Premature backend burns budget and creates maintenance debt + security responsibility. Half the skill is knowing when not to use it.

## Decision matrix (run first, always)

| Need | Solution |
|---|---|
| Static content, rare changes | No backend. Markdown in Git. |
| Client edits weekly | Headless CMS (Sanity default; Notion-as-CMS for tiny) |
| 1–5 form submissions/day | Form-to-email. No backend. |
| Selling 1–10 SKUs | Stripe Payment Links. No backend. |
| Payments + custom checkout | Stripe Checkout + serverless route |
| 50+ products with inventory | Shopify or full backend |
| User accounts / login | Supabase Auth or Clerk |
| Transactional email | Resend (no auth infra needed) |
| Subscriptions / recurring | Stripe Subscriptions + webhook handler (MANDATORY) |
| Real-time features | Supabase realtime / Pusher |
| Client admin view | Notion-as-CMS first, upgrade only if outgrown |

## The 80/20 default stack (free tiers cover most client work)
Sanity (CMS) · Supabase (auth+DB+storage) · Stripe (payments) · Resend (email) · Vercel (hosting+functions). Typical monthly infra cost for a small client: ~0.

## Failure modes to avoid
- Supabase added "for later" → cost + maintenance + security surface for nothing
- Shopify for 5 products → overkill; Payment Links did the job
- No CMS when client edits often → every typo becomes a support request
- Stripe Subscriptions WITHOUT a webhook handler → cancellations/renewals silently break (the classic)

## References
- `references/sanity.md` — schemas-as-code, GROQ, image transforms, client handoff
- `references/supabase.md` — Postgres+RLS patterns, realtime scope, storage, edge functions
- `references/auth.md` — magic links/OAuth/OTP, sessions, roles, the converting flow
- `references/stripe.md` — Payment Links → Checkout → Subscriptions ladder, webhooks, portal, EU specifics
- `references/forms-email.md` — Resend, DNS (SPF/DKIM/DMARC), form hardening, React Email
- `references/automation.md` — Vercel functions vs n8n vs Trigger.dev, standard client workflows
