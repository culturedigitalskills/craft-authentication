#!/bin/sh
set -e

echo "=== Production Initialization ==="

# ---------------------------------------------------------------------------
# 1. Wait for PostgreSQL
# ---------------------------------------------------------------------------
echo "[db] Waiting for PostgreSQL..."
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_PORT=${DB_PORT:-5432}

retries=0
max_retries=30
until node -e "
const net = require('net');
const s = net.connect({host:'$DB_HOST',port:$DB_PORT});
s.on('connect',()=>{s.destroy();process.exit(0)});
s.on('error',()=>process.exit(1));
setTimeout(()=>process.exit(1),3000);
" 2>/dev/null; do
    retries=$((retries + 1))
    if [ "$retries" -ge "$max_retries" ]; then
        echo "[db] ERROR: PostgreSQL not reachable after ${max_retries} attempts"
        break
    fi
    echo "[db]   not ready at ${DB_HOST}:${DB_PORT}, retrying (${retries}/${max_retries})..."
    sleep 2
done

echo "[db] PostgreSQL is ready."

# ---------------------------------------------------------------------------
# 2. Run Prisma Migrations
# ---------------------------------------------------------------------------
echo "[db] Running database migrations..."
cd /app
prisma migrate deploy 2>&1 || echo "[db] WARNING: prisma migrate deploy failed (non-fatal)"
echo "[db] Migrations complete."
npx tsx prisma/seed.ts

# ---------------------------------------------------------------------------
# 3. Garage Initialization (requires admin_token in garage.toml)
# ---------------------------------------------------------------------------
if [ -n "$GARAGE_ADMIN_TOKEN" ]; then
    echo "[garage] Running Garage initialization..."
    node /app/scripts/init-garage-http.js 2>&1 || echo "[garage] WARNING: Garage init failed (non-fatal)"
else
    echo "[garage] Skipping (GARAGE_ADMIN_TOKEN not set in env)."
fi

echo "=== Initialization complete ==="

# Hand off to CMD (default: node server.js)
exec "$@"
