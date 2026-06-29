# Sustainable Crafting — Design System Handoff

A **warm-artisanal** system for a handmade-crafts platform: paper-cream grounds, deep
navy-teal ink, a terracotta accent, editorial serif display type, and a tactile,
"makers" feel. Use this doc + `sustainable-crafting.css` to re-skin the whole site
consistently.

---

## 1. How to apply this across the site

1. **Load the fonts** in your root `<head>` (snippet at the top of the CSS file).
2. **Import the stylesheet once** globally (e.g. in your root layout / `main` entry):
   `import "./sustainable-crafting.css"` (or a `<link>`).
3. **Wrap each page** in `.sc-page` and drop one `<div class="sc-grain"></div>` inside it.
4. Build with the **tokens** (`var(--sc-*)`) and the **component classes** (`.sc-card`,
   `.sc-btn`, `.sc-chip`, `.sc-nav`, …). Never hard-code a hex that already has a token.
5. Retune the whole theme from `:root` — nothing downstream should redefine palette/type.

> Rule of thumb: **shared chrome, distinct unit.** Nav, palette, type, spacing, paper
> grain, page-header and filter bar are identical on every page. What differs per page
> is only the *card archetype* (product vs. person vs. group).

---

## 2. Palette

| Token | Hex | Use |
|---|---|---|
| `--sc-paper` / `-hi` / `-lo` | `#f1e9da` / `#f7f0e2` / `#ece2cf` | page ground (radial gradient) |
| `--sc-surface` / `-trans` | `#fdfcfa` / `rgba(255,253,248,.85)` | card surfaces |
| `--sc-ink` / `-deep` | `#20303f` / `#1a2730` | primary ink, dark sections, footer |
| `--sc-accent` / `-deep` | `#bb5a2c` / `#a8521f` | terracotta — primary accent + hover |
| `--sc-accent-warm` | `#e6a06a` | accent **on dark** backgrounds |
| `--sc-teal` `--sc-ochre` `--sc-olive` `--sc-plum` | — | secondary craft hues, used sparingly for variety (avatars, category tints) |
| `--sc-text` / `-soft` / `-muted` | `#2a231d` / `#5f5648` / `#9a8d79` | body / secondary / captions |

**Discipline:** one accent (terracotta) carries the brand. The secondary hues are for
*differentiation only* (member avatars, category badges) — never as a second brand colour.
On dark sections, swap accent → `--sc-accent-warm` for legibility.

---

## 3. Type

- **Display / headings / numbers** → `--sc-font-display` (**Spectral**, serif, 600).
- **Body / UI** → `--sc-font-body` (**Hanken Grotesque**).
- **Accent** (pull-quotes, photo captions, friendly labels) → `--sc-font-hand` (**Caveat**). Use it deliberately, ~once per page.

Scale (tokens): eyebrow `12/700/2px-uppercase` · meta `11.5` · sm `13.5` · body `17`
(line-height 1.6–1.75) · lead `27` Spectral · h2 `30` · h1 `52` (detail heroes 44–56).
Helpers: `.sc-eyebrow`, `.sc-h1`, `.sc-h2`, `.sc-lead`, `.sc-body`, `.sc-meta`, `.sc-quote`.

**Section header pattern** (used everywhere): small `.sc-eyebrow` → big `.sc-display`
heading → one `.sc-body` line. In-content sections use *title · `.sc-rule` · action link*.

---

## 4. Spacing, layout & shape

- Content column: `--sc-maxw 1240px`, `--sc-gutter 32px`. Use `.sc-container`.
- Detail pages = **`.sc-split`** (`1fr` + `--sc-rail 340px`, gap `56px`); side rail is `.sc-sticky` (top 96px). Collapses to one column < 900px.
- Card grids: `--sc-grid-gap 22px`.
- Radii: chips `22` · buttons/inputs `12` · cards `18–20` · heroes `24` · avatars `50%`.
- Elevation: `--sc-shadow-card` (resting) → `--sc-shadow-raise` (hover/featured) →
  `--sc-shadow-hero` (hero panels). Cards lift on hover (`a.sc-card`).

---

## 5. Components (in the CSS)

`.sc-nav` + `.sc-nav__link[--active]` · `.sc-btn--primary|--ghost` · `.sc-chip[--active]`
(filter pills) · `.sc-badge` (credential pill — set `--t: var(--sc-teal)` etc. for tint) ·
`.sc-card[--raised|--hover]` · `.sc-dark` / `.sc-dark-panel` (dark sections) ·
`.sc-avatar` + `.sc-stack` (overlapping avatar cluster) · `.sc-rule` (divider line).

---

## 6. Page archetypes (what to build on top)

**Detail pages** — split hero (media left / sticky info rail right), tinted "inspiration"
band, editorial body that mixes text + media + a `.sc-quote`, a `.sc-dark` provenance/auth
section, related strip.

- **Craft detail**: square media gallery, stat strip (time · dimensions · weight), maker mini-card, QR + certificate in the dark section.
- **Artisan detail**: cover + portrait hero, mixed story column (lead → media → quote → two-up), rail = Connect + Communities, crafts grid, masonry gallery.
- **Community detail**: group-forward hero (logo tile + `.sc-stack` of members + collective stat strip + Join), credential `.sc-badge`s, story, member roster (admin card + weaver grid), collective crafts wall.

**Gallery / listing pages** — identical header + filter bar (`.sc-chip` row + sort), then a
distinct card per type:
- **Crafts** → editorial **masonry** (CSS `column-count: 3`), image-forward, maker byline.
- **Artisans** → uniform **portrait cards** (cover strip + overlapping `.sc-avatar` + specialty + location + craft/year stats).
- **Communities** → wide **2-up group cards** (logo tile + `.sc-stack` + 3-stat row + badges).

---

## 7. Image fallbacks (no upload yet)

Two on-brand defaults, both derived from the palette so a missing photo never looks broken:
- **Cover**: *Indigo dots* (shibori-style dot grid on `--sc-ink`) — standard; or *Kraft monogram* (warm ground + giant watermark initial).
- **Portrait**: *Monogram* (initials on a warm gradient, **tint seeded from the initials** so profiles vary) — standard; or *Silhouette* (figure on teal).

When wiring for real: keep `object-fit: cover`, fall back to these generated backgrounds
when `src` is empty.

---

## 8. Guardrails

- Don't introduce new fonts, a second brand accent, or pure-grey neutrals (use the warm
  `--sc-text-*` ramp). 
- Imagery does the talking — avoid decorative gradients-as-content and avoid emoji.
- Keep one Caveat moment per page; don't over-handwrite.
- Minimum body 15px; respect 44px hit targets.
- Every spacing/colour/radius should resolve to a token. If you reach for a raw value
  twice, promote it to a `--sc-*` variable.
