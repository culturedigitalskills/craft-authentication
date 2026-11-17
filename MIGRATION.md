# Unreleased — language URLs, interface localization and verification

## Artisan story editions and films

Apply the Prisma migration `20261117000000_story_publication` and regenerate the client before starting the updated application. It snapshots existing published stories and featured films; private drafts and hidden films stay private. Existing films remain playable; regenerating applies the new voice-first timing and chapter markers. Film generation requires FFmpeg with libx264, drawtext and the project's Noto fonts. The server checks this on startup. No transcription key is required for rendering or for English captions entered by the maker.


## Additional interface languages

Japanese (ja), French (fr), Italian (it) and Brazilian Portuguese (pt-BR) are now supported. Their URL prefixes are /ja, /fr, /it and /pt-BR. The owner selected Brazilian Portuguese; the selector explicitly labels it Português (Brasil). Editorial canonical/hreflang metadata and sitemap entries expand to these locales automatically.

Install the updated frozen lockfile to include the pinned, self-hosted Noto Sans JP variable font. No database migration or additional environment setting is required. Legal document bodies stay in English with a translated notice; original artisan text and media are not translated.

## Public routes and indexing

English pages keep their existing unprefixed URLs. Other supported languages use stable prefixes, for example /tr/about and /ar/about. Explicit URLs override browser language headers and old language cookies. The obsolete NEXT_LOCALE cookie is removed. Legacy /en/... addresses normalize to the unprefixed English route. Existing craft IDs, artisan slugs, QR destinations, API/media URLs and signed credentials are unchanged.

Translated editorial pages publish canonical and reciprocal hreflang metadata. Original artisan/craft/community content has one preferred unprefixed URL until content translation is introduced. Search results and account/editor/admin pages are noindex. /sitemap.xml contains only public canonical URLs; /robots.txt advertises it.

Optional server-side settings:
- SITE_URL: canonical public origin, such as https://your-site.example. Defaults to NEXT_PUBLIC_SERVER_URL, AUTH_URL, then https://sustainablecrafting.org. Do not include a path, credentials, query or fragment.
- PRIVACY_CONTACT_EMAIL and LEGAL_CONTACT_EMAIL: owner-approved public correspondence addresses. Keep deployment values in the environment, not translation catalogs. When unset, legal text links to the verified university data-protection contact page or research-project contact page. Placeholder .invalid addresses are rejected.

New hashtags now accept Unicode letters, combining marks, numbers and underscores with NFC normalization. Known country display names follow the selected language; stored locations and tags are unchanged.

No database migration is required. Before release, verify canonical URLs against the actual public hostname, language links and auth redirects, public sitemap visibility, RTL layout and the English legal-language notice.

## API and deployment checks

GET /health returns { status: "healthy" } only when a database check succeeds; otherwise it returns HTTP 503 with { status: "unavailable" }. It is non-cacheable and noindex, and does not expose database error details. The application Compose healthcheck now verifies both HTTP status and JSON status without a masking shell pipeline. Garage uses its available /garage status command. The app explicitly binds to 0.0.0.0 so both container networking and the loopback health probe reach it. robots.txt resolves SITE_URL at runtime so a build-time placeholder cannot leak into the advertised sitemap URL.

Validation-error details can additionally include origin, minimum and maximum so clients can translate errors from codes and limits. Existing path, message and code fields are preserved.

## C2PA compatibility

Signing now uses the SDK's asynchronous callback signer with the same local key, certificate chain and timestamp authority. Uploaded files are recorded as opened existing assets with an upload action; the registry no longer invents a capture/creation source for uploads. Prior signed data is not rewritten. The historical malformed/untrusted fixture remains a rejection test. Trust verification, ownership checks and tamper rejection remain enabled. Signing names use UTF-8 without entering shell commands or OpenSSL configuration. Temporary keys live in an automatically cleaned private temporary directory, and random certificate serials avoid writes to read-only CA mounts. New non-UUID account IDs are supported; legacy UUID identities remain readable. Account ownership comes from the active registry-issued certificate, not arbitrary asset bytes. No existing asset or certificate backfill is required.

# v0.16.0 -> v0.17.0

### Site Administration

Site admins can now be made, and have a page to work from: `/admin` for the account roster and recent
admin activity, and `/admin/artisans/[id]/media` for an artisan's gallery. Both 404 for non-admins.
Admin actions against somebody else's account or work are recorded.

**Schema Changes**:

- Added the `AdminAuditLog` table. No foreign key to the actor and the actor's email is copied rather
  than joined, so an entry still names someone after that account is gone.

