# Layout, Grid & Hierarchy Reference

## Spatial system (build BEFORE content)
- 12-column grid (divides into 1/2/3/4/6)
- 8-point spacing: every margin/padding/gap ∈ {8,16,24,32,48,64,96,128}
- Container max-width 1280–1440px (beyond 1440 wastes density)
- Edge gutters: 24–64px desktop, 16–24px mobile
- Vertical rhythm: section heights at multiples of 96/128px

## Hierarchy: the 5-level system
| Level | Role | Treatment |
|---|---|---|
| 1 Anchor | the ONE most important thing per section | largest type, strongest color, most surrounding space |
| 2 Support | helps the anchor land | subhead, key visual, CTA |
| 3 Context | details | bullets, captions, body |
| 4 Meta | eyebrows, tags, dates, breadcrumbs | small, muted, all-caps spaced |
| 5 Background | ambient/decorative | never competes |

Force demotion. One level-1 per section, no exceptions.

## Whitespace = the most expensive material
- Section padding 96–160px top/bottom
- Heading→body gap 24–48px; element→element 16–32px
- Mobile: scale paddings down 30–40%
- Cramped section? Double the padding before cutting content.

## The 7 dominant layout patterns (map every brief section to one)
| Pattern | Use for |
|---|---|
| Centered hero (headline+subhead+CTA) | default SaaS / agency / portfolio hero |
| Two-column hero (text + visual) | editorial, B2B |
| Pinned scroll-y story | mid-page deep dive |
| Bento grid (asymmetric cards) | features (2026 staple) |
| Horizontal side-scroll gallery | case studies, work index |
| Sticky TOC + content | docs, long-form |
| Full-bleed image + overlay text | editorial, brand moments |

## Mobile is a different layout, not a smaller one
- Single column, always; "image left / text right" → "text top / image bottom"
- Type −25–35%; touch targets ≥44px
- Kill hover effects → tap states or nothing
- DevTools is approximate; verify on a real device

## Planning pattern
Given a brief: assign hero/features/cases/testimonials/contact each one of the 7 patterns, one-sentence justification, and flag sections to cut or rethink.
