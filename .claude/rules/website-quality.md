# Website Quality Rules (always-on)

Apply to ALL website/frontend work in this workspace, regardless of which skills load.

## Tokens before components
No component is written before tokens.css exists (fonts, type scale, 7-token HSL palette, 8pt spacing scale). Components consume tokens only — raw hex values and arbitrary px spacing are review failures.

## Type & color limits
Max 2 fonts + optional mono. Max 5 type sizes. Exactly 3 brand colors (primary/accent/neutral) with tonal variants, HSL only; semantic status colors (success/error/warning) are additionally allowed but only for status, never decoration. Contrast: body 4.5:1, display 3:1, buttons 3:1. Never #000-on-#fff.

## Spatial discipline
8-point spacing everywhere. 12-column grid. Container ≤1440px. Section padding 96–160px desktop, −30–40% mobile. One hierarchy anchor per section.

## Motion discipline
- CSS/transform/opacity first; animate layout properties never
- Every animation serves status / continuity / hierarchy / personality — or gets cut
- After any motion work: cut 30%
- `prefers-reduced-motion` global block on every project — non-negotiable
- One animation library per project (decision matrix in motion-design skill)
- Mobile durations −20%

## Mobile is a layout, not a scale factor
Single column, restructured stacking, ≥44px touch targets, hover effects removed or replaced with tap states.

## Performance gates (block ship if failed)
Lighthouse ≥90 desktop / ≥80 mobile on production URL. Images AVIF/WebP with width+height. Hero preloaded, below-fold lazy. Self-hosted variable .woff2 fonts.

## Security gate (block ship if failed)
Production deploys pass the security-hardening checklist: headers grade A, no secrets in bundle, server-side validation everywhere, RLS negative-tested, webhooks signature-verified.

## Definition of done
A build is not "done" until the site-polish-qa checklist passes. Skeleton-first assembly applies to drafts — but nothing ships at 95%.
