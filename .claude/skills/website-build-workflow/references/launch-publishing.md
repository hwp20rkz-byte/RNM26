# Launch & Publishing (Phase 6 reference)

A live URL is part of the deliverable — not an afterthought. Execute this sequence before handover.

## Deploy (Vercel default)
1. Push to GitHub (`git init` → commit → `gh repo create` → push)
2. Vercel → Add New Project → select repo → framework auto-detected → Deploy
3. Verify: every push to `main` auto-deploys; every PR gets a preview URL
4. Wire Lighthouse CI on PRs (config in `motion-design/references/performance.md`)

## Custom domain (~10 min)
1. Registrar: Cloudflare / Namecheap-class
2. Vercel → Domains → add apex + `www`
3. Paste shown DNS records at registrar (A record + CNAME for www)
4. Wait for propagation; SSL auto-issued
5. Verify: HTTPS padlock, `www` → apex redirect clean

## Launch weight audit (pre-ship performance sweep)

Five load factors to neutralize before the client sees production:

| Factor | Symptom | Fix |
|---|---|---|
| **Media** | LCP >2.5s, multi-MB heroes | AVIF/WebP via `next/image`; hero ≤180KB; responsive srcset |
| **JavaScript** | TBT spikes, long tasks | Code-split routes; dynamic-import Three/Spline; tree-shake |
| **Fonts** | FOIT/FOUT, CLS | `next/font` or self-host subset; `font-display: swap`; ≤3 weights |
| **Third-party** | Main-thread blocking | Cap at **2** scripts (analytics + one optional); defer/async |
| **Server/TTFB** | Slow first byte | SSR/SSG content pages; edge caching; no cold-start API on LCP path |

## Performance triage pattern (when Lighthouse data exists)
From Lighthouse mobile report + network waterfall → output:
1. Single biggest LCP bottleneck + one-line fix
2. Top 3 JS payloads + lazy-loadable yes/no
3. Font issues + concrete fix
4. Estimated ms gain per fix, priority-ranked (skip fixes projected <80ms)

## Launch SEO sweep (overlaps `seo-aeo` — both enforce)
Unique title ≤60 chars per page · meta description ≤155 (sells the click) · one H1 matching search intent · descriptive alt text · `sitemap.xml` + `robots.txt` · OG tags verified in a real share preview · Search Console: verify + submit sitemap.

## Client-ready hardening pass
- Branded 404 **and** error page (not framework defaults)
- Favicon + apple-touch-icon
- Security headers → run `security-hardening` skill; gate: **securityheaders.com grade A**
- Privacy + Terms in footer
- Form submissions land somewhere real (inbox or DB) — tested end-to-end
- Re-verify CWV "Good" in real-user data 48h post-launch