**New API endpoint**:

- `PATCH /api/admin/users/:id` — grant or withdraw site admin. Refuses to withdraw the last admin.

**Configuration Changes**: none.

**Migration Steps**:

1. **Before deploying**, make sure an account exists for `nasim.dadizadeh@unitn.it`. The bootstrap
   migration (`20261024120100_bootstrap_site_admin`) promotes that address and cannot create it. Only
   the first account ever created is promoted automatically, so without this nobody can reach `/admin`.
2. Apply the migrations. Locally `pnpm db:migrate`; staging and production run `prisma migrate deploy`
   on startup.
3. Check the deploy log (`pnpm prod:docker:logs`). The bootstrap announces its result rather than
   failing silently: it either promoted the account, found it already an admin, or logs
   `WARNING: ... no account exists for ...`. On that warning, create the account and add a follow-up
   migration to promote it.

Promoting anybody else is done from `/admin` and needs no deploy.

### Artisan Profile Removal

An artisan profile can be removed and restored. Removal is a soft delete: `Artisan` cascades to
`Craft`, so dropping the row would void the credentials issued against that artisan's work.

**Schema Changes**: none. `Artisan.deletedAt` already existed; this is the first release to write it.

**New API endpoint**:

- `DELETE /api/artisans/:id` — remove a profile (admin or owner), or restore with `{ "restore": true }`
  (admin only).

**Expect after deploying**:

- **Group member counts will drop.** They were unfiltered and had been counting members who had left.
  They now match the list beside them.
- Removing an artisan also hides their crafts and their group memberships. A removed artisan stays
  signed in but gets 403 on anything that writes: removal hides a profile, it does not lock the account.

**Migration Steps**: none beyond the migrations above.

### Media Authorization

`GET /api/media/:id` served any file to whoever held the id, with a year of public cache. A file is now
public only while something public points at it; anything else is served to its owner and to site
admins, with `Cache-Control: private, no-store`. Captions follow the video they transcribe.

**Schema Changes**: none. **Configuration Changes**: none.

**Expect after deploying**:

- Media belonging to unpublished or removed entities returns 404 to anonymous callers, including
  attachments left pointing at entities a past hard delete removed. Nothing links to those, so no page
  should break.
- Anything already cached under the previous public header keeps it until it expires. This stops new
  leaks; it cannot recall old ones.

**Migration Steps**: none. Worth checking afterwards: the landing page, a public craft, a public artisan
profile with a published story film, and your own gallery while signed in.

# v0.15.0 -> v0.16.0

### Legal Policies and Recorded Consent

Added Terms of Service and Privacy Policy pages, and the site now records when an account accepted the
terms and when an artisan consented to their story being published. Consent is the legal basis for
publishing recordings of identifiable people, and that has to be demonstrable, so both are stored rather
than being a checkbox that leaves nothing behind.

**Schema Changes**:

- Added `termsAcceptedAt` datetime column to the `User` table (nullable). Stamped by the Better Auth
  create hook, so it covers both email signup and Google.
- Added `consentedAt` datetime column to the `CraftStory` table (nullable). Set when a story is first
  published.

Both columns are nullable and additive, and a null is read as predating the feature. Accounts created
before this are not locked out, and stories already published stay published and are never asked to
consent retroactively.

**New pages**: `/terms` and `/privacy`, linked from the footer in all locales.

**Configuration Changes**: none. No new environment variables and no new dependencies.

**Migration Steps**:

1. Apply the schema migration. Locally `pnpm db:migrate`; on staging/production the app container runs
   `prisma migrate deploy` automatically on startup.
2. Verify: open `/terms` and `/privacy`, register a new account and confirm the terms checkbox gates both
   the form and the Google button, then publish a story and confirm `consentedAt` is set.

### Workshop Media Ordering and Film Preview

Artisans can now arrange their workshop media in the story wizard, and see a storyboard of the film that
order produces without waiting for a render. Long clips also contribute varied footage instead of
replaying their opening on every appearance.

**New API endpoint**:

- `PATCH /api/media/attachments` — reorder a story's workshop media. Takes the full intended sequence and
  renumbers `displayOrder` in one transaction.

`GET /api/artisans/me/story/transcripts` now returns `segments` alongside `statuses`. The addition is
backward compatible.

No schema changes and no migration steps.

# v0.14.0 -> v0.15.0

### My Story Auto-Captions (Groq Whisper)

