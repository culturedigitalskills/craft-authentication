# Craft Authentication

Next.js 16 + Prisma 7 + PostgreSQL + Garage starter with shadcn/ui, Tailwind CSS, Zod validation, Docker support, and pnpm scripts.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: PostgreSQL 16 + Prisma 7
- **Storage**: Garage (S3-compatible, AGPL v3)
- **UI**: shadcn/ui + Tailwind CSS v3 + Radix primitives
- **Validation**: Zod
- **Linting**: ESLint + Prettier (single quotes, 4 spaces, no semicolons)
- **Package Manager**: pnpm

## API Endpoints

### Info

- `GET /info` - Service status

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/signin` - Sign in (managed by NextAuth)
- `GET/POST /api/auth/[...nextauth]` - NextAuth routes (signin, callback, signout, etc.)

### Example Data Management

- `GET /api/data` - List all data records (with pagination)
- `GET /api/data/:id` - Get specific data record
- `POST /api/data` - Create new data record
- `PUT /api/data/:id` - Update data record
- `DELETE /api/data/:id` - Delete data record

### Artisan Profile

- `GET /api/artisans/me` - Get current user's artisan profile
- `POST /api/artisans` - Create artisan profile (authenticated)
- `PUT /api/artisans/:id` - Update artisan profile (owner only)

### Geographic Data

- `GET /api/countries` - List all countries
- `GET /api/countries/:countryId/regions` - List regions for a country

### Media Management

- `GET /api/media` - List all media files (with pagination)
- `GET /api/media/:id` - Retrieve media file
- `POST /api/media/upload` - Upload image or video file
- `POST /api/media/attachments` - Link media to an entity (authenticated)
- `DELETE /api/media/:id` - Delete media file

## Usage Examples

### Create Data Record

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Record","description":"Sample data","data":{"key":"value"}}' \
  http://localhost:3000/api/data
```

### Upload a Video File

```bash
curl -X POST \
  -F "file=@video.mp4" \
  http://localhost:3000/api/media/upload
```

### List all stored media

```bash
curl http://localhost:3000/api/media
```

## Data Persistence

All persistent data is stored in local directories for Development (`./data-dev/`) and Production (`./data/`)

- `./data/postgres/` - PostgreSQL database files
- `./data/garage-data/` - Garage object storage data
- `./data/garage-meta/` - Garage metadata

Directories are created automatically by Docker and are excluded from Git.

## Environment Setup

Copy the appropriate configuration files based on your target environment:

### Local Development

```bash
cp .env.local.example .env.local
# Edit .env.local with your secrets

cp garage.toml.example garage.toml
# No admin_token needed for local dev
```

- Uses `localhost` for Postgres and Garage endpoints
- `DATABASE_URL_APP` is not used locally; `DATABASE_URL` is used by Prisma CLI and the Next.js dev server
- Runs Next.js on your machine (`pnpm dev`)
- Starts only Postgres + Garage containers (`pnpm docker:up`)

### Production / Full Docker

```bash
cp .env.production.example .env.production
# Edit .env.production with your secrets

cp garage.toml.example garage.toml
# Set admin_token in garage.toml to match GARAGE_ADMIN_TOKEN from .env.production
```

- `DATABASE_URL_APP=postgresql://...@postgres:5432/...` – used by app container (container hostname like `postgres`, `garage`)
- `DATABASE_URL=postgresql://...@localhost:5432/...` – used by Prisma CLI when running migrations locally
- Starts all three containers: app, Postgres, Garage

## Quick Start

### 1. Local Development

```bash
# Copy and configure local env
cp .env.local.example .env.local

# Copy Garage config (admin_token not required for local dev)
cp garage.toml.example garage.toml

# Install packages
pnpm i

# Start Postgres + Garage containers
pnpm docker:up

# Initialize Garage (bucket, keys and permissions)
pnpm garage:init

# Verify your .env.local file
Check that S3_ACCESS_KEY and S3_SECRET_KEY were updated by the above step

# Generate Prisma client
pnpm prisma:generate

# Run initial migration (optional)
pnpm db:migrate

# Start Next.js dev server
pnpm dev
```

