# TOOLING — MCP servers & API keys the system wants

The skills reference these capabilities. None are mandatory — the agent runs the capability-check protocol (asset-generation skill) and degrades explicitly when something is missing. Connect in priority order.

## Tier 1 — quality loop (biggest leverage)

| Tool | Type | Unlocks | Used by |
|---|---|---|---|
| **Playwright MCP** (or any browser MCP) | MCP | screenshots of the running build, visual self-critique, real Lighthouse runs → performance gates become VERIFIED instead of `unverified` | design-reviewer, site-polish-qa, website-build-workflow Phase 5 |
| **Vercel / Netlify** (CLI token or MCP) | key/MCP | actual deploys, preview URLs, production Lighthouse | Phase 6 Ship |
| **Context7 MCP** | MCP | up-to-date docs for Next.js/GSAP/Supabase APIs — kills stale-API hallucinations | all build skills |

## Tier 2 — asset generation (turnkey builds)

| Tool | Type | Env key (convention) | Unlocks |
|---|---|---|---|
| **fal.ai** | API key | `FAL_KEY` | image generation (hero/mood/lifestyle), fast + cheap, many models |
| **kie.ai** | API key | `KIE_AI_API_KEY` | Veo3-class video loops for hero sections |
| **Blender MCP** | MCP | — | parametric 3D models → .glb export for R3F heroes (compress via gltf-transform after) |
| **ElevenLabs** | API key | `ELEVENLABS_API_KEY` | voiceover/narration when the brief calls for it |
| Imagen / Gemini API | API key | `GEMINI_API_KEY` | photo-real on-brand stills, pay-per-image |

Rule: image-gen for mood — yes; AI "team photos" or fake product fidelity — never (see asset-generation matrix).

## Tier 3 — backend & ops (when the decision matrix says backend)

| Tool | Type | Unlocks |
|---|---|---|
| Supabase MCP / `SUPABASE_*` keys | MCP/key | schema, RLS, storage straight from the agent |
| Stripe (test keys) | key | checkout/webhook scaffolding against the real test mode |
| Resend `RESEND_API_KEY` | key | transactional email + deliverability check |
| GitHub MCP | MCP | repo creation, PRs, CI wiring (Lighthouse CI) |
| n8n MCP | MCP | client automation workflows from automation.md deployed directly |

## Protocol reminders
- Inventory before Phase 1; report gaps to the user in one message, with the fallback you'll use if they decline
- Never embed keys in code or artifacts — env only; never request a key the brief doesn't need
- Log which tools produced which assets in the handover (provenance requirement in asset-generation)
