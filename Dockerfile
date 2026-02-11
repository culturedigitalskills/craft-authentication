FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL="postgresql://postgres:postgres@postgres:5432/postgres"
ENV DATABASE_URL=${DATABASE_URL_APP}
ENV DATABASE_URL_APP=${DATABASE_URL_APP}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install prisma CLI for database migrations (adds ~50 MB)
RUN npm install -g prisma@7

# Application files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma schema + migrations for `prisma migrate deploy`
COPY --from=builder /app/prisma ./prisma

# Minimal prisma config for Docker (no dotenv dependency needed)
RUN echo 'export default { datasource: { url: process.env.DATABASE_URL } }' > prisma.config.ts

# Initialization scripts
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts/init-garage-http.js  /app/scripts/init-garage-http.js
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
