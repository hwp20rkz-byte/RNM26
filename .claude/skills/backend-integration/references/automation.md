# Automation & Serverless Workflows

Every client site accumulates 10+ small workflows. Don't code them from scratch each time — route to the right runtime.

## Runtime selection
| Tool | When |
|---|---|
| **Vercel Functions** (default) | webhook handlers, AI calls, simple cron; free ≤500k inv/month; pair with Vercel KV (state) / Upstash Redis (queues) |
| **n8n** (self-hosted Docker or cloud) | visual "when X → do Y → then Z", 400+ integrations (Stripe, Resend, Slack, Notion, GitHub…), Claude/AI nodes inside flows |
| **Trigger.dev** | code-first TypeScript workflows, version-controlled, long-running jobs/retries/scheduling beyond function timeouts; free ≤10k runs/month |

Rule of thumb: glue between SaaS tools → n8n; logic owned by the codebase → Vercel function; long multi-step jobs → Trigger.dev.

## Standard client workflow pack
- New Stripe customer → tag in email tool + Slack notification
- Form submission → Supabase + Resend email + client Slack post
- Daily: competitor-site snapshot + alert on change
- Weekly: client digest (orders, leads, traffic)
- Monthly: PDF invoice generation → client + accountant

## n8n generation pattern
From a trigger+steps+outputs description → importable workflow JSON with error handling, retries on transient failures, final success-notification node, standard nodes only.

## Quality bar
Every workflow ships with: error handling, retry policy on transient failures, and a failure notification path. A workflow that fails silently is worse than no workflow.
