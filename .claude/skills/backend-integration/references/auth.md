# Authentication

Login is a solved problem — never roll your own. Provider selection:

| Provider | When | Pricing shape |
|---|---|---|
| Supabase Auth | default if already on Supabase | free, included |
| Clerk | want polished prebuilt UI fast | free ≤10k MAU, then per-MAU |
| Auth.js (NextAuth) | full control, more wiring | free, self-hosted |
| Auth0 | enterprise requirement | free ≤7.5k MAU, then expensive |

## Method ladder
- **Magic link** — friendly default: no passwords, no resets, no support tickets. Only risk = deliverability → custom sender domain (Resend/Loops) required
- **OAuth** — Google (universal), GitHub (dev tools), Apple (iOS), LinkedIn (B2B); dashboard config in Supabase/Clerk
- **OTP (email/SMS 6-digit)** — higher conversion than magic links (user stays in flow); email OTP free, SMS ~€0.05

## Sessions
- Cookies: httpOnly, secure, sameSite
- Refresh tokens for silent re-auth (default in Supabase/Clerk)
- Logout = clear cookies + invalidate session
- Protect server-side: check session in middleware on every protected route/API call — client-side checks are decoration

## Roles
Simple: single role per user. Better: `user_roles` table, multiple roles. **RLS policies must reference roles** — UI hiding is not authorization.

## The converting flow (UX defaults)
1. First touch: magic link only, zero friction
2. After first successful login: offer OAuth ("faster next time")
3. Signup captures email ONLY; name/role/etc collected after first login
4. Loading skeletons during auth resolution — no white flashes

## Generation pattern (Next.js App Router + Supabase)
Emit: login page (magic link + Google OAuth, shadcn/ui form), callback route handler, middleware protecting /dashboard, sign-out button, useUser() hook. Error handling + loading states included. Production-ready.
