---
name: website-build-workflow
description: Use when asked to build a complete website, landing page, or marketing site from scratch or from a brief. Orchestrates the full pipeline — brief analysis, design tokens, layout selection, build, motion pass, polish QA, deploy. Always start here for any "build me a site" task; it delegates to design-foundations, motion-design, and site-polish-qa.
---

# Website Build Workflow

The end-to-end pipeline for shipping an award-grade site. Never skip phases. Never reorder.
Quality bar: a site that could plausibly be submitted to Awwwards/Godly, Lighthouse 90+ desktop / 80+ mobile.

## Phase 0 — Brief lock (before any code)

Extract or ask for: industry, target audience, brand vibe (3 words), required sections, CMS/backend needs, deadline-implied scope.
If a brief is missing, generate a reasonable one and state assumptions explicitly. Do not start building on an ambiguous brief.

Output of this phase: a one-paragraph brief + 3-word vibe. Everything downstream derives from it.

Run the capability-check protocol from `asset-generation` (inventory MCPs/keys per docs/TOOLING.md, report gaps + fallbacks to the user in one message). Then map the brief to an archetype via the `build-playbooks` skill (restaurant / agency / portfolio / saas / ecommerce). The playbook overrides the generic phase plan below with its vertical-specific section structure, phase count, stack choices, and conversion patterns.

## Phase 1 — Design tokens (read skill: design-foundations)

Produce `tokens.css` BEFORE any component:
- Font system: 1 display + 1 body (+ optional mono), type scale ratio, 5 sizes desktop + mobile, letter-spacing rules
- 7-token HSL palette: bg-base, bg-elevated, border-subtle, text-primary, text-mute, accent, accent-hover
- Spacing: 8-point scale (8/16/24/32/48/64/96/128), container max-width 1280–1440, section padding 96–160px

Hard rule: components consume tokens only. No raw hex, no arbitrary px spacing.

## Phase 2 — Layout & hierarchy (read skill: design-foundations)

- Map each section of the brief to one of the 7 dominant layout patterns (see design-foundations/references/layout.md)
- Assign every element a hierarchy level 1–5; exactly one level-1 anchor per section
- 12-column grid; mobile is single-column, restructured — not shrunk

Output: a section-by-section layout plan (pattern + anchor per section) before writing markup.

## Phase 3 — Build (static-first)

Before adding any CMS/auth/payments/forms: run the decision matrix in `backend-integration` — the default is no backend.

- Build all sections with real structure and placeholder-quality-but-plausible copy; no motion yet
- Generate/source assets per `asset-generation` (matrix + compression gates); missing tools degrade per the gap report, never silently
- Semantic HTML, components consume tokens, images with width/height attributes
- Mobile layout built in the same pass, not retrofitted
- Skeleton-first: every section exists end-to-end before any single section is refined

## Phase 4 — Motion pass (read skill: motion-design)

- CSS handles ~70% of motion; add a library only for what CSS can't do (one library per project)
- Every animation must serve one of 4 jobs: status / continuity / hierarchy / personality. No job → cut
- After the pass, cut 30% of animations. Then add `prefers-reduced-motion` handling globally
- Max 1–2 memory-layer moves per site (see motion-design/references/signature-moves.md)

## Phase 5 — Polish & QA (read skill: site-polish-qa)

Run the full checklist: favicon, og:image, 404, loading state, selection/scrollbar styling, hover/focus-visible/active on every interactive element, alt text, link audit, footer completeness, AVIF/WebP compression, hero preload + lazy below-fold, contrast AA, Lighthouse gates.

Also run the `seo-aeo` per-build checklist: schema/JSON-LD, sitemap+robots, title/meta per page, Core Web Vitals on production, hreflang if multilingual, llms.txt.

## Phase 6 — Ship (see references/launch-publishing.md)

Deploy, custom domain + DNS, launch weight audit, launch SEO sweep, client-ready hardening via `security-hardening` skill (gate: securityheaders.com grade A), analytics + Search Console live, verify in incognito + throttled mobile, re-run Lighthouse on production.

## Gate between phases

Do not enter phase N+1 with known failures in phase N. If a tradeoff is forced, log it explicitly in the handoff notes rather than silently shipping it.

## Worked example

See `references/worked-example.md` — a full pipeline trace on a premium subscription one-pager; every downstream decision traces to the 4-paragraph brief. Use as a few-shot template.

## Anti-patterns

- Starting with a hero component instead of tokens
- Designing desktop, then "making it responsive"
- Adding GSAP + Framer + Anime to one project (one, max two libraries)
- Treating polish as optional: the final 5% is 100% of perceived value
