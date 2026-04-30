# Railway Deployment Guide — FitAI Coach

Full-stack deploy: **Express API + React SPA + PostgreSQL + Redis**, all on Railway.

---

## Architecture

```
Railway project
├── fitai-app        ← Dockerfile build (Express backend serves React static)
├── fitai-postgres   ← Railway managed PostgreSQL plugin
└── fitai-redis      ← Railway managed Redis plugin
```

The single Dockerfile builds both the backend (TypeScript → `dist/`) and the frontend (Vite → `client-dist/`). Express serves the React app as static files, so no separate nginx or CDN is needed for the initial deploy.

---

## Prerequisites

- Railway account at [railway.app](https://railway.app)
- `railway` CLI: `npm install -g @railway/cli`
- Code pushed to GitHub (the CI workflow runs first)

---

## Step 1 — Create the Railway project

```bash
railway login
railway init        # choose "Empty project", name it "fitai-coach"
```

Or create it in the Railway dashboard → **New Project → Empty Project**.

---

## Step 2 — Add PostgreSQL

In the Railway dashboard:
1. Click **+ New** → **Database** → **PostgreSQL**
2. Railway creates the service and auto-exposes `DATABASE_URL` as a shared variable.

---

## Step 3 — Add Redis

1. Click **+ New** → **Database** → **Redis**
2. Railway creates the service and auto-exposes `REDIS_URL`.

---

## Step 4 — Add the app service (GitHub deploy)

1. Click **+ New** → **GitHub Repo** → select this repo
2. Railway detects `Dockerfile` automatically
3. Set the **root directory** to `/` (default)

The `railway.toml` at the repo root configures:
- Builder: `DOCKERFILE`
- Health check: `GET /api/health`
- Restart policy: on failure, max 3 retries

---

## Step 5 — Set environment variables

In the app service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway reference) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (Railway reference) |
| `JWT_SECRET` | 64-byte random hex (see below) |
| `REFRESH_SECRET` | 64-byte random hex (different from JWT_SECRET) |
| `JWT_EXPIRY` | `15m` |
| `OPENAI_API_KEY` | `sk-...` |
| `CLIENT_URL` | `https://your-app.railway.app` |
| `SEED_DB` | `true` ← **first deploy only, remove after** |

Generate secrets locally:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Railway variable references (`${{Postgres.DATABASE_URL}}`) automatically link the Postgres plugin's connection string — no hard-coding needed.

---

## Step 6 — Deploy

Railway deploys automatically on every push to `main`. To trigger manually:

```bash
railway up --detach
```

Watch logs:
```bash
railway logs
```

The entrypoint runs `prisma db push` then (if `SEED_DB=true`) seeds the food/exercise database, then starts `node dist/server.js`.

**After first successful deploy**: remove `SEED_DB` from variables (or set to `false`). The seed is idempotent but skipping it keeps cold starts fast.

---

## Step 7 — Custom domain (optional)

In the app service → **Settings** → **Networking** → **Custom Domain**. Add your domain and Railway handles the TLS cert via Let's Encrypt.

---

## CI/CD flow

```
git push main
  └─► GitHub Actions (ci.yml)
        ├─ backend: typecheck + Prisma validate + build
        ├─ frontend: lint + typecheck + build
        └─ docker: smoke-test build (pushes only)
              └─► (all pass) Railway auto-deploys
```

GitHub Actions runs on every push/PR. Railway only deploys on push to `main`/`master` after CI passes (configure branch protection rules in GitHub → Settings → Branches to enforce this).

---

## Health check

```
GET /api/health
```

Returns `200 OK` with `{ status: "OK", db: { ok: true }, redis: { ok: true } }` when all services are reachable. Railway uses this to gate traffic during rolling restarts.

---

## Rollback

In the Railway dashboard → **Deployments** tab → click any past deployment → **Rollback**. The previous Docker image is re-deployed in seconds.

---

## Environment parity

| | Local dev | Docker Compose | Railway |
|---|---|---|---|
| Backend | `tsx watch` | `node dist/server.js` | `node dist/server.js` |
| Frontend | Vite HMR | Served by Express | Served by Express |
| DB | SQLite (`dev.db`) | PostgreSQL container | Railway PostgreSQL |
| Redis | In-memory fallback | Redis container | Railway Redis |
