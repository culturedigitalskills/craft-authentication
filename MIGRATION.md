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

# v0.2.x -> v0.3.0

### Database Schema

Added full platform database schema for artisans, crafts, QR verification, and verifiable credentials.

**New tables**: Country, Region, Community, Artisan, ArtisanCommunityMembership, CraftCategory, Technique, ArtisanTechnique, Material, ProductType, ProductTypeMaterial, ProductTypeTechnique, Batch, BatchArtisan, BatchTag, TagScan, VerifiableCredential, MediaAttachment

**Modified tables**: User (added `role` and `isActive` fields)

Run the database migration after deployment:

```bash
prisma migrate deploy
```

No new environment variables required.
