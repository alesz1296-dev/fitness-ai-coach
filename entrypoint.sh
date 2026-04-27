#!/bin/sh
set -e

echo "[entrypoint] Running Prisma db push..."
npx prisma db push --accept-data-loss

# Seed only when explicitly requested (e.g. first deploy)
if [ "$SEED_DB" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  npx tsx prisma/seed.ts
fi

echo "[entrypoint] Starting server..."
exec node dist/server.js
