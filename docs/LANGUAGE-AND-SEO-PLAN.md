# Language and SEO implementation plan

Updated: 15 November 2026. All implementation PRs target `staging`; promotion to `main` remains a separate release task.

## Scope and evidence

The current site uses next-intl with seven catalogs (en, hi, es, ar, de, tr, el). Public HTTP checks and the deployed main revision confirm cookie-based language selection, English legal and onboarding content, missing Arabic direction, and locale-independent gallery dates. Catalog syntax passes. The original selector dropped query parameters in its navigation target. Browser regression checks now verify that the fix retains the craft edit ID, query values and fragment, and that cancelling a language change preserves unsaved input.

This programme covers the interface, language navigation, and multilingual SEO. Artisan biographies, craft descriptions, story answers, original media, and additional caption translations are deferred. Signed credentials, identifiers, saved content, permissions, and production records must not be rewritten.

## Delivery sequence

### PR 1 — Safe language selection (implemented and verified; PR review pending)

- Preserve the full query string, including duplicate parameters, craft edit IDs, pagination, search, and the fragment.
- Make repeated selections deterministic without relying on the client router cache for a cookie-only URL.
- Use native language names, an accessible translated label, a selected indication, keyboard controls, and visible focus.
- Warn before a language change on editing, recording, upload, or account-entry screens can discard unsaved work. Cancelling must preserve both the page and its language preference. Selecting the current language must do nothing.
- Keep the current URL policy and session-cookie lifetime in this PR. Neither a longer cookie lifetime nor this PR alone delivers multilingual SEO.
- Add local isolated regression coverage, including real browser navigation. No production fixtures or writes.

Implementation: [PR #137](https://github.com/culturedigitalskills/craft-authentication/pull/137).
Verified on 15 November 2026: TypeScript, 31 language unit/integration tests, and four Chromium browser tests covering all locales, repeated switches, query/fragment retention, cancellation, desktop keyboard use, mobile menus, and authenticated craft editing. Desktop and mobile screenshots were inspected; the Hindi selector label now uses a self-hosted Devanagari subset. The full isolated suite reports 106 passing tests and the same six pre-existing C2PA trust/resolver failures. An isolated `pnpm test-deploy` completed successfully, and a read-only Chromium check against its production container passed repeated language switching and query/fragment preservation. The rehearsal containers, image, temporary data, and identified build-cache records were removed afterward.

Existing deployment issues observed during rehearsal (outside this language PR): the app healthcheck requests a nonexistent `/health` endpoint and its pipeline reports success despite HTTP 404; the Garage image lacks the `curl` command used by its healthcheck. Application startup was verified directly through HTTP and the browser rather than relying on those health indicators. Next.js also reports two existing FFmpeg tracing warnings. These findings should be addressed in a separate deployment-maintenance change.

### PR 2 — Stable URLs and multilingual SEO

Decide and test the routing policy before changing any public URLs:

- Keep English at existing unprefixed URLs; use non-English prefixes such as `/tr/about` and `/ar/about` (`localePrefix: 'as-needed'`).
- Explicit URLs determine the language. Disable cookie/browser-language redirection of these URLs. A stored preference may suggest a language, but must not silently override a requested page.
- Make language versions reachable through ordinary links; migrate internal links, client navigation, server redirects, auth callbacks, search and pagination to locale-aware navigation.
- Preserve existing unprefixed public URLs, craft IDs, artisan slugs, QR destinations, credential identifiers, media URLs, and API endpoints. Any normalization of legacy `/en/...` links must preserve queries and fragments and avoid redirect loops.
- Use a centralized locale/path policy shared by navigation, metadata, and sitemap generation.
- For genuinely translated public editorial pages (home, about, how-it-works): translated titles/descriptions; self-referencing canonicals; reciprocal hreflang including self; valid language codes; and an appropriate x-default fallback.
- Use one maintained hreflang implementation, preferably server-rendered HTML metadata. Sitemaps list canonical, public, indexable pages; duplicating all hreflang methods is unnecessary.
- User-generated detail pages retain a single preferred original-content URL while only their interface is translated. Define canonical behavior per page type; do not pretend seven translated menus are seven translated biographies. Review listing/search/pagination policy separately.
- Keep private/account/editor/admin pages out of sitemaps and explicitly noindex them. Authentication and media access rules remain independent of indexing.
- Canonicals use a configured public origin, never an arbitrary request Host header. Keep sitemap and internal-link targets consistent.
- Document the routing change and any required public-origin configuration in MIGRATION.md and README.md.
- Verify with and without cookies and Accept-Language, including conflicting preferences. Explicit translated URLs must return the intended language directly.
- After authorized staging deployment, inspect server HTML, canonical/hreflang relationships, redirects, and sitemap URLs. Search Console verification follows authorized production release.

### PR 3 — Arabic layout and accessible shared UI

- Set document dir=rtl for Arabic and ltr for the other supported locales.
- Audit shared navigation, drawers, dialogs, dropdowns, forms, pagination, and arrows using logical spacing/alignment. Do not mirror logos, media, or non-directional icons.
- Handle mixed-script user content with appropriate direction isolation; URLs, email addresses, and technical identifiers remain readable.
- Check fonts, long labels, wrapping, zoom, desktop and mobile layouts.

### PR 4 — Complete interface localization

- Inventory and migrate remaining hard-coded strings: onboarding entry, credentials and vault screens, pagination, errors, recovery instructions, accessibility labels, and metadata.
- Translate dates, numbers, plurals, and display labels consistently using the selected locale. Preserve stored values and signed data.
- Map API/validation error codes to translated UI messages instead of exposing arbitrary English server messages.
- Add catalog parity and ICU-argument checks with a documented allowlist for intentional English-only legal content; correct the Greek upload-message variable omissions.
- Mark retained English legal sections lang=en and dir=ltr, with a translated availability notice. Owner-reviewed legal translations can follow.
- Published placeholder legal/privacy contact addresses need verified owner-provided replacements; do not invent them.
- Obtain fluent-language review of new copy, particularly Arabic and Hindi. Syntax validation does not establish linguistic quality.

## Acceptance and release gates

- TypeScript and relevant isolated tests pass; run the existing isolated suite and report pre-existing C2PA/fixture-trust failures without weakening verification.
- Real browser coverage: all locales, repeated/back-and-forth switching, current-language no-op, search/page/id/fragment retention, unsaved-input cancellation, keyboard, mobile, and authenticated local editing.
- For PR 2, add HTTP integration tests for deterministic locale routing, canonical/hreflang agreement, public sitemap inclusion, and noindex on non-public screens.
- Rehearse production deployment only in an isolated local Compose project. Never run the production-stack teardown against an existing deployment.
- Keep environment files, signing keys, database data, browser storage, and screenshots containing private data untracked.
- Each PR describes what shipped, what was verified, known failures, and the remaining plan items. Do not merge or promote without release authorization.

## References

- [Google: multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google: localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages)
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [next-intl routing configuration](https://next-intl.dev/docs/routing/configuration)
- [W3C: direction in HTML](https://www.w3.org/International/questions/qa-html-dir)
