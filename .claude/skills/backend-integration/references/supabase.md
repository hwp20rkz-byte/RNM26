# Supabase

Real Postgres + Auth + Storage + Realtime + Deno edge functions, managed. Free tier: 500MB DB, 1GB storage, 500k function invocations/month.

## Setup rules
- `createClient(url, anonKey)` in frontend
- `service_role` key on server ONLY — never in browser (review failure if found)

## Schema discipline
- **RLS enabled on every table, no exceptions**
- Foreign keys with `ON DELETE CASCADE`
- Index frequently-queried columns
- `created_at` / `updated_at` triggers
- `profiles` table linked to `auth.users` via trigger

## Access patterns (pick per table)
| Pattern | Use |
|---|---|
| Public read + auth write | comments, public posts |
| User-scoped (`user_id` + RLS owner-only) | personal data default |
| Org-scoped (`org_id` + membership RLS) | team products |
| Soft delete (`deleted_at` instead of DELETE) | anything recoverable |

## Schema generation pattern
From feature list → single migration file: CREATE TABLE statements, indexes, RLS policies per operation (select/insert/update/delete, default = owner-only), profiles trigger. Paste-ready for SQL Editor.

## Realtime — scope it
USE for: live comments, notifications, presence.
DO NOT use for: regular CMS/content reads — cache those.
`supabase.channel(...).on('postgres_changes', ...)`

## Edge functions (Deno, via CLI)
For: webhook handlers (Stripe/Resend), AI calls, scheduled jobs.

## Storage
Buckets public or authenticated; RLS policies same as tables; image transforms via URL params; signed URLs for temporary private access.

## Typical first real use on a client site
Replace form-to-email with: form → Supabase table (RLS: only client reads) → tiny admin view. Email keeps flowing via Resend, DB is the source of truth/backup.
