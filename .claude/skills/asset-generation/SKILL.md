---
name: asset-generation
description: Use when a build needs visual/audio assets — hero images, product mood shots, video loops, 3D models (.glb), voiceover, or brand music — and to decide whether to generate via connected MCP/API tools (fal.ai, kie.ai, Blender MCP, ElevenLabs), use real photography, or fall back to CSS/SVG. Includes the capability-check protocol: inventory available tools first, request missing keys/MCPs from the user, degrade gracefully.
---

# Asset Generation

Turnkey builds need assets. The agent does not assume tools exist — it inventories, requests, or degrades. Never silently skip an asset; never fake a capability.

## Capability-check protocol (run in Phase 0 of every build)

1. **Inventory**: list connected MCP servers and configured env keys relevant to assets (see docs/TOOLING.md for the canonical names)
2. **Map the brief's asset needs** to the decision matrix below
3. **Gap report to the user, before building**: "Для этого брифа нужны: hero-изображение (есть fal.ai ✓), 3D-модель (нет Blender MCP — подключи или беру примитивы R3F), видео-луп (нет ключа kie.ai — дай KIE_AI_API_KEY или заменю CSS-градиентом)"
4. **Degrade explicitly**: every missing capability becomes a documented fallback + a TODO in the handover note — never a silent omission

## Asset decision matrix

| Need | First choice | Fallback (no tool) |
|---|---|---|
| Hero mood/atmosphere image | image-gen API (fal.ai / Imagen-class) — AI almost always wins here | CSS gradients + grain + SVG shapes (see worked-example polish patterns) |
| Photo-real product shots | real photography from client | AI only as explicit placeholder, labeled |
| Lifestyle/context (stock replacement) | image-gen API | curated free stock |
| Team photos | client photos ONLY — AI team photos destroy trust | omit section |
| Hero video loop | video-gen API (kie.ai Veo3 / Sora/Runway-class) | scroll-driven CSS/canvas animation |
| 3D model (.glb) for R3F hero | Blender MCP (generate → export .glb → gltf-transform compress) | R3F primitives + materials (cylinder/torus/custom geometry) |
| Voiceover | ElevenLabs API | omit (audio is never load-bearing) |
| Brand music/ambient | Suno-class API | omit |
| UI icons/illustration | SVG generated in-code | — |

## Generation workflow (the studio loop)
Brief (3 adjectives + refs) → generate multiple candidates → select strongest → polish/upscale → **compress + integrate** → document. One candidate is never enough; 1 of N selected is the senior pattern.

## Integration gates (non-negotiable, from the delivery audit)
- Images: AVIF→WebP→JPEG; hero ≤200KB, below-fold ≤80KB; srcset 480/768/1080/1440/1920; width+height always; descriptive alt
- Video: MP4(h264)+WebM; hero ≤2MB; poster frame (JPEG ≤50KB) always — no white flash; lazy below-fold via IO; reduced-motion → static poster; heavy video on CDN (R2/Cloudinary), not the app host
- Audio: MP3 128kbps; never autoplay unmuted; visible mute; pause on visibilitychange
- 3D: .glb compressed <1MB; static poster fallback for reduced-motion/weak hardware

## Licensing & provenance log (legal protection)
Every AI asset in the handover note: tool, prompt, generation date, license terms, human edits made. Prompts saved in the repo (`docs/assets-log.md`). Commercial-safety varies by tool/plan — record it, don't assume it.

## Common integration failures (auto-reject in review)
4MB PNG heroes · autoplaying audio · video without poster · missing reduced-motion fallback · below-fold assets not lazy-loaded · video hosted on the app's own Vercel project.
