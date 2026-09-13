---
name: security-hardening
description: Use before any production launch and whenever handling auth, forms, payments, user data, file uploads, or API routes. Security pass for client sites - HTTP security headers (CSP/HSTS), secrets handling, input validation, rate limiting, RLS verification, dependency hygiene, and the pre-launch security checklist. Gate, securityheaders.com grade A.
---

# Security Hardening

> Scope: marketing/product sites — RLS, honeypots, rate-limiting, session cookies, HTTP headers, plus standard web-security practice. Not a substitute for a real security review on high-risk targets.

## HTTP security headers (every production deploy)
Set via next.config headers / vercel.json / middleware:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (allow only what's used)
- `X-Frame-Options: DENY` (or CSP frame-ancestors)
- `Content-Security-Policy` — strictest that doesn't break the site; start `default-src 'self'`, add per-need; nonce-based for inline scripts (NEVER 'unsafe-inline' for scripts in production; watch nonce propagation through the framework — a mismatch silently kills scripts)
**Gate: securityheaders.com grade A.**

## Secrets discipline
- Secrets in env only; never in code, client bundles, artifacts, or git history
- Server-only keys (`service_role`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`) never reach the browser — verify no `NEXT_PUBLIC_` leak
- `.env*` in .gitignore from the first commit; rotate anything ever committed
- Public repos: scan history before publishing (gitleaks/trufflehog-class); entropy-looking strings in docs/fixtures are findings too

## Input boundaries
- Every API route validates with Zod server-side (client validation is UX)
- Parameterized queries only (Supabase client does this; raw SQL = review item)
- Sanitize anything rendered as HTML (XSS); never `dangerouslySetInnerHTML` with user content
- File uploads: extension+MIME allowlist, size cap, store in bucket (never app filesystem), serve via signed URLs

## Auth & session (verify, don't assume)
- Cookies httpOnly + secure + sameSite; middleware-level route protection (server-side, every protected call)
- RLS on EVERY Supabase table — test as anonymous AND as wrong-user, not just as owner
- Roles enforced in RLS/policies; UI hiding is not authorization
- Rate-limit auth endpoints and forms by IP (Upstash/Vercel KV)

## Payments
- Stripe webhook signature verification MANDATORY (`stripe.webhooks.constructEvent`)
- Price/amount always from server-side data — never trust client-posted amounts
- Test mode end-to-end incl. failure paths before live keys

## Dependency & supply chain
- `npm audit` in CI; pin versions via lockfile; no install of unvetted packages mid-build without flagging
- Third-party scripts: max 3, each loaded from its canonical origin, SRI where static

## Pre-launch security checklist
- [ ] securityheaders.com grade A
- [ ] No secrets in bundle (`grep` build output for key prefixes)
- [ ] RLS verified with negative tests
- [ ] All forms: validated server-side + rate-limited + honeypot
- [ ] Webhooks signature-verified
- [ ] Staging is noindex'd AND not publicly guessable; prod robots.txt correct
- [ ] Error pages leak no stack traces
- [ ] Admin/studio routes behind auth, not just obscure URLs
