---
name: seo-aeo
description: Use when handling SEO, search rankings, Core Web Vitals, schema/JSON-LD markup, sitemaps, meta tags, hreflang, llms.txt, AI-search visibility (ChatGPT/Claude/Perplexity citations), or writing content meant to rank. Covers technical SEO, the dual-write method for humans+LLMs, and llms.txt generation. Apply during the polish phase of every build and for all content work.
---

# SEO & AEO (Answer Engine Optimization)

Google ranks pages; LLMs ingest passages and synthesize answers. Every site optimizes for both readers. Technical layer first, content layer second, AI layer third.

## Layer 1 — Technical (every build, non-negotiable)

**Core Web Vitals gates** (real ranking factors; measure on CrUX/PageSpeed, not just local Lighthouse):
- LCP < 2.5s → preload hero, next/image priority, font-display: swap
- CLS < 0.1 → width/height on every img, reserve embed space, stable fonts
- INP < 200ms → minimize main-thread work, defer non-critical JS, lazy below-fold

**Rendering**: SSR/SSG for content pages (App Router server components = SSR by default). Pure CSR = slow/never indexing. Internal links are real `<a href>`, never button onClick.

**Schema (JSON-LD in head)**: pick per page type — Article, Product, FAQ, HowTo, Event, LocalBusiness, Restaurant, Person, Organization. Validate at schema.org/validator. Rich snippets = CTR.

**Plumbing**: Next.js `sitemap.ts` + `robots.ts`; submit sitemap to Search Console; hreflang (self-referencing + x-default) for multilingual.

**Killers to check on every launch**: CDN auto-minify breaking JSON-LD; staging `noindex` left on prod; mixed content; trailing-slash duplicates; soft 404s returning 200.

## Layer 2 — Dual-write content (see references/dual-write.md)

The 7-section template, human-readability rules, LLM-citability rules, pillar+cluster strategy.

## Layer 3 — AI visibility (see references/llms-txt.md)

llms.txt + llms-full.txt generation, AI crawler policy, citation engineering, tracking.

## Measurement (see references/analytics.md)

Analytics tool matrix, Search Console setup, the 5 client metrics, event tracking minimum, privacy compliance, A/B rules. A build ships measuring or it isn't done.

## Local businesses (see references/local-seo.md)

GBP 100% checklist, NAP consistency, citations, reviews, multi-location pages. Mandatory for restaurant/clinic/salon-type builds.

## Per-build checklist (run in polish phase)
- [ ] Schema for every relevant page type, validated
- [ ] sitemap.xml + robots.txt generated and correct (staging blocked, prod open)
- [ ] Title tags + meta descriptions per page (pattern: `<Name> | <Category> in <City>` for local)
- [ ] CWV all green on production URL
- [ ] hreflang if multilingual
- [ ] llms.txt at root (+ llms-full.txt via build script for content-heavy sites)
- [ ] AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) allowed unless client opts out
