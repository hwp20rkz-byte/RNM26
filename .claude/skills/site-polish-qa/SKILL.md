---
name: site-polish-qa
description: Use before launching, delivering, or reviewing any website — and whenever asked to "finish", "polish", "QA", or "audit" a site. The final-5% checklist that separates a cheap deliverable from a premium one - favicon, og:image, 404, focus states, image pipeline, micro-typography, Lighthouse gates, launch-day pass. Run it on every build produced by website-build-workflow.
---

# Site Polish & QA

Building 95% of a site is 80% of the work. The final 5% is the remaining 20% of work — and 100% of perceived value. This skill is that 5%, as an executable checklist. Run every item; fix every fail; never silently skip.

## Launch checklist

**Identity & meta**
- [ ] Custom favicon (no framework default)
- [ ] Custom og:image (test in a share-preview tool)
- [ ] Designed 404 page
- [ ] Page loading state — no white flash

**Brand micro-surface**
- [ ] `::selection` color set
- [ ] Subtle brand-colored scrollbar styling
- [ ] Smooth scroll between anchor sections
- [ ] Cursor effect only if it adds personality — never default-on

**Interaction states**
- [ ] Every button: `:hover`, `:focus-visible`, `:active`
- [ ] Every form input: visible focus ring
- [ ] Skip-to-content link for keyboard users
- [ ] Contact form actually tested end-to-end
- [ ] `prefers-reduced-motion` respected globally

**Content & links**
- [ ] Alt text on every image
- [ ] All links work (crawl them)
- [ ] Copy spell-checked in 2 different tools
- [ ] Footer complete: sitemap, contact, social, ©, current year
- [ ] Privacy policy + terms linked

**Image pipeline**
- [ ] AVIF preferred, WebP fallback, all compressed
- [ ] width+height attributes everywhere (CLS)
- [ ] Hero image preloaded; below-the-fold `loading='lazy'`
- [ ] Hero images get a subtle vignette/gradient overlay for text legibility
- [ ] No obvious overused stock

**Performance gates**
- [ ] Lighthouse ≥90 desktop, ≥80 mobile (production URL, not localhost)
- [ ] Tested on real iPhone + Android + 5 browsers (or closest available emulation, flagged as approximate)

## Micro-details that read as "expensive"
- Tabular numbers in data/finance contexts: `font-feature-settings: 'tnum'`
- Smart (curly) quotes, not straight
- `text-wrap: balance` on headlines (kills orphan words)
- Eyebrow labels: all-caps + 0.1–0.2em letter-spacing
- Shadows in brand HSL with proper alpha — never #00000033
- Image radius 8 or 12px (4px reads dated)
- `text-underline-offset: 4px` on underlined links
- Alternating subtle row tints in tables via :nth-child
- `hyphens: auto` for wide/justified text

## Lite profile — single-file / static builds (no framework)
When the deliverable is a standalone HTML file or framework-less static site, the following items convert: 404 page → n/a (note in handover); framework loading state → ensure no FOUC instead; hero preload → inline-critical CSS; Lighthouse → run if a browser tool exists, otherwise mark `unverified`. Fonts must STILL be self-hosted for production — CDN fonts are acceptable only in throwaway previews and must be flagged.

## Launch-day final pass
1. Walk the site as a sleepy buyer on a phone
2. Print pages to PDF — different context exposes flaws
3. Fresh incognito, no cache
4. Re-run Lighthouse on production
5. Send staging to 3 humans: "what looks weird?" — fix it
6. Ship

## Output format
When auditing, emit a table: check | result (pass/fail) | how it was tested | fix applied or priority (high/med/low). No vague "looks good".
