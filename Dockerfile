# ── Stage 1: build backend ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# Install deps first (cached layer)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: build frontend ─────────────────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

# Production deps only + Prisma client
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled output + source data files needed by seed
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data ./src/data

# Copy built React app to be served as static files
COPY --from=client-builder /client/dist ./client-dist

# Startup script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
