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