Uploaded **video** answers and workshop clips in the My Story flow are now automatically transcribed and
translated to **English captions** (soft WebVTT) shown over the original video on the public artisan page.
The pipeline extracts audio with ffmpeg, sends it to Groq's hosted Whisper (`audio/translations`), and stores
the timestamped result. The extracted audio is retained as its own `MediaFile` for future reuse.

**Schema Changes**:

- Added `TranscriptStatus` enum (`PENDING`, `PROCESSING`, `READY`, `FAILED`).
- Added `MediaTranscript` table: `mediaId` (unique FK to the source `MediaFile`, cascade delete),
  `audioMediaId` (nullable FK to the extracted-audio `MediaFile`), `status`, `sourceLanguage`, `segments`
  (JSON), `error`, timestamps.

**Configuration Changes** (add to `.env.local` and `.env.production`):

- `GROQ_API_KEY` — **required for captions**. Get one at https://console.groq.com/keys. If unset, transcripts
  are recorded as `FAILED` and videos simply play without captions (no crash).
- `GROQ_WHISPER_MODEL` — optional, defaults to `whisper-large-v3`.
- `FFMPEG_PATH` — optional. Defaults to the bundled `ffmpeg-static` binary, then `ffmpeg` on `PATH`. The
  production image installs system ffmpeg and sets `FFMPEG_PATH=/usr/bin/ffmpeg`.

**New API endpoints**:

- `GET /api/media/[id]/subtitles` — returns the English WebVTT captions for a media file (404 until ready).
- `GET /api/artisans/me/story/transcripts` — caption status per story video; powers the status chips in the
  story wizard.

**Reliability**: transcription jobs are claimed atomically in the database and survive redeploys — a recovery
sweep (`src/instrumentation.ts`) re-queues any job orphaned by a container restart on boot and hourly. Failed
jobs retry automatically the next time the artisan saves their story.

**Migration Steps**:

1. `pnpm install` to pick up the new `ffmpeg-static` dependency. For local dev, that bundled binary is used;
   no system ffmpeg install is required.
2. Apply the schema migration. Locally `pnpm db:migrate`; on staging/production the app container runs
   `prisma migrate deploy` automatically on startup.
3. Add `GROQ_API_KEY` to the environment files. Recreate the prod app container so the new value (and the
   ffmpeg binary in the rebuilt image) are loaded.
4. Verify: upload a short talking-head video as a story answer, confirm the `MediaTranscript` row reaches
   `READY`, then open the published public profile and confirm the English captions track plays.

# v0.13.0 -> v0.14.0

### Craft Model (DataRecord → Craft)

- Added `Craft` table: `artisanId` FK, `title`, `description`, `material`, `isPublic`, `isSharedLocation`,
  `latitude`, `longitude`, `place`, `videos` (String array), timestamps, and a nullable `deletedAt` for
  soft-deletes.
- Added a `crafts` relation to the `Artisan` model.


**Migration Steps**:

To transfer already created crafts in prod

1. Apply the schema migration. Locally run `pnpm db:migrate`; on staging/production the app container runs
   `prisma migrate deploy` automatically on startup.

2. Backfill existing crafts from `DataRecord` into `Craft` + `MediaAttachment`:

    ```bash
    pnpm db:backfill-crafts          # local (.env.local)
    pnpm prod:db:backfill-crafts     # staging/production (.env.production)
    ```

    The script is idempotent and non-destructive: it preserves craft IDs (so existing QR codes and issued
    VCs keep working), re-issues each VC with the artisan slug, and leaves `DataRecord` rows intact. Review
    the summary for any **orphan** rows (a `DataRecord` craft whose `artisan` email has no matching
    `Artisan`) — these are skipped and need manual attention.

3. Verify on staging: public `/crafts`, `/crafts/mycrafts`, and a craft detail page with its credential.

4. Only after verifying, optionally delete the now-unused craft `DataRecord` rows manually.

# v0.12.0 -> v0.13.0

**Migration Steps**:

1. Download the list of trusted C2PA signing authorities.
    ```bash
    node scripts/download-c2pa-trust-list.mjs
    ```
    I thsould create the file `secrets/c2pa-trust-list.pem`, which is used to validate other signing authorities besides us. The script downloads the trust list from https://raw.githubusercontent.com/c2pa-org/conformance-public/main/trust-list/.
2. Add the environment variables to your `.env.local` (and `.env.production` for deployment):
    ```env
    C2PA_TRUST_LIST_PATH=./secrets/c2pa-trust-list.pem
    ```

