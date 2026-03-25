# v0.4.x -> v0.5.0

### Community Renamed to Group

Renamed `Community` to `Group` and `ArtisanCommunityMembership` to `ArtisanGroupMembership`. Groups are no longer tied to a region  the `regionId`, `latitude`, and `longitude` columns have been removed.

**Renamed tables**: `Community` to `Group`, `ArtisanCommunityMembership` to `ArtisanGroupMembership`

**Renamed columns**: `communityId` to `groupId` (in `ArtisanGroupMembership`)

**Removed columns**: `regionId`, `latitude`, `longitude` (from `Group`)

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
pnpm db:seed
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

### Seed Data

Seed the database with countries and regions (required for the artisan profile location selector):

```bash
pnpm db:seed
```

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
