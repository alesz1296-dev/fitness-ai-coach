# FitAI Coach

AI-powered fitness coaching platform for workout planning, nutrition tracking, progress analytics, and personalized AI guidance.

## Overview

FitAI Coach is a full-stack fitness coaching application that combines intelligent workout planning, nutrition tracking, body composition analytics, and AI-driven coaching in one place. Built for daily use — log workouts, track macros, monitor progress trends, and get personalized coaching through a multi-agent AI chat system.

### What it does

- **Workout planning** — monthly calendar planner with rest day picker, template library (PPL, Upper/Lower, 5/3/1, endurance, and more), and a full workout builder with exercise search, sets/reps tracking, and an inline rest timer
- **Nutrition tracking** — food logging by meal, macro rings with goal progress, calorie deficit/surplus banner, quick re-log for frequent foods, macro breakdown by food source, AI meal-plan handoff to Meal Planner, and a seeded food database with both search and category-browse fallback
- **Progress & predictions** — weight trend charts, body composition estimates (Deurenberg), exercise progression graphs, adaptive goal forecasting, and plan-vs-actual prediction views that compare ideal path, actual trend, and adaptive forecast
- **AI coaching** — three agents (Coach, Nutritionist, General) with live tool-calling access to your workouts, nutrition, weight trend, and goals. Structured responses can be saved directly into the app as workout templates or calorie plans
- **Weekly planning** — assign workout types to days of the week, sync to the monthly calendar across 1–3 months
- **Monthly reports** — AI-generated summaries of training volume, nutrition averages, and weight change
- **Goals & calorie targets** — TDEE-based calorie and macro goal setup with 6 preset templates (Fat Loss, Lean Bulk, Maintenance, Recomp, etc.)

### Supported languages

- English (`en`)
- Spanish (`es`)
- Ukrainian (`uk`) — locale is wired through the app and safe to select; some deeper feature copy still falls back to English until the full translation pass is completed

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript (ESM/NodeNext) |
| Database | PostgreSQL via Prisma ORM |
| Caching / Auth | Redis (token blocklist + rate limiter) |
| Authentication | JWT access tokens (15 min) + refresh tokens (30 days) with JTI revocation |
| AI | OpenAI API — multi-agent tool-calling loop (MAX_TOOL_ROUNDS=5) |
| State management | Zustand |
| Charts | Recharts |
| Validation | Zod |
| Containerisation | Docker + Docker Compose |
| Mobile | React Native (Expo) |

## Project Structure

```
fitness_ai_coach/
├── src/                        # Express backend (TypeScript, ESM)
│   ├── server.ts               # Entry point, all routes registered here
│   ├── controllers/            # Route handlers
│   ├── routes/                 # Express routers
│   ├── middleware/             # auth, errorHandler, rateLimiter, validate, schemas
│   ├── ai/                     # agent.ts (tool-calling loop), prompts.ts
│   └── lib/                    # prisma, redis, tokenBlocklist, calorieCalculator
├── prisma/
│   ├── schema.prisma           # Canonical schema — edit only this file
│   └── seed.ts                 # Seeds the built-in food and exercise catalog into DB
├── client/                     # Vite + React frontend
│   └── src/
│       ├── api/index.ts        # All Axios API calls
│       ├── pages/              # One folder per page
│       ├── components/         # Shared UI + layout
│       └── store/authStore.ts  # Zustand auth store (single source of truth)
├── mobile/                     # React Native (Expo) mobile app
├── scripts/
│   └── kill-port.cjs           # Kills port 3000 before dev server starts (Windows)
├── Dockerfile                  # Backend multi-stage build
├── docker-compose.yml          # Full stack: server + client + postgres + redis
├── .env.example                # Blank env template — copy to .env and fill in
├── CONTEXT.md                  # Full architecture reference (read at session start)
└── LOG.md                      # Session-by-session change log
```

## Getting Started

### Option A — Docker (recommended)

Requires Docker Desktop.

