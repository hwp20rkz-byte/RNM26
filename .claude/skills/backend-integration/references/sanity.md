# Sanity CMS

Default headless CMS: schemas as code (Git-tracked), live preview, on-the-fly image transforms, free tier ≈100k API requests — fits nearly all client work.

## Setup (≈30 min when patterned)
1. `npm create sanity@latest` → project name, dataset `production`
2. Studio = separate app (deploy to Vercel or Sanity hosted Studio, free)
3. Schemas in `/schemas` (post.ts, page.ts, product.ts…)
4. Frontend pulls via `@sanity/client` + GROQ

## Schema generation pattern
For each content type from the brief: slug, title, image, body (portable text), seo object (title+description+image), publishedAt, author reference, validation rules. Plus a **settings singleton** (logo, contact, social links). Emit separate files + `/schemas/index.ts` exporting all.

## GROQ
```groq
*[_type == 'post'] | order(publishedAt desc) [0...10] { title, slug, image }
```
- Type responses via sanity-codegen / @sanity/types
- Cache aggressively: Next.js `revalidate: 60` covers most CMS reads — do NOT use realtime for CMS content

## Image transforms (the killer feature)
```js
urlFor(image).width(1200).format('webp').quality(80).url()
```
Cropping, focal points, hotspots built in — eliminates ~90% of image-prep work. Still apply the global compression/CLS rules.

## Client handoff (part of the build deliverable)
- `/studio` sub-route on prod or hosted Studio
- Role-based access: agent/agency = admin, client = editor
- Handover note includes: how to add posts/images/edit pages (the written equivalent of a 30-min onboarding video)

## Reusable starter
Maintain a private template: Studio + Next.js + Tailwind + ~6 universal schemas. Setup time drops 2h → 30min. Generate once, reuse on every CMS project.