Open [http://localhost:20100](http://localhost:20100) (or your configured `PORT`).

### 2. Production / Docker

```bash
# 1. Copy and configure production env
cp .env.production.example .env.production
# Edit .env.production – set passwords, secrets, and tokens

# 2. Copy and configure Garage
cp garage.toml.example garage.toml
# Edit garage.toml and set admin_token to match GARAGE_ADMIN_TOKEN from .env.production

# 3. Build app container
pnpm docker:build

# 4. Start all containers
pnpm prod:docker:up
```

When the containers are set up for the first time, some **additional secrets** will be generated.Check them with:

```bash
pnpm prod:docker:logs
```

or

```bash
pnpm prod:docker:logs | grep -A 5 "NEW GARAGE CREDENTIALS"
```

Look for the highlighted box:

```
╔══════════════════════════════════════════════════════════╗
║  NEW GARAGE CREDENTIALS – copy these to .env.production  ║
╠══════════════════════════════════════════════════════════╣
S3_ACCESS_KEY=GK...
S3_SECRET_KEY=...
╚══════════════════════════════════════════════════════════╝
```

Copy these keys into `.env.production`, then restart containers to stabilize them:

```bash
# After updating .env.production:
pnpm prod:docker:down
pnpm prod:docker:up
```

Subsequent starts will reuse the same keys.

App runs on [http://localhost:3000](http://localhost:3000) by default (configure with `PORT`).

## Available pnpm Scripts

### Development

- `pnpm dev` – Starts the Next.js dev server (running on local machine)
- `pnpm docker:up` – Starts Postgres + Garage containers for local dev
- `pnpm docker:down` – Stops dev containers

#### Storage (Garage)

- `pnpm garage:init` – Initialize Garage (create bucket, keys, permissions)

#### Database (Prisma)

- `pnpm db:generate` – Generates Prisma client
- `pnpm db:migrate` – Runs migrations in dev mode
- `pnpm db:push` – Pushes schema changes without migration
- `pnpm db:studio` – Opens Prisma Studio

### Production / Docker

- `pnpm docker:build` – Builds app container
- `pnpm prod:docker:up` – Starts all production containers (migrations + Garage init run automatically)
- `pnpm prod:docker:down` – Stops all production containers
- `pnpm prod:docker:logs` – Follow app startup / init logs

#### Manual overrides (require local Node.js + Prisma)

- `pnpm prod:garage:init` – Initializes Garage via `docker exec` (only if auto-init is skipped)
- `pnpm prod:db:migrate` – Runs migrations in deploy mode
- `pnpm prod:db:push` – Pushes schema changes without migration
- `pnpm prod:db:studio` – Opens Prisma Studio

### Linting / Formatting

- `pnpm lint` – Runs ESLint
- `pnpm lint:fix` – Auto-fixes linting issues (applies single quotes, 4 spaces, no semicolons)

### Build / Start

- `pnpm build` – Builds Next.js for production
- `pnpm start` – Starts production server (after build)

## Project Structure

```
craft-authentication/
├── .vscode/              # VS Code settings (format on save, ESLint)
│   └── settings.json     # Editor configuration
├── data/                 # Production data (git-ignored)
│   ├── postgres/         # PostgreSQL database files
│   ├── garage-data/      # Garage object storage
│   └── garage-meta/      # Garage metadata
├── data-dev/             # Development data (git-ignored)
│   ├── postgres/         # PostgreSQL database files
│   ├── garage-data/      # Garage object storage
│   └── garage-meta/      # Garage metadata
├── prisma/
│   ├── schema.prisma     # Prisma schema
│   └── migrations/       # Database migrations
├── scripts/
│   ├── docker-entrypoint.sh  # Production container entrypoint (migrations + init)
│   ├── init-garage.js        # Garage init via docker exec (local dev)
│   └── init-garage-http.js   # Garage init via Admin HTTP API (Docker)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── data/     # Example CRUD API
│   │   │   └── media/    # Media upload/management API
│   │   ├── globals.css   # Tailwind + shadcn CSS variables
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   └── ui/           # shadcn/ui components
│   └── lib/
│       ├── object-store.ts # S3/Garage client
│       ├── prisma.ts     # Prisma client singleton
│       ├── utils.ts      # cn() utility for Tailwind
│       └── validations/  # Zod schemas
│           ├── data.ts   # Data record schemas
│           ├── media.ts  # Media query/upload schemas
│           └── types.ts  # Shared error response helpers
├── components.json       # shadcn/ui config
├── docker-compose.yml    # Production compose (app + postgres + garage)
├── docker-compose.dev.yml # Dev compose (postgres + garage only)
├── Dockerfile            # Multi-stage production build
├── garage.toml.example   # Garage S3 configuration template
├── .env.local.example    # Local dev env template
├── .env.production.example # Production env template
├── .prettierrc           # Prettier config (single quotes, 4 spaces, no semi)
├── eslint.config.mjs     # ESLint config (style rules)
├── prisma.config.ts      # Prisma 7 config
├── tailwind.config.ts    # Tailwind + shadcn theme
```

## Docker Notes

- **Dockerfile**: Multi-stage build with standalone output. The runner stage includes the Prisma CLI for migrations and init scripts – no full dev toolchain.
- **Auto-init**: On startup, the app container runs database migrations and Garage initialization before starting the server. New Garage credentials are logged for the user to copy into `.env.production`.
- **docker-compose.yml**: Full stack (app + postgres + garage). The Garage Admin API token is configured in `garage.toml`.
- **docker-compose.dev.yml**: Only postgres + garage; run Next.js locally.
- **Data persistence**: Uses local directories (`./data` and `./data-dev`) instead of Docker volumes for easier backup and inspection.

## ESLint / Prettier

- **Single quotes**, **4 spaces**, **no semicolons** enforced.
- VS Code auto-fixes on save (`.vscode/settings.json`).
- Run `pnpm lint:fix` to apply rules manually.

## License

See [LICENSE](./LICENSE).
