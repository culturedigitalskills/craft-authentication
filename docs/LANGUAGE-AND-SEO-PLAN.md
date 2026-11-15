# Language and SEO implementation plan

Updated: 15 November 2026. Branch: `codex/language-seo-foundation`. PRs target `staging`; promotion to `main` is a separate authorized release.

## Scope and PR readiness

This work covers the interface, language selection, Arabic layout, and multilingual SEO for en, hi, es, ar, de, tr and el. Artisan biographies, craft descriptions, story answers, original media and additional caption translations remain deferred. Stored original content, IDs and prior signed assets are preserved.

Do not create or reopen any PR, including a draft, until its intended implementation is complete and full required verification has finished successfully. Blocked checks and unresolved failures keep the work local. Known failures are not waived without the user's explicit agreement. [PR #137](https://github.com/culturedigitalskills/craft-authentication/pull/137) remains closed and unmerged.

## Implemented locally

### Language selection and navigation

- English keeps existing unprefixed URLs; other languages use stable prefixes. Legacy /en/... URLs normalize to English.
- Requested URLs determine language. Browser headers and old cookies cannot override them; the obsolete NEXT_LOCALE cookie is deleted.
- The selector uses native names, ordinary server-rendered links, translated labels, visible focus, keyboard/Escape controls, current-language indication and pending state.
- Normal language switching retains duplicate query values, searches, pagination, edit IDs and fragments. Current-language selection is a no-op. Cancelling the unsaved-work warning retains input and closes the menu.
- Internal links, client routing, server redirects, pagination, login/registration callbacks and logout destinations retain locale.

### Multilingual SEO

- Home, About and How it works have localized metadata, self-canonicals, reciprocal seven-language hreflang and x-default.
- Original artisan/craft/community pages retain one unprefixed canonical; translated interface chrome is not represented as translated authored content.
- Pagination keeps its distinct page number. Search results and private/account/editor/admin pages are noindex.
- Public sitemap entries exclude deleted/private records and account/search pages. robots.txt advertises the sitemap.
- Public origin comes from validated configuration, never the request Host. README and MIGRATION document SITE_URL and fallback behavior.
- These changes provide crawlable language URLs and consistent signals; they do not guarantee indexing or rankings.

### Arabic and shared controls

- Arabic sets html dir=rtl, Radix controls inherit direction, and self-hosted Arabic and Devanagari fonts cover language labels and text.
- Logical spacing/alignment replaces directional layout properties. Directional arrows mirror without mirroring media or logos.
- Email, URL, password and technical-value fields retain readable LTR direction; ordinary text accepts mixed scripts.
- Mobile navigation has modal semantics, focus containment, Escape support and focus restoration. Long translated desktop labels fit without hiding the login control.
- Country display names, dates, numbers and plurals follow locale. Free-text locations remain authored. New hashtags support Unicode and NFC without rewriting existing data.

### Remaining interface text

- 218 interface entries cover onboarding, credential/vault setup, media/gallery, generation, errors, pagination and accessible labels in all seven catalogs.
- API validation codes and limits map to translated UI errors. Normal user flows do not expose arbitrary provider/backend exceptions.
- Catalog parity, ICU syntax and argument checks cover every locale, including corrected Greek upload parameters.
- Retained English legal text is marked lang=en/dir=ltr with a translated availability notice.
- PRIVACY_CONTACT_EMAIL and LEGAL_CONTACT_EMAIL are optional validated server configuration. When absent, verified institutional/project contact pages replace fabricated placeholder emails. Actual correspondence addresses still need operator confirmation.

### Verification issues resolved

The required full-suite and deployment work exposed existing signing/deployment problems:
- The C2PA SDK now uses its async signing path and timestamp resolver. Uploads record opening/uploading an existing asset without inventing its capture origin.
- Non-Latin signing names and ordinary authentication account IDs work. Temporary keys are cleaned up, and issuance supports read-only root-key mounts.
- Ownership comes from the validated active registry-issued certificate, including multi-manifest histories, instead of arbitrary text found in asset bytes.
- The historical untrusted/malformed fixture remains rejected; tampered image bytes remain rejected. Trust checks are not disabled.
- /health checks database readiness and returns explicit 200/503 JSON. Compose validates HTTP and JSON; Garage uses its available status command.
- FFmpeg tracing is scoped so dev pages no longer repeatedly refresh while authentication is loading.

## Verification evidence

Completed locally against the current implementation:
- Frozen-lockfile installation passed.
- TypeScript passed.
- Full isolated suite: **156 tests passed, 17 files, zero failures**.
- Chromium browser suite: **13 tests passed**. Coverage includes seven languages, repeated switching, query/fragment retention, current-language no-op, unsaved-input cancellation, keyboard/mobile, authenticated editing, credential login and simulated Google-provider failure callbacks.
- HTTP/browser checks verify deterministic routing despite conflicting cookies/headers, canonical/hreflang agreement, noindex, public-only sitemap entries, legal-language notices and health JSON.
- Arabic account workflows and long German/Greek/Hindi/Arabic navigation checked. Desktop/mobile screenshots inspected.
- JSX text inventory leaves only intentional measurement abbreviations. The mechanical UI detector reports one inherited decorative border, preserved while changing it to a logical RTL property.
- Latest origin/staging fetched and merged: already up to date at cdf41e9.

Still in progress:
- Fresh isolated production Compose rehearsal and browser checks against that container. Earlier stage-one rehearsal is not evidence for the complete implementation.

## Staging and later release

After all required local checks finish successfully, prepare the replacement PR against staging with exact validation results. Do not merge or promote automatically.

After authorized staging deployment:
- Check the actual public hostname, redirects, server HTML, reciprocal language links, canonical targets and sitemap.
- Exercise the real configured Google OAuth flow; local tests validate callback behavior with a simulated provider error and real credential authentication.
- Ask fluent reviewers to approve new translated copy, especially Arabic/Hindi and security instructions, before production rollout. Automated syntax and layout checks are not independent linguistic approval.
- Confirm the privacy and legal correspondence owners and set deployment email values if desired; verified contact-page fallbacks remain available.

After an authorized production release, inspect Search Console indexing, submitted sitemap processing and locale coverage. Artisan-content translation, reviewed legal translations, translated captions, keyword/content strategy and future sitemap partitioning belong to later work.

## Contact evidence

- The [live website](https://sustainablecrafting.org/) identifies the University of Brighton as operator/data controller.
- The [university privacy page](https://www.brighton.ac.uk/about-us/statistics-and-legal/privacy/index.aspx) and [information-request guidance](https://www.brighton.ac.uk/about-us/statistics-and-legal/requesting-information/index.aspx) identify the institutional data-protection route.
- The [project contact page](https://craftingsustainablejawaja.org/contact/) identifies the research lead; that does not by itself appoint a legal representative.
- Public addresses are not secrets, but deployment configuration makes ownership changes maintainable. Do not commit private environment files or invent an unverified legal mailbox.

## References

- [Google: multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google: localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages)
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [next-intl routing configuration](https://next-intl.dev/docs/routing/configuration)
- [W3C: direction in HTML](https://www.w3.org/International/questions/qa-html-dir)
- [Content Authenticity signing guidance](https://opensource.contentauthenticity.org/docs/tasks/build/)
