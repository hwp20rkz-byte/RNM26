# Stripe Payments

Complexity ladder — always start at the lowest rung that satisfies the brief:

## 1. Payment Links (no code, no backend)
Dashboard-created URL, share anywhere. For 1–10 SKUs, pre-orders, donations, client deposit invoicing. Works in plain HTML/Notion/anything.

## 2. Stripe Checkout (hosted)
You create a session, Stripe hosts the payment UI. Cards, Apple/Google Pay, SEPA, Klarna. Enable Stripe Tax for automatic VAT.

Generation pattern (Next.js App Router):
1. `/api/checkout` route → creates Checkout session (price ID from body)
2. Frontend button POSTs and redirects to the Stripe URL
3. Success + cancel routes
4. `/api/webhooks/stripe` listening for `checkout.session.completed` → write order to Supabase
TypeScript SDK, full error handling.

## 3. Subscriptions (Customer + Subscription + Price)
**The webhook handler is MANDATORY — without it cancellations and renewals silently fail.** This is the most common Stripe integration bug.

Listen for: `customer.subscription.created` / `.updated` / `.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`. Mirror state into a Supabase `subscriptions` table.

Dev testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` + a real low-value transaction before launch.

## Customer Portal (always enable with subscriptions)
Stripe-hosted: update payment method, cancel, view invoices. Massive support-ticket reduction. Enable in dashboard, redirect via API.

## EU specifics
- Stripe Tax (~+0.5%) once selling across EU countries; B2B reverse-charge VAT handled (collect VAT number)
- Local methods raise conversion: SEPA Direct Debit (recurring B2B), Klarna BNPL (+5–15% retail conversion), country-specific methods per market (e.g. Multibanco/MB WAY for PT)
- Stripe Invoicing for automatic invoices

## Launch gate
No payment feature ships without: webhook tested end-to-end, a real test transaction completed, failure paths (declined card, cancelled sub) verified.
