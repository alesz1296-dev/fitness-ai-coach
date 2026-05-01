#!/bin/sh

echo "[entrypoint] Running Prisma db push..."
if npx prisma db push --accept-data-loss; then
  echo "[entrypoint] Prisma db push succeeded."
else
  echo "[entrypoint] WARNING: Prisma db push failed — continuing anyway."
fi

# Seed only when explicitly requested (e.g. first deploy)
if [ "$SEED_DB" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  npx tsx prisma/seed.ts || echo "[entrypoint] WARNING: seed failed — continuing."
fi

echo "[entrypoint] Starting server..."
exec node dist/server.js
