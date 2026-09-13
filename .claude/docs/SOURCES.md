# Skills Coverage — Synapsea Web Skills

Coverage map for the Synapsea Web Skills plugin.
Status: ✅ shipped · ⏳ planned · ➖ out of agent scope (human-only workflows)

## Pillar 1 — Craft

### Visual design → `design-foundations`
- ✅ Typography, color (HSL), grid & hierarchy
- ✅ Reference synthesis workflow → `references/reference-synthesis.md`
- ✅ Competitive refresh workflow → `references/redesign-workflow.md`

### Motion & interaction → `motion-design`
- ✅ CSS foundations, JS library selection
- ✅ Scroll patterns, memory-layer moves
- ✅ 3D/WebGL → `references/3d-webgl.md`
- ✅ SVG, Lottie, particles → `references/flourishes.md`
- ✅ Performance budgets → `references/performance.md`
- ✅ Frontier techniques → `references/frontier.md`
- ➖ Local dev environment setup (human-only)

### End-to-end build → `website-build-workflow`
- ✅ Orchestrated pipeline: brief → design → build → motion → polish → ship
- ✅ Worked example → `references/worked-example.md`
- ✅ Launch & publishing → `references/launch-publishing.md`
- ⏳ Integration quests, advanced boss-battle scenarios

### Backend & integrations → `backend-integration`
- ✅ When-to-backend decision matrix
- ✅ Sanity CMS, Supabase, authentication, Stripe, forms/email
- ✅ Edge functions & automation → `references/automation.md`
- ➖ No-code CMS paths (not relevant for code-first agents)

### Vertical playbooks → `build-playbooks`
- ✅ Live-build rhythm, default stack, CLAUDE.md template
- ✅ Restaurant, agency, portfolio, SaaS, e-commerce archetypes
- ➖ Streaming / public build habits (human-only)

### Assets → `asset-generation` + `docs/TOOLING.md`
- ✅ AI stack decision matrix, AI-vs-real rules, studio workflow
- ✅ Delivery gates, provenance log, integration failure handling
- ✅ MCP/key tooling manifest → `docs/TOOLING.md`
- ➖ Per-tool UI walkthroughs (superseded by MCP/API access)

### Security → `security-hardening`
- ✅ HTTP headers/CSP, secrets discipline, input validation
- ✅ RLS negative tests, webhook verification, dependency hygiene
- ✅ Pre-launch security checklist (gate: securityheaders.com grade A)

## Pillar 2 — Growth & operations

### SEO & AEO → `seo-aeo`
- ✅ Technical SEO, Core Web Vitals, schema markup
- ✅ Dual-write content strategy → `references/dual-write.md`
- ✅ llms.txt & AI discoverability → `references/llms-txt.md`
- ✅ Local SEO → `references/local-seo.md`
- ✅ Analytics setup → `references/analytics.md`
- ⏳ Sales (pricing/proposals), marketing (content engine), post-delivery (retainer ops)
- ➖ Cold outreach field ops (human-only)

## Pillar 3 — Compound growth
- ➖ Daily practice & habit systems (human-only)

## Synapsea-native additions
- `skills/security-hardening` — full security pass beyond basic launch hardening
- `docs/TOOLING.md` — MCP/key manifest for agent capabilities
- Capability-check protocol in `asset-generation` — agent-specific degradation when tools are missing

## Authoring principles
- Actionable patterns only: numeric recipes, decision matrices, code patterns, checklists
- Agent-executable steps — no gamification, quest framing, or sales theatrics
- Maintained by Synapsea
