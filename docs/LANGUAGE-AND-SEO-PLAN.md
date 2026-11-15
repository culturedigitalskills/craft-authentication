# Language and SEO implementation plan

Updated: 15 November 2026. Branch: `codex/language-seo-foundation`. PRs target `staging`; promotion to `main` is a separate authorized release.

## Scope and PR readiness

This work covers the interface, language selection, Arabic layout, and multilingual SEO for en, hi, es, ar, de, tr, el, ja, fr, it and pt-BR. Artisan biographies, craft descriptions, story answers, original media and additional caption translations remain deferred. Stored original content, IDs and prior signed assets are preserved.

Do not create or reopen any PR, including a draft, until its intended implementation is complete and full required verification has finished successfully. Blocked checks and unresolved failures keep the work local. Known failures are not waived without the user's explicit agreement. [PR #137](https://github.com/culturedigitalskills/craft-authentication/pull/137) remains closed and unmerged.

## Implemented locally

### Language selection and navigation

- English keeps existing unprefixed URLs; other languages use stable prefixes. Legacy /en/... URLs normalize to English.
- Requested URLs determine language. Browser headers and old cookies cannot override them; the obsolete NEXT_LOCALE cookie is deleted.
- The selector uses native names, ordinary server-rendered links, translated labels, visible focus, keyboard/Escape controls, current-language indication and pending state.
- Normal language switching retains duplicate query values, searches, pagination, edit IDs and fragments. Current-language selection is a no-op. Cancelling the unsaved-work warning retains input and closes the menu.
- Internal links, client routing, server redirects, pagination, login/registration callbacks and logout destinations retain locale.

### Multilingual SEO

- Home, About and How it works have localized metadata, self-canonicals, reciprocal eleven-language hreflang and x-default.
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

- 218 interface entries cover onboarding, credential/vault setup, media/gallery, generation, errors, pagination and accessible labels in all eleven catalogs.
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
- Full isolated suite: **169 tests passed, 17 files, zero failures**.
- Chromium browser suite: **18 tests passed**. Coverage includes eleven languages, repeated switching, query/fragment retention, current-language no-op, unsaved-input cancellation, keyboard/mobile, authenticated editing, credential login and simulated Google-provider failure callbacks.
- HTTP/browser checks verify deterministic routing despite conflicting cookies/headers, canonical/hreflang agreement, noindex, public-only sitemap entries, legal-language notices and health JSON.
- Arabic account workflows and long German/Greek/Hindi/Arabic navigation checked. Desktop/mobile screenshots inspected.
- JSX text inventory leaves only intentional measurement abbreviations. The mechanical UI detector reports one inherited decorative border, preserved while changing it to a logical RTL property.
- Latest origin/staging fetched and merged: already up to date at cdf41e9.

Earlier foundation container rehearsal (seven-language code):
- A fresh isolated pnpm test-deploy passed. The production build exposed a build-time robots.txt origin; the fix was followed by a final Docker rebuild from the same Dockerfile and a healthy startup.
- Final production source matched all tracked application, catalog, style and schema files at code commit 24347b5. The later documentation commit does not change runtime code.
- All three isolated containers (application, PostgreSQL, Garage) reported healthy. Migrations and storage initialization completed.
- Chromium against the final production container passed all seven locales, canonical/hreflang, query/fragment preservation, Arabic mobile navigation, real credential registration, Unicode profile tags, vault setup, Arabic certificate issuance with read-only CA mounts, signed upload/edit, active-certificate identity, tamper rejection, legacy invalid-fixture rejection, sitemap and runtime robots origin.
- The synthetic recovery token stayed in test-process memory and was not captured in screenshots, traces or logs.
- The isolated containers, image, synthetic database/storage, temporary key copies and 39 identified build-cache records were removed. Normal local development health still returns HTTP 200.

**Owner hold:** On 15 November 2026, after successful verification, the user explicitly said not to open a PR yet and to finish the existing work. Keep the completed changes local on the existing branch. Do not create/reopen a PR or push this work until the user resumes that step. PR #137 stays closed and unmerged.

## Four-language addition — 15 November 2026

The user authorized Japanese, French, Italian and Portuguese, and selected Brazilian Portuguese. The interface now has eleven languages. Each new catalog supplies 942 interface strings (835 distinct source messages), including public pages, onboarding, forms, validation, credentials, vault, galleries and admin controls. Legal document bodies remain intentionally English.

The locale registry now owns codes and native labels independently of the navigation framework. Routing, SEO metadata, sitemap generation and test matrices use that registry. Japanese gets a version-pinned, self-hosted variable font with Unicode-range loading and its OFL license; the initial Google-font download timeout was resolved by packaging the font rather than making builds fetch it.

Verification of this addition:
- Frozen-lockfile install, TypeScript and all 169 isolated tests passed.
- All 18 browser tests passed, including the four new locale workflows, eleven-way switching, 12 editorial alternates (11 locales plus x-default), local-language form validation, mobile selection and long navigation.
- The changed UI files passed the mechanical detector. Desktop/mobile screenshots were reviewed and confirmed against the production build with motion disabled.
- A separate Next.js production build passed. Its standalone server used a temporary local database and loopback-only port; browser smoke checks passed all four new locales, real Japanese font loading, mobile switching, headings, canonical/hreflang, sitemap, robots and health. Observed font requests were local.
- The temporary production server, its separate database and temporary build directory were removed after verification.
- This addition did not rerun the full container rebuild. The earlier seven-language Compose evidence is retained above; rehearse the final container candidate again before a future PR, after the owner resumes that step.
- Fluent-speaker review of the new copy remains a pre-production review step, not a claim established by the automated checks.

## Staging and later release

Local implementation and required technical verification are complete. PR creation is on the explicit owner hold above. When the user resumes it, any replacement PR targets staging and includes the exact validation results. Do not merge or promote automatically.

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
