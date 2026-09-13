# Forms & Email

A contact form landing in spam is the silent killer of small-business sites. Deliverability is DNS work, not code work.

## Tool split
- **Resend** — transactional (free ≤3k/month, 100/day): notifications, confirmations, receipts, magic links
- **Loops** — marketing (free ≤1k contacts): welcome sequences, newsletters, drips
Together they cover everything. Don't send marketing through Resend or transactional through Loops.

## DNS setup (do this BEFORE sending anything real)
SPF (who may send) + DKIM (signing key) + DMARC (policy for unsigned mail) — Resend provides exact records, paste into the DNS provider, verify. Then score on mail-tester.com; target 10/10. A form without verified DNS is an unfinished form.

## Form hardening (every form, every site)
- Honeypot hidden field (bots fill it → drop)
- Rate limiting by IP (Vercel KV / Upstash Redis)
- Server-side validation with Zod (client-side is UX, not security)
- Clear success state in the UI, not just a redirect
- Confirmation email to the user (they know it arrived)
- **Save submissions to Supabase as backup** — email can fail, the DB shouldn't

## Generation pattern (the standard contact form)
Next.js App Router: form component (name/email/message, React Hook Form + Zod, shadcn/ui), `/api/contact` route via Resend sending owner-notification + user-confirmation, success/error states, honeypot, IP rate limit.

## React Email
Templates as components; `npm run email` preview; dark mode, responsive, plain-text fallback automatic; native Resend integration.

## The 7 standard client email types (~30–60 min each once patterned)
Contact notification + confirmation · welcome · order confirmation · password reset / magic link · newsletter (Loops) · receipt/invoice · shipping notification.
