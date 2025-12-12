# Craft Authentication

Next.js 16 + Prisma 7 + PostgreSQL + Garage starter with shadcn/ui, Tailwind CSS, Zod validation, Docker support, and pnpm scripts.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: PostgreSQL 16 + Prisma 7
- **Storage**: Garage (S3-compatible, AGPL v3)
- **UI**: shadcn/ui + Tailwind CSS v3 + Radix primitives
- **Validation**: Zod
- **Linting**: ESLint + Prettier (single quotes, 4-space tabs, no semicolons)
- **Package Manager**: pnpm

## API Endpoints

### Health Check

- `GET /health` - Service health status

### Example Data Management

- `GET /api/data` - List all data records (with pagination)
- `GET /api/data/:id` - Get specific data record
- `POST /api/data` - Create new data record
- `PUT /api/data/:id` - Update data record
- `DELETE /api/data/:id` - Delete data record

### Media Management

- `GET /api/media` - List all media files (with pagination)
- `GET /api/media/:id` - Retrieve media file
- `POST /api/media/upload` - Upload image or video file
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

Copy the appropriate .env example based on your target environment:

### Local Development

```bash
cp .env.local.example .env.local
# Edit .env.local with your secrets
```

- Uses `localhost` for Postgres and Garage endpoints
- Runs Next.js on your machine (`pnpm dev`)
- Starts only Postgres + Garage containers (`pnpm docker:up`)

### Production / Full Docker

```bash
cp .env.production.example .env.production
# Edit .env.production with your secrets
```

- Uses container hostnames (`postgres`, `garage`) except for the DATABASE_URL
- Starts all three containers: app, Postgres, Garage

## Quick Start

### 1. Local Development

```bash
# Copy and configure local env
cp .env.local.example .env.local

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
# Copy and configure production env
cp .env.production.example .env.production

# Build app container
pnpm docker:build

# Start all containers (app, postgres, garage)
pnpm prod:docker:up

# Run Database Migrations
pnpm prod:db:migrate

# Initialize garage store
pnpm prod:garage:init

# Verify your .env.local file
Check that S3_ACCESS_KEY and S3_SECRET_KEY were updated by the above step

# Restart containers with new env-variables
pnpm prod:docker:down
pnpm prod:docker:up
```

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

- `pnpm prod:docker:build` – Builds app container
- `pnpm prod:docker:up` – Starts all production containers (app, postgres, garage)
- `pnpm prod:docker:down` – Stops all production containers

#### Storage (Garage)

- `pnpm prod:garage:init` – Initializes Garage for production

#### Database (Prisma)

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
│   └── init-garage.js    # Garage initialization script
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
├── garage.toml           # Garage S3 configuration
├── .env.local.example    # Local dev env template
├── .env.production.example # Production env template
├── .prettierrc           # Prettier config (single quotes, 4 spaces, no semi)
├── eslint.config.mjs     # ESLint config (style rules)
├── prisma.config.ts      # Prisma 7 config
└── tailwind.config.ts    # Tailwind + shadcn theme
```

## Docker Notes

- **Dockerfile**: Uses multi-stage build with standalone output for minimal production image.
- **docker-compose.yml**: Full stack (app + postgres + garage)
- **docker-compose.dev.yml**: Only postgres + garage; run Next.js locally.
- **Data persistence**: Uses local directories (`./data` and `./data-dev`) instead of Docker volumes for easier backup and inspection.

## ESLint / Prettier

- **Single quotes**, **4-space tabs**, **no semicolons** enforced.
- VS Code auto-fixes on save (`.vscode/settings.json`).
- Run `pnpm lint:fix` to apply rules manually.

## License

See [LICENSE](./LICENSE).