# v0.11.0 -> v0.12.0

### C2PA Content Credentials

Added support for C2PA (Coalition for Content Provenance and Authenticity) signature manifest injection and verification. This enables artisans to secure their creations with cryptographically verifiable signatures.

**Schema Changes**:

- Added `c2paAutoRenew` boolean column to the `User` table (defaults to `false`).
- Added `c2paCertExpiresAt` datetime column to the `User` table (nullable).

**Configuration Changes** (add to `.env.local` and `.env.production`):

- `C2PA_ROOT_KEY_PATH`: File path to `c2pa_root_key.pem`.
- `C2PA_ROOT_CERT_PATH`: File path to `c2pa_root_cert.pem`.

**Migration Steps**:

1. Generate the C2PA Root CA key pair and certificate (run once):

    ```bash
    node scripts/generate-c2pa-root.mjs
    ```

    This script is interactive and prompts you for details. It generates `secrets/c2pa_root_key.pem` and `secrets/c2pa_root_cert.pem`.

    > **Note on Renewal**: If this script is run again, it automatically renews the Root certificate using the existing private key, keeping previous Artisan cert signatures valid.

2. Add the environment variables to your `.env.local` (and `.env.production` for deployment):

    ```env
    C2PA_ROOT_KEY_PATH="./secrets/c2pa_root_key.pem"
    C2PA_ROOT_CERT_PATH="./secrets/c2pa_root_cert.pem"
    ```

    > [!WARNING]
    > **Missing Certificate Error:** If the certificate files are missing or unreadable at startup or configuration evaluation time, the server will throw an error and refuse to initialize status or sign assets.

3. Run database migrations to apply the schema updates:
    ```bash
    pnpm db:migrate
    ```

# v0.10.0 -> v0.11.0

### Hybrid Encrypted User Secrets Vault

Implemented a hybrid client-side encryption vault (using Web Crypto API) to secure user secrets (e.g., OpenAI, Flux2 API keys). The Master Vault Key can be simultaneously wrapped using Recovery Tokens, Server KMS (escrow), or E2E WebAuthn PRF.

**Schema Changes**:

- Added `VaultWrapMode` enum.
- Added `UserSecrets` table for storing client-side encrypted payload data.
- Added `UserWrappedVaultKeys` table for storing wrapped keys per authentication wrap mode.
- Added `master_key_hash` column to the `User` table to enforce downgrade protection.

**Configuration Changes** (add to `.env.local` and `.env.production`):

- `KMS_PRIVATE_KEY_PATH` / `KMS_PUBLIC_KEY_PATH`: File paths to RSA-4096 PEM files used by `MockLocalKMS`. Only file paths are accepted — inline key values in env vars are not supported.
- `LOCAL_MASTER_KEY`: 256-bit symmetric key (64-char hex) used by `MockLocalKMS` to store wrapped vault keys (AES-256-GCM). **Required** — the app fails at startup if unset.
- `VAULT_SERVER_SECRET`: HMAC key for hashing WebAuthn credential IDs to prevent cross-service tracking. **Required** — startup fails if neither this nor `AUTH_SECRET` is set.

**Migration Steps**:

1. Generate the KMS key pair and all required secret values (run once):

    ```bash
    node scripts/generate-kms-keys.mjs
    ```

    This writes `secrets/kms_private_key.pem` and `secrets/kms_public_key.pem` and prints
    `KMS_PRIVATE_KEY_PATH`, `KMS_PUBLIC_KEY_PATH`, `LOCAL_MASTER_KEY`, and
    `VAULT_SERVER_SECRET` to add to `.env.local`.

    > **Important**: `secrets/` is gitignored. Back the files up separately — losing
    > `kms_private_key.pem` or changing `LOCAL_MASTER_KEY` permanently invalidates all
    > existing SSE_KMS vault records.

2. Copy the printed values into `.env.local` (and `.env.production` for deployment).

3. Run database migrations to apply the vault schema:
    ```bash
    pnpm db:migrate
    ```

