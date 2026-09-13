# Playbook: Restaurant / Hospitality

The most templated archetype. Goal: not-a-Wix-template presence that drives bookings.

## What the client actually needs
- Editable menu (often multilingual: local language + EN minimum)
- Reservations: TheFork/OpenTable embed OR form-to-email
- Mobile-first (60%+ of traffic is mobile)
- Local SEO: Google Maps presence, schema markup
- Strong photography (the make-or-break)

## Section structure (7 sections, in order)
1. **Hero** — one big atmospheric image (low light, food, ambience) + name + 1-line tagline + 2 CTAs (Book / Menu)
2. **About** — 2 story paragraphs + 1 photo of chef/owner
3. **Menu** — sectioned (starters/mains/desserts/drinks), prices, dietary tags; loaded from CMS so the client edits it
4. **Gallery** — 6–12 photos, masonry or grid
5. **Reservations** — embed or form
6. **Visit** — address + hours + map embed
7. **Footer** — social, phone, email, Google Maps link

## Phase plan
1. Brief: palette+type lock, hero photo selected, 6-section wireframe
2. Skeleton: menu, reservations, hours, gallery, contact — all responsive
3. Motion+CMS: subtle hero animation only; menu from Sanity; schema markup
4. Polish+content: copy + photos placed, multilingual setup, AVIF compression
5. Launch: Lighthouse, domain, Google Business optimization, handover

## Image strategy
- Client photography if good; AI (Imagen/Midjourney) acceptable for mood/hero only, stock as fallback — never AI for actual dishes presented as real
- Compression targets: hero ≤200KB AVIF, gallery ≤80KB

## Local SEO (drives the bookings)
- JSON-LD type `Restaurant`: name, image, address, geo, telephone, openingHours, priceRange, servesCuisine, menu URL, hasMap
- Title tag: `<Name> | <Cuisine> Restaurant in <City>`
- Meta description mentions cuisine + neighbourhood + USP
- NAP (name/address/phone) identical across site, Google Business, social
- Multilingual → hreflang per language version

## Copy generation pattern
From: name, cuisine, neighbourhood, 3-word vibe, target customer, languages → generate: 6-section sitemap; hero copy ×3 variants per language; about copy; menu category names per language; palette + 2 fonts; title tag + meta description.
