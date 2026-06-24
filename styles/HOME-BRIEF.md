# Brief: Rebuild the homepage — authenticity through story

## Goal
Reskin the homepage to foreground the **authenticity of artisans, communities, and
their crafts** — real hands, real places, real traditions. Verification/provenance
stays in the product, but is **demoted to one calm section**; it is no longer the
hero message.

## Use the existing design system
Build entirely on `sustainable-crafting.css` + `DESIGN-SYSTEM.md` (in `handoff/`).
Tokens and component classes only — no new hexes, fonts, radii, or shadows.
Reference `Home.dc.html` (the approved design) for exact layout, spacing, section
order, and the textile/placeholder patterns.

**Principle:** shared chrome, distinct unit. Nav, footer, palette, type, paper grain,
and section-header pattern are identical to the rest of the site; only the content
differs.

## Sections, in order
1. **Nav** — shared `.sc-nav`, "Home" active (terracotta underline).
2. **Hero** — headline *"Every craft carries the hands that made it"* (last two words
   italic terracotta). Subcopy + two CTAs ("Meet the makers" primary `.sc-btn--primary`,
   "Browse the crafts" `.sc-btn--ghost`). Right side: people-forward image collage —
   maker portrait, woven-textile inset, floating maker chip. Real photos via image
   slots; palette placeholders as fallback.
3. **Trust strip** — three pillars in one quiet row: *Rooted in place · Made by a named
   maker · Verified provenance*.
4. **Meet the artisans** — 3 artisan cards (cover strip + `.sc-avatar` + name +
   craft·region + one-line human story), "All artisans →".
5. **Communities band** (`.sc-dark`) — *"Crafts live inside communities"* + 3 group
   cards (logo tile, member `.sc-stack`, location · craft).
6. **Featured crafts** — 4-col masonry teaser (`column-count`), every card bylined to
   its maker, "The collection →".
7. **Provenance, not paperwork** — the ONE verification section: split panel, copy +
   certificate/QR card. Framed as "the story comes first, the certificate is a scan
   away".
8. **Footer** — shared, with the funding/credit line.

## Data wiring (replace the static placeholders)
- Hero collage, artisan cards, community cards, and craft tiles pull from real data
  (artisans / communities / crafts queries). Keep the **maker byline on every craft**.
- Image fallbacks when `src` is empty: cover → *Indigo dots*; portrait → *Monogram*
  (tint seeded from initials); see DESIGN-SYSTEM §7. Never a flat grey box.
- All cards link to locale-aware detail/gallery routes
  (`/[locale]/artisans`, `/crafts`, `/communities`).

## Constraints
- **i18n:** route every string through the existing `app/[locale]` translation setup —
  no hard-coded copy.
- **Theme:** light only (`forcedTheme="light"`), no dark styles.
- **a11y:** one real `<h1>`, section `<h2>`s, alt text on imagery, 44px hit targets,
  use `<a>` for navigation (not click-handlers on divs).
- **Scope:** homepage only — don't redesign other pages in this task.

## Done when
Homepage matches `Home.dc.html` visually, is fully tokenized (no raw values), renders
live data with maker bylines, is responsive (collapses cleanly < 900px), and has no
verification-first messaging above the Provenance section.