For ongoing KMS key rotation procedures, see **[Vault & KMS Key Management](./README.md#vault--kms-key-management)** in README.md.

# v0.9.x -> v0.10.0

### Better Auth Migration

Migrated authentication from Auth.js/NextAuth to Better Auth. This change is fully transparent to users; existing bcrypt passwords and OAuth accounts will continue to work.

**Schema Changes**:

- Replaced `Session` model fields to match Better Auth session tracking.
- Replaced `Account` model fields to match Better Auth account linking.
- Replaced `VerificationToken` model with the `Verification` model.
- Kept custom fields `role` and `isActive` on the `User` model.

**Migration Steps**:

1. Run database schema sync:
    ```bash
    pnpm db:push
    ```
2. Run the legacy credentials password migration script:
    ```bash
    node scripts/migrate-passwords.js .env.production
    ```

# v0.8.x -> v0.9.0

### Artisan Social Fields

Added social media handles, website, and hashtags to the `Artisan` model.

**New columns on `Artisan`**:

- `socialInstagram` (optional, max 100 chars)
- `socialFacebook` (optional, max 100 chars)
- `socialTwitter` (optional, max 100 chars)
- `socialTiktok` (optional, max 100 chars)
- `socialYoutube` (optional, max 100 chars)
- `website` (optional, max 255 chars)
- `hashtags` (String array, defaults to `[]`)

# v0.7.x -> v0.8.0

### Verifiable Credentials

Each craft now automatically receives a signed W3C Verifiable Credential (VC) on creation. Credentials are served publicly and can be verified independently without a database lookup.

**New API endpoints**:

- `GET /api/vc/[craftId]` — download the signed credential JSON for a craft
- `POST /api/vc/verify` — verify a credential JSON without a database lookup
- `GET /.well-known/did.json` — public DID document for `did:web` resolution

**New page**: `GET /verify` — standalone credential verification page (no login required)

**Configuration changes** — add to `.env.local` and `.env.production`:

Preferred (file-based secrets):

```env
VC_PRIVATE_KEY_PATH="/run/secrets/vc_private_key.pem"
VC_PUBLIC_KEY_PATH="/run/secrets/vc_public_key.pem"
```

Fallback (inline PEM in env vars):

```env
VC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
VC_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
```

Optional signing-test token (recommended in production):

```env
VC_TEST_TOKEN="CHANGE_TO_RANDOM_TEST_TOKEN"
```

When set in production, call `GET /api/vc/signing-test` with header `x-vc-test-token: <VC_TEST_TOKEN>`.

If you change `.env.production` (including `VC_TEST_TOKEN`), recreate the app container so new values are loaded:

```bash
docker compose --env-file .env.production up -d --force-recreate app
```

Generate the key pair once with:

```bash
node -e "const {generateKeyPairSync}=require('crypto');const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});console.log('VC_PRIVATE_KEY='+JSON.stringify(privateKey));console.log('VC_PUBLIC_KEY='+JSON.stringify(publicKey));"
```

> **Important**: add the keys to `.env` before the first craft is created after deployment. Crafts created without the keys will show "Certificate pending" and cannot be retroactively issued a credential without manual intervention.

No database migrations required the `VerifiableCredential` table already exists in the schema.

# v0.6.x -> v0.7.0

### Static Location Data

Replaced the `Country` and `Region` database tables with a static TypeScript data file (`src/data/locations.ts`). Location data is now bundled with the app — no database seeding required.

**Removed tables**: `Country`, `Region`

**Modified table**: `Artisan` — replaced `regionId` (FK to Region) with `country` and `region` string fields

**Removed API endpoints**: `GET /api/countries`, `GET /api/countries/[countryId]/regions`

**Removed script**: `db:seed` — no longer needed

The migration automatically copies existing location data from the Region/Country tables into the new string columns before dropping the old tables.

Run the migration after pulling:

```bash
pnpm db:migrate
pnpm prisma:generate
```

# v0.5.x -> v0.6.0

### Group Classification System

Replaced the simple boolean flags (`isWomenLed`, `isCooperative`, `isFairTrade`) with a proper classification system based on real-world artisan organization standards.

**New enum**: `OrganizationType` (`COOPERATIVE`, `COLLECTIVE`, `GUILD`, `ASSOCIATION`, `SOCIAL_ENTERPRISE`, `NONPROFIT`, `STUDIO`, `NETWORK`, `OTHER`)

**New columns on `Group`**:

- `organizationType` (OrganizationType enum, defaults to `OTHER`)
- `certifications` (String array — values: `WFTO_FAIR_TRADE`, `FAIRTRADE_CERTIFIED`, `NEST_ETHICAL_HANDCRAFT`, `BCORP`, `UNESCO_ICH`, `FAIR_TRADE_FEDERATION`)
- `isHeritageCraft` (boolean, defaults to false)
- `isOpenToMembers` (boolean, defaults to true)
- `hasTrainingProgram` (boolean, defaults to false)

Run the migration after pulling:

```bash
pnpm db:migrate
pnpm prisma:generate
```

No new environment variables required.

# v0.4.x -> v0.5.0

Description
Completed the Groups feature (Phases 5–7) and replaced placeholder group flags with a research-backed classification system. Added group photo uploads, artisan self-service, searchable member management, and standardized action button alignment across all forms.

Changes
Added OrganizationType enum (Cooperative, Collective, Guild, Association, Social)

### Community Renamed to Group

Renamed `Community` to `Group` and `ArtisanCommunityMembership` to `ArtisanGroupMembership`. Groups are no longer tied to a region the `regionId`, `latitude`, and `longitude` columns have been removed.

**Renamed tables**: `Community` to `Group`, `ArtisanCommunityMembership` to `ArtisanGroupMembership`

**Renamed columns**: `communityId` to `groupId` (in `ArtisanGroupMembership`)

**Removed columns**: `regionId`, `latitude`, `longitude` (from `Group`)

Run the migration after pulling:

```bash
pnpm db:migrate
pnpm prisma:generate
```

No new environment variables required.

### Group Role Enum and Additional Fields

Added `GroupRole` enum (`ADMIN`, `MEMBER`) for type-safe membership roles. Added `website`, `location`, and `isActive` fields to the `Group` model.

**New enum**: `GroupRole` (`ADMIN`, `MEMBER`)

**New columns on `Group`**: `website` (optional URL), `location` (optional text), `isActive` (boolean, defaults to true)

**Modified columns**: `ArtisanGroupMembership.role` changed from `String?` to `GroupRole` enum with `@default(MEMBER)`. Existing NULL values are migrated to `MEMBER`.

Run the migration after pulling:

```bash
pnpm db:migrate
pnpm prisma:generate
```

No new environment variables required.

# v0.3.x -> v0.4.0

### Database Schema Rollback

Removed unused craft taxonomy, product, and batch tables to simplify the schema. Removed models are saved in `prisma/schema-future.prisma.bak` for future reintroduction.

**Removed tables**: CraftCategory, Technique, ArtisanTechnique, Material, ProductType, ProductTypeMaterial, ProductTypeTechnique, Batch, BatchArtisan

**Modified tables**: VerifiableCredential (removed `batchId` column), BatchTag (removed Batch foreign key)

**Removed duplicate migration**: `20260212183410_afterdeleting` was a duplicate of `init` + `authentication` and has been deleted.

**Database reset required**:

```bash
pnpm dotenv -e .env.local -- prisma migrate reset
```

### Cover Photo Support

Added `COVER` to the `AttachmentType` enum, enabling artisan profile cover/banner images alongside the existing `HERO` (profile photo) type.

**Schema change**: `AttachmentType` enum now includes `HERO`, `COVER`, `GALLERY`, `PROCESS`.

Run the migration after pulling:

```bash
pnpm db:migrate
pnpm prisma:generate
```

No new environment variables required.

# v0.2.x -> v0.3.0

### `.env.local` and `.env.production`

Add the following for Google OAuth:

```.env
# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

Get credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Sign in with any Google account.
2. Create a new project.
3. Set up OAuth consent screen.
4. Go to Credentials and create credentials.
5. Select Web application.
6. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
7. For local development use: `http://localhost:20100/api/auth/callback/google`
8. Get the Client ID and Secret.

### Database Schema

Added full platform database schema for artisans, crafts, QR verification, and verifiable credentials.

**New tables**: Country, Region, Group (formerly Community), Artisan, ArtisanGroupMembership (formerly ArtisanCommunityMembership), CraftCategory, Technique, ArtisanTechnique, Material, ProductType, ProductTypeMaterial, ProductTypeTechnique, Batch, BatchArtisan, BatchTag, TagScan, VerifiableCredential, MediaAttachment

**Modified tables**: User (added `role` and `isActive` fields)

Run the database migration after deployment:

```bash
prisma migrate deploy
```

No new environment variables required.

# v0.1.x -> v0.2.0

### `.env.local` and .env.production

add the following

```.env
GARAGE_RPC_SECRET=CHANGE_TO_RANDOM_SECRET_32_CHARS

# Auth.js
AUTH_SECRET=CHANGE_TO_RANDOM_SECRET_32_CHARS
AUTH_URL=https://yourdomain.com
```

You can generate the secrets using `# Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### Create `garage.toml``

Copy the example:

```bash
cp garage.toml.example garage.toml
```

then edit `admin_token` and replace the value with the one you set in `GARAGE_RPC_SECRET`