```bash
# 1. Copy the env template and fill in your secrets
cp .env.example .env
# Edit .env: set OPENAI_API_KEY, JWT_SECRET, REFRESH_SECRET, POSTGRES_PASSWORD

# 2. First run — build images and seed the database
SEED_DB=true docker compose up --build -d

# 3. Subsequent runs (no re-seed needed)
docker compose up -d
```

The app will be available at `http://localhost` (frontend) and `http://localhost:3000` (API).

### Option B — Local dev (no Docker)

Requires a local PostgreSQL instance on port 5432.

**1. Install dependencies**

```bash
npm install
cd client && npm install
```

**2. Configure environment**

```bash
cp .env.example .env
# Fill in: OPENAI_API_KEY, JWT_SECRET, REFRESH_SECRET, DATABASE_URL, POSTGRES_PASSWORD
```

**3. Set up the database**

```bash
npx prisma generate       # generate the Prisma client
npx prisma db push        # apply schema to your local Postgres
npm run prisma:seed       # seed food + exercise data (366 foods, 105 exercises)
```

**4. Run**

```bash
# Backend (port 3000)
npm run dev

# Frontend (port 5173) — in a separate terminal
cd client && npm run dev
```

### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start --host lan   # scan QR with Expo Go on iOS or Android
```

## Environment Variables

Copy `.env.example` to `.env` and set these required values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 64-byte hex string for signing access tokens |
| `REFRESH_SECRET` | 64-byte hex string for signing refresh tokens (different from JWT_SECRET) |
| `OPENAI_API_KEY` | OpenAI API key |
| `POSTGRES_PASSWORD` | Postgres password (used by Docker Compose) |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173` in dev) |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## API Overview

All routes are under `/api` and require a valid JWT in `Authorization: Bearer <token>` except auth endpoints.

| Route group | Description |
|---|---|
| `/api/auth` | Register, login, refresh, logout |
| `/api/users` | Profile, password, account deletion |
| `/api/workouts` | Workout CRUD, history, personal records |
| `/api/foods` | Food log CRUD, frequent foods |
| `/api/weight` | Weight log + trend |
| `/api/goals` | Fitness goal CRUD |
| `/api/calorie-goals` | TDEE-based calorie targets, macro goals, projections |
| `/api/templates` | Workout template library |
| `/api/chat` | AI chat (3 agents with tool-calling) |
| `/api/weekly-plan` | Weekly day assignments |
| `/api/calendar` | Monthly workout calendar |
| `/api/reports` | Monthly AI-generated reports |
| `/api/dashboard` | Aggregated daily/weekly stats |
| `/api/search` | Food + exercise search (DB-backed) |
| `/api/water` | Daily water intake tracking |
| `/api/predictions` | Weight projection model |
| `/api/health` | Health check endpoint |

## AI Layer

Three agent modes, each with a tailored set of read-only tools:

- **Coach** — workout history, personal records, templates, weight trend
- **Nutritionist** — nutrition summary, active calorie goal, weight trend
- **General assistant** — all tools

Tool-calling runs in a loop (up to 5 rounds) so agents can fetch live data before responding. Structured responses embed fenced JSON blocks (`workout-json`, `nutrition-json`, `meal-plan-json`) which the frontend extracts and offers as one-tap save/log actions.

## Available Scripts

```bash
# Root
npm run dev              # start backend with hot reload
npm run build            # compile TypeScript
npm run start            # run compiled build
npm run prisma:seed      # seed food + exercise database

# client/
npm run dev              # Vite dev server
npm run build            # production build
npm run lint             # ESLint

# Docker
docker compose up -d                          # start all services
docker compose up --build -d                  # rebuild and start
SEED_DB=true docker compose up --build -d     # first deploy with seed
docker compose down                           # stop (keeps data volumes)
docker compose down -v                        # stop and wipe all data
```

## Notes

- `CONTEXT.md` is the full architecture reference — read it at the start of every dev session
- `LOG.md` is the session-by-session change log
- The canonical Prisma schema is `prisma/schema.prisma` — never edit the root-level schema
- Never commit `.env`, `.env.production`, or any file matching `.env.*` — only `.env.example` is safe to commit
- After any schema change: `npx prisma generate` then `npx prisma db push` (dev) or `prisma migrate deploy` (prod)
