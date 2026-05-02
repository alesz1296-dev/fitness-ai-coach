# FitAI Coach — Agent Context File

Read this at the start of every session before touching any code.

---

## What This Project Is

A full-stack AI-powered fitness coaching web app.

- **Backend**: Node.js + Express + TypeScript (ESM / NodeNext), Prisma ORM + PostgreSQL, Redis (token blocklist + rate-limiter store), JWT auth, OpenAI API
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS, Zustand auth store, Recharts, React Router v6
- **AI**: 3 chat agents (coach, nutritionist, general) via OpenAI with tool-calling (MAX_TOOL_ROUNDS=5). Agents embed structured fenced blocks (`workout-json`, `nutrition-json`, `meal-plan-json`) in responses so the frontend can offer save/log actions.

---

## Project Structure

```
fitness_ai_coach/
├── src/                        # Express backend (TypeScript, ESM)
│   ├── server.ts               # App entry point, all routes registered here
│   ├── controllers/            # Route handlers
│   ├── routes/                 # Express routers
│   ├── middleware/             # auth.ts, errorHandler.ts, rateLimiter.ts, validate.ts, schemas.ts
│   ├── ai/                     # agent.ts (OpenAI tool-calling loop), prompts.ts (system prompts + JSON extractors)
│   └── lib/                    # prisma.ts, logger.ts, tokenBlocklist.ts, calorieCalculator.ts
├── prisma/
│   └── schema.prisma           # ← CANONICAL schema. Never edit root schema.prisma (deleted)
├── client/                     # Vite + React frontend
│   └── src/
│       ├── api/index.ts        # All Axios API calls
│       ├── pages/              # One folder per page
│       ├── components/         # Shared UI + layout (Sidebar, OnboardingModal)
│       ├── store/              # Zustand stores (authStore.ts)
│       └── types/index.ts      # Shared TypeScript interfaces
├── mobile/                     # React Native (Expo) mobile app
│   ├── App.tsx                 # Entry point — initializes authStore, renders RootNavigator
│   ├── app.json                # Expo config (bundleId, dark mode, splash, runtimeVersion)
│   ├── eas.json                # EAS build profiles: development / preview / production
│   ├── babel.config.js         # babel-preset-expo + module-resolver (@shared alias)
│   ├── tsconfig.json           # Extends expo/tsconfig.base, paths: @shared/* → ./src/shared/*
│   ├── package.json            # Expo 54, RN 0.81, Zustand, Axios, react-navigation
│   └── src/
│       ├── api/                # Axios API client + per-domain modules (mirrors web api/)
│       ├── navigation/         # RootNavigator (auth stack / main tabs)
│       ├── screens/
│       │   ├── auth/           # LoginScreen, RegisterScreen
│       │   └── main/           # DashboardScreen, WorkoutsScreen, NutritionScreen,
│       │                       #   ChatScreen, MoreScreen
│       ├── store/              # Zustand authStore (initialize / logout / updateUser)
│       └── shared/
│           └── types/index.ts  # ← LOCAL COPY of all shared TypeScript interfaces
│                               #   (EAS only uploads mobile/, so ../shared/ is unreachable)
├── scripts/
│   └── kill-port.cjs           # Kills port 3000 before dev server starts (Windows fix)
├── CONTEXT.md                  # ← This file
├── LOG.md                      # Session-by-session change log
└── TESTING.md                  # Web + mobile testing guide + EAS build commands
```

### Food + exercise data — important rule

`src/data/foods.ts` and `src/data/exercises.ts` are **seed sources only** — they are no longer used at runtime for search. `searchController.ts` queries `FoodItem` and `ExerciseItem` DB tables directly, falling back to the static arrays only when those tables are empty (first boot before `npm run prisma:seed` has been run).

**When adding new foods or exercises**: add to the static array first, then re-run `npm run prisma:seed` (upsert — safe to re-run). The backup reference copies live in `docs/backup-food-db.md` and `docs/backup-exercise-db.md`.

**First-time setup on a new machine**:
```bash
npx prisma generate   # regenerates client with FoodItem + ExerciseItem models
npm run prisma:seed   # seeds 366 foods + 105 exercises
```

### mobile/@shared alias — important rule
`mobile/src/shared/types/index.ts` is a **manual copy** of the web `shared/types/index.ts`. When adding or changing interfaces in the web types, also update the mobile copy. The alias `@shared/types` in all mobile source files resolves to this local copy via `babel-plugin-module-resolver` + `tsconfig paths`. Do **not** point the alias back to `../shared/` — EAS cloud builds will fail because they only upload the `mobile/` directory.

---

## Key Architectural Decisions

| Topic                  | Decision                                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module system          | ESM (`"module": "NodeNext"` in tsconfig.json). All imports need `.js` extensions.                                                                                                                                                             |
| Auth                   | JWT access tokens (15 min) + JWT refresh tokens (30 days "remember me" / 24 h without) with JTI-based in-memory revocation. No DB table for tokens.                                                                                           |
| Token revocation       | `src/lib/tokenBlocklist.ts` — Redis-backed when `REDIS_URL` is set (`SET jti EX ttl`). Falls back to in-memory Map in dev (no `REDIS_URL`). `blockToken` / `isBlocked` are async.                                                            |
| Schema source of truth | `prisma/schema.prisma` only. The root `schema.prisma` was stale and has been deleted.                                                                                                                                                         |
| AI structured output   | AI embeds fenced blocks: ` ```workout-json``` `, ` ```nutrition-json``` `, ` ```meal-plan-json``` `. Backend extracts with regex, returns as `suggestedWorkout` / `suggestedPlan` / `suggestedMealPlan` in chat API response.                 |
| AI tool-calling        | `agent.ts` uses a MAX_TOOL_ROUNDS=5 loop. 6 read-only tools: get_recent_workouts, get_nutrition_summary, get_weight_trend, get_active_calorie_goal, get_workout_templates, get_personal_records. Each agent type gets a tailored tool subset. |
| Rate limiting          | `generalLimiter` mounted on `/api/` in `server.ts`. Uses `RedisStore` (rate-limit-redis) when `REDIS_URL` is set; falls back to memory store in dev.                                                                                         |
| Validation             | All routes use Zod schemas via `validate()` middleware. `schemas.ts` is the single source of all schemas.                                                                                                                                     |
| Windows dev            | `predev` script runs `scripts/kill-port.cjs` to kill port 3000. Server has SIGINT handler + 3s force-exit.                                                                                                                                    |
| Onboarding detection   | `Layout.tsx` checks `!user.goal && !localStorage.getItem('fitai_onboarded_${userId}')` to show the wizard.                                                                                                                                    |

---

## API Routes (all under `/api`)

| Method              | Path                                    | Description                                | Validated                |
| ------------------- | --------------------------------------- | ------------------------------------------ | ------------------------ |
| POST                | `/auth/register`                        | Register                                   | ✅                       |
| POST                | `/auth/login`                           | Login                                      | ✅                       |
| POST                | `/auth/refresh`                         | Refresh access token                       | —                        |
| POST                | `/auth/logout`                          | Logout                                     | —                        |
| GET                 | `/auth/me`                              | Current user                               | —                        |
| GET/PUT             | `/users/profile`                        | User profile                               | ✅ PUT                   |
| PUT                 | `/users/password`                       | Change password                            | ✅                       |
| GET/POST/PUT/DELETE | `/workouts`                             | Workout CRUD                               | ✅                       |
| POST                | `/workouts/:id/exercises`               | Add exercise to existing workout           | ✅                       |
| PUT/DELETE          | `/workouts/exercises/:id`               | Edit / remove an exercise row              | ✅ PUT                   |
| POST                | `/workouts/start-from-template/:id`     | Start workout from template                | —                        |
| GET                 | `/workouts/stats`                       | Workout stats + PRs                        | —                        |
| GET                 | `/workouts/exercises/:name/progression` | Exercise progression chart data            | —                        |
| GET/POST/PUT/DELETE | `/foods`                                | Food log CRUD                              | ✅ POST/PUT              |
| POST                | `/foods/bulk`                           | Log multiple foods at once (AI meal plan)  | ✅                       |
| GET                 | `/foods/history`                        | Last N days of calorie data                | —                        |
| GET                 | `/foods/frequent`                       | Top N most-logged foods (quick re-log)     | —                        |
| GET/POST/DELETE     | `/weight`                               | Weight entries                             | ✅ POST                  |
| GET/POST/PUT/DELETE | `/goals`                                | Fitness goals                              | ✅ POST/PUT              |
| GET/POST/PUT/DELETE | `/calorie-goals`                        | Calorie/macro goals                        | ✅ POST/PUT/POST preview |
| GET/POST/PUT/DELETE | `/templates`                            | Workout templates                          | ✅                       |
| POST                | `/templates/seed`                       | Seed 24 system templates                   | —                        |
| POST                | `/chat`                                 | Send AI message (rate limited)             | ✅                       |
| GET/DELETE          | `/chat/history`                         | Conversation history                       | —                        |
| POST                | `/chat/save-workout`                    | Save AI workout as template                | ✅                       |
| POST                | `/chat/save-calorie-plan`               | Save AI plan as calorie goal               | ✅                       |
| GET/POST            | `/weekly-plan`                          | Weekly plan CRUD                           | ✅                       |
| PATCH               | `/weekly-plan/days/:id/toggle`          | Mark day complete                          | ✅                       |
| PUT                 | `/weekly-plan/days/:id`                 | Update day                                 | ✅                       |
| DELETE              | `/weekly-plan/:id`                      | Delete plan                                | ✅                       |
| GET                 | `/analytics`                            | Daily + weekly analytics (calories, macros, workouts) | —           |
| GET                 | `/users/export`                         | Full data export (JSON download)           | —                        |
| GET                 | `/reports`                              | Monthly progress reports                   | —                        |
| POST                | `/reports/generate`                     | Generate report (rate limited)             | ✅                       |
| GET                 | `/dashboard`                            | Dashboard aggregates                       | —                        |
| GET                 | `/search/foods`                         | Food search                                | —                        |
| GET                 | `/search/exercises`                     | Exercise search (supports ?muscle= filter) | —                        |
| GET                 | `/calendar?month=YYYY-MM`               | Planned days for a month                   | —                        |
| POST                | `/calendar/populate`                    | Apply template assignments to whole month  | —                        |
| POST                | `/calendar/swap`                        | Swap two planned days                      | —                        |
| DELETE              | `/calendar/clear?month=YYYY-MM`         | Remove all planned days for a month        | —                        |
| PUT/DELETE          | `/calendar/:date`                       | Update / remove a single day plan          | —                        |

---

## Prisma Models (summary)

User, Workout, WorkoutExercise, WorkoutTemplate, TemplateExercise, FoodLog, WeightEntry, Goal, CalorieGoal, Conversation, WeeklyPlan, WeeklyPlanDay, WorkoutCalendarDay

Notable field names (easy to get wrong):

- `MonthlyReport`: `totalWorkouts`, `totalVolume`, `avgCalories`, `avgProtein`, `weightDelta`
- `Conversation`: `message` (user text), `response` (AI text), `agentType`, `metadata` (JSON string: `suggestedWorkout?`, `suggestedPlan?`, `suggestedMealPlan?`)
- `Workout`: `trainingType` (nullable text: "strength" | "hypertrophy" | "endurance" | "cardio" | "mobility") — added via `runMigrations.ts`
- `WeeklyPlan` unique: `@@unique([userId, weekStart])` → key name `userId_weekStart`
- `MonthlyReport` unique: `@@unique([userId, year, month])` → key name `userId_year_month`
- `WorkoutCalendarDay`: `date` is `String` (YYYY-MM-DD), `muscleGroups` stored as JSON string. Unique: `@@unique([userId, date])` → key `userId_date`. Created via `TABLE_MIGRATIONS` in `runMigrations.ts` (no Prisma migration file needed).

---

## Frontend Pages & Components

| Route / File      | Status     | Notes                                                                                                                                                         |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`      | ✅ Done    | Dashboard aggregates, recent workouts, calorie goal progress. Weight FAB (fixed ⚖️ button, bottom-right) for quick weigh-ins.                                 |
| `/workouts`       | ✅ Done    | History + **Calendar** (default tab) + Templates. Colour-coded cards, inline rest timer. **MonthlyPlanBuilderModal**: Mon–Sun weekday grid → toggle workout/rest per day, template picker, 1/2/3-month duration, fills ALL matching weekdays. **Inline day editor**: click date → Workout/Rest toggle (rest saves instantly), name input, "Apply to all [Weekday]s this month" shortcut, Remove, "⚙️ More" (full modal). Training days counter reads from auth store — writes to both user record + calorie goal on every change + toast. Templates: endurance + powerlifting plans. |
| `/templates`      | ✅ Removed | Redirects to `/workouts`                                                                                                                                      |
| `/nutrition`      | ✅ Done    | Food log by meal, **macro rings** (arc fills to goal %, shows >100% when over, red warning, green at goal met, blue glow at 70%), AI meal plan, delete, live recalc. ⚡ Quick Re-log. **"🔍 By Food" view**: sortable per-food protein/carbs/fat table with mini bars + totals. |
| `/weight`         | ✅ Done    | Weight log + trend chart                                                                                                                                      |
| `/goals`          | ✅ Redirects to `/progress` (Goals merged as 4th tab in Progress page)                                                                                       |
| `/chat`           | ✅ Done    | 3 agents, tool-calling, save workout/plan from chat. History sidebar (last 30 across agents). Agent-switch confirmation modal. Save buttons re-hydrated from `metadata` on history load. AI suggestions now show as prominent `SuggestionCard` components (icon + question + confirm/dismiss/saved states) instead of small link buttons. |
| `/reports`        | ✅ Done    | Monthly reports with AI summary                                                                                                                               |
| `/settings`       | ✅ Done    | ProfileForm, PasswordForm, AccountInfo, App Preferences (water toggle), **"Your Data" card** with ⬇ Download my data (JSON export via `GET /api/users/export`). |
| `/progress`       | ✅ Done    | **"Progress & Goals"** — 5 tabs: Body & Weight (trend + body comp via Deurenberg), Exercise Progression (per-exercise line charts), Predictions, **Goals** (GoalsPage embedded, 4th tab), **Analytics** (5th tab — daily calorie intake with 7-day rolling avg, macro breakdown stacked bar, calorie balance, workout frequency). Nav entry renamed to "Progress & Goals". |
| `OnboardingModal` | ✅ Done    | 3-step wizard shown to new users. Goal → Stats → Plan preview (TDEE + macros + suggested template). Saves profile + calorie goal.                             |

---

## Known Issues & TODO

### 🔴 Pre-production audit — findings (2026-04-26)

Full codebase audit run before production hardening. Fix in order of priority.

#### 🔴 Critical — fix before any public traffic

| # | Item | File | Fix |
|---|------|------|-----|
| ~~A~~ | ~~Hardcoded secret fallbacks~~ | ✅ Fixed | `env.ts` Zod schema; `authController.ts` + `auth.ts` import from `env` — no fallbacks |
| ~~B~~ | ~~CORS wildcard fallback~~ | ✅ Fixed | Explicit origin callback in `server.ts`; dev localhost list when `CLIENT_URL` unset |
| ~~C~~ | ~~JSON body limit 10mb~~ | ✅ Fixed | `100kb` for both `json` and `urlencoded` |
| ~~D~~ | ~~Shallow health check~~ | ✅ Fixed | Deep probe: Postgres `SELECT 1` + Redis `ping()` with 2s timeout; 503 on failure |
| E | Stale duplicate file | ⚠️ Pending manual delete | `Remove-Item src\controllers\authController_clean.ts` — sandbox cannot delete files |

#### 🟠 High — before first real users

| # | Item | Fix |
|---|------|-----|
| F | No forgot password / reset | Add `POST /auth/forgot-password` + `POST /auth/reset-password/:token` |
| G | No email verification | Accounts active immediately; blocks safe password reset |
| H | No request timeout | Add middleware that sends 503 after 30s — OpenAI calls can hang indefinitely |
| I | 4 controllers bypass Zod | `mealPlanController`, `reportController`, `templateController`, `workoutController` read `req.body` directly |
| J | 36 `any` types in backend | Run `tsc --strict` pass to eliminate |

#### 🟡 Medium — polished product

| # | Item | Fix |
|---|------|-----|
| ~~K~~ | ~~No pagination~~ | ✅ Fixed — `take: 50` added to `goalController.findMany` and `mealPlanController.findMany` |
| L | No optimistic UI | Common actions (toggle rest day, tick set) should update instantly and roll back on error |
| ~~M~~ | ~~Incomplete empty states~~ | ✅ Fixed — MealPlannerPage dashed-border empty state; Chat, Nutrition, Weight empty states added |
| ~~N~~ | ~~No offline detection~~ | ✅ Fixed — `OfflineBanner.tsx`: `navigator.onLine` + window online/offline events; dismissible dark banner + 3s green "Back online" flash |
| ~~O~~ | ~~Weak password policy~~ | ✅ Fixed — `registerSchema` + `resetPasswordSchema` enforce uppercase + digit + special char via Zod `.regex()` |
| ~~P~~ | ~~No session expiry UX~~ | ✅ Fixed — `axios.ts` redirects to `/login?sessionExpired=1` on refresh failure; Login shows yellow banner via `useSearchParams` |

#### 🔵 Lower priority

| # | Item |
|---|------|
| ~~Q~~ | ~~No account data export~~ | ✅ Fixed — `GET /api/users/export` returns JSON download; Settings "Your Data" card with ⬇ button |
| ~~R~~ | ~~Redis search cache not wired~~ | ✅ Fixed — `searchController.ts` uses `cacheGet`/`cacheSet` with 600s TTL on food + exercise results |
| S | No streaming chat responses (SSE would cut perceived latency from 3–8s to instant) |
| ~~T~~ | ~~No "remember me" on login~~ | ✅ Fixed — Login "Remember me (30 days)" checkbox; `signRefreshToken` uses 30d vs 24h based on flag |

### ✅ Security incident — resolved (2026-04-26)

- `.env.production` and `.env.production.local` were committed with `POSTGRES_PASSWORD` in plaintext. Detected by GitGuardian.
- Both files purged from all 28 commits via `git filter-repo --invert-paths --force`. History force-pushed.
- `.gitignore` updated: `.env.*` blanket-ignored; only `!.env.example` allowed.
- **Pending user action**: Rotate `POSTGRES_PASSWORD` on actual Postgres instance + update local `.env`.
- **Pending user action**: Mark incident as Remediated on GitGuardian dashboard.

### 🔴 Active bugs / gaps

- _(All Phase 3 items resolved in Session 8 — see LOG.md)_
- _(All Phase 4 feature polish items resolved — see LOG.md)_
- ✅ **i18n — fully dynamic across all pages** — All UI strings on all pages (Dashboard, WorkoutsPage, ChatPage, NutritionPage, SettingsPage, GoalsPage, ReportsPage, MealPlannerPage, WeeklyPlanWidget, TemplatesPage, ProgressPage) use `t()` hook calls. Day-of-week abbreviations use `Intl.DateTimeFormat({ weekday: 'short' })` (locale-aware, no hardcoded strings). Chat suggested prompts translated per locale. No module-level string constants remain that would be stuck at boot-time language.
- ✅ **Rate limiter too aggressive during testing** — Fixed in `src/middleware/rateLimiter.ts`. Dev mode now uses 5 000 req/15 min (general), 500 (chat), 200 (auth). Override via env vars: `RATE_LIMIT_MAX`, `CHAT_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `REPORT_RATE_LIMIT_MAX`.
- ✅ **Water intake buttons not persisting** — Fixed in `src/controllers/waterController.ts`: `logWater` stores dates as UTC midnight, `getToday` uses UTC-consistent start/end boundaries. Frontend `handleAddWater`/`handleDeleteWater` now catches errors and shows an inline banner.
- ✅ **Rest/Workout days ↔ Settings desync** — Fixed in `WeeklyPlanWidget.tsx`: `SetupModal` receives `initialDays` from `user.trainingDaysPerWeek`; on save it calls `usersApi.updateProfile({ trainingDaysPerWeek })` and refreshes the auth store so Settings stays in sync.
- ✅ **No scroll / no category filter in workout builder** — Fixed in `WorkoutsPage.tsx`: added `BUILDER_MUSCLE_GROUPS` filter chips above `ExerciseRows` in `WorkoutForm`; selected muscle passed as `defaultMuscle` prop and forwarded to each `ExerciseSearch`.
- ✅ **Water intake not optional** — Fixed: `App Preferences` card added to SettingsPage with `trackWater` toggle stored in `localStorage("app_prefs_v1")`; NutritionPage conditionally renders the water widget based on this preference. Also fixed WeeklyPlanWidget: mismatch banner shown when `user.trainingDaysPerWeek` ≠ `plan.days.length` with an "Adjust plan →" CTA. Header button now reads "✏️ Edit Schedule" with scroll hint in plan picker.
- ✅ **Dashboard "Rendered more hooks than previous render" crash** — `useIsDark()` was called after an early loading-spinner return, violating React Rules of Hooks. Moved it (and `chartColors`) before the first early return.
- ✅ **Training days toast + race condition** — `SetupModal.save()` now `await`s `usersApi.updateProfile()` (was fire-and-forget, causing stale auth store reads). Toast "Training days saved!" shown in both `WeeklyPlanWidget` and `SettingsPage` when days change.
- ✅ **Training days sync — definitive** — `WorkoutsPage.trainingDays` is now a derived constant from the auth store (`user?.trainingDaysPerWeek ?? 4`), not local state. `saveTrainingDays()` calls `usersApi.updateProfile` + `updateUser(authStore)` + `calorieGoalsApi.update` atomically. Any write from any page propagates everywhere instantly.
- ✅ **Macro progress glow** — `MacroGoalBar` (NutritionPage) and `MacroBar` (Dashboard) now glow blue at ≥ 70 % of goal and turn green + glow green at ≥ 100 %. Fill color also switches to green at completion.
- ✅ **MacroRing arc tracks goal (not distribution)** — Ring SVG arc now fills based on `value/goal` progress. Displays >100% when over goal with red warning. Arc was previously driven by `value/totalMacroG` so it never reached 100% even when macros were exceeded.
- ✅ **Calendar: full weekly plan sync** — `WeeklyPlanWidget` now has a "📆 Sync to calendar" button that opens `SyncCalendarModal`. It maps every active plan day (with its unique label — Push/Pull/Legs etc.) to `calendarApi.populate` assignments, repeating across 1, 2, or 3 months. Previously only one template/day-type could be pushed at a time.

> **Note for new machines / after pulling this branch:**
> ```bash
> npm install                         # picks up pg, removes better-sqlite3
> docker run -d --name fitai-pg \
>   -e POSTGRES_PASSWORD=postgres \
>   -e POSTGRES_DB=fitai \
>   -p 5432:5432 postgres:16
> npx prisma generate                 # regenerates Prisma client
> npx prisma db push                  # applies schema to Postgres
> npm run prisma:seed                 # seeds foods + exercises
> npm run dev
> ```

### 🟠 Phase 4 — Production hardening

These should be done before any public deployment. **Docker is the next session priority** — it unblocks PostgreSQL + Redis and enables the CI pipeline.

- ✅ **PostgreSQL** — Swapped. `DATABASE_URL` updated, `prisma/schema.prisma` provider is `postgresql`, `runMigrations.ts` uses `information_schema` / PostgreSQL DDL. `waterController.ts` + `mealPlanController.ts` rewritten to Prisma ORM. `predictionController.ts` uses `::date` cast. `pg` replaces `better-sqlite3`.
- ✅ **Redis** — `src/lib/redis.ts` (ioredis singleton). `tokenBlocklist.ts` uses Redis `SET jti EX ttl` when `REDIS_URL` is set; in-memory fallback otherwise. `rateLimiter.ts` uses `rate-limit-redis` `RedisStore`; memory fallback otherwise.
- ✅ **Docker** — `Dockerfile` (backend, multi-stage), `client/Dockerfile` (Vite → nginx), `docker-compose.yml` (server + client + postgres:16 + redis:7), `entrypoint.sh` (runs `prisma db push` + optional seed), `.env.production` template, `.dockerignore` files.
- **CI pipeline** — GitHub Actions: lint → `tsc --noEmit` (both) → `prisma validate` → build → optional test run.
- **Env validation on startup** — Fail fast if `OPENAI_API_KEY`, `JWT_SECRET`, or `DATABASE_URL` are missing. `src/config/env.ts` already has the structure; add `process.exit(1)` on missing required vars.
- **OpenAI API key integration test** — ⚠️ **Do not commit secrets.** Before testing live chat in any shared/CI environment, ask first. Locally: add `OPENAI_API_KEY` to `.env` (gitignored), verify the chat endpoint returns a real AI response, and confirm tool-calling round-trips work end-to-end. Rate-limit and error-handling branches should also be exercised at this stage.
- **OpenAI error handling** — Current code only handles 401 and 429. Add handling for: context length exceeded (400 with specific code), model not found, service unavailable (503), timeout.
- **DB indexes** — Add `@@index` in schema for frequently queried fields: `FoodLog.userId + date`, `Workout.userId + date`, `WeightEntry.userId + date`.

### 🟢 Phase 4.5 — Mobile version readiness — COMPLETED

The responsive pass has been completed. Summary of changes:

1. ✅ **Bottom tab navigation** — `BottomNav.tsx` with 4 primary tabs + slide-up "More" sheet for the remaining 5 items + Logout. Safe-area inset padding for iPhone. Sidebar hidden on mobile (`hidden md:flex`). Layout `<main>` gets `pb-16 md:pb-0` to reserve space above the fixed bar.
2. ✅ **Responsive page padding** — All pages changed from `p-8` → `p-4 sm:p-6 lg:p-8`.
3. ✅ **Touch-friendly form grids** — Settings forms: 3-col and 2-col grids become `grid-cols-1 sm:grid-cols-X` so they stack on narrow viewports. Macro input rows: `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`.
4. ✅ **Dashboard header** — Stacks vertically on mobile with full-width CTA buttons.
5. ✅ **Workouts tabs** — Full-width on mobile, equal-flex items. Header stacks on mobile.
6. ✅ **Chat page** — `pb-14 md:pb-0` on outer `h-screen` container clears the bottom nav. Header padding responsive.
7. ✅ **Viewport meta tag** — `<meta name="viewport" content="width=device-width, initial-scale=1.0">` confirmed in `client/index.html`.

**PWA — ✅ COMPLETED (this session):**
- ✅ `client/public/manifest.json` — name, icons, display: standalone, shortcuts (Workout/Food/Chat)
- ✅ `client/public/sw.js` — cache-first static, network-first API, SPA shell fallback
- ✅ `client/public/icons/icon-192.png` + `icon-512.png` — purple circular icon with white "F"
- ✅ `client/index.html` — manifest link, apple-mobile-web-app-capable meta tags, apple-touch-icon, theme-color
- ✅ `client/src/main.tsx` — service worker registration on window load
- ✅ `client/src/components/InstallPrompt.tsx` — iOS 3s-delay banner + Android `beforeinstallprompt` button
- ✅ `client/src/components/OfflineBanner.tsx` — online/offline detection banner

**Remaining for App Store:**
- Test on real iOS + Android devices before submitting to stores
- App Store / Play Console accounts, icons, screenshots, privacy policy

### 🟡 Phase 4 — Feature polish (UX improvements) — COMPLETED

- ✅ Progress page — Body & Weight tab + Exercise Progression tab (BodyCompositionCard with Deurenberg equation)
- ✅ Food database — Integral/Whole Grain, Fit/High-Protein, Keto/Low-Carb categories (257 items)
- ✅ Protein multiplier — 2.0 g/kg default, stored per user, slider in Settings (0.8–2.2)
- ✅ Body recomposition goal — Added to onboarding and template sorting
- ✅ Workout plan UX — Toasts on add/delete, fork system templates to custom, rename custom plans
- ✅ Muscle group expansion — Biceps/Triceps/Forearms/Hamstrings separate; Legs broad alias; full exercise checklist in AddExercisePanel
- ✅ Smart plan suggestions — Injury warnings, missing muscle detection, gender/goal-aware tips
- ✅ Nutrition page — Macro goal bars (vs Goals tab), DeficitSurplusBanner, calorie progress only when goal set
- ✅ Goals page — 6 preset templates (Fat Loss, Aggressive Cut, Lean Bulk, Muscle Building, Maintenance, Recomp) with profile-calculated values
- ✅ Settings page — protein multiplier slider + Zod-aware error messages
- ✅ Error handler — type-aware messages (Prisma, JWT, SyntaxError)

Remaining Phase 4 items (deferred):

- **Workout training-type support** — Add Resistance/Endurance and Strength training types alongside the current Hypertrophy-oriented defaults. Each type should influence default set/rep/rest ranges surfaced in the workout builder (e.g. Strength: 3–5 reps, 3–5 min rest; Endurance: 12–20 reps, 30–60 s rest). Store `trainingType` on `Workout` (new enum field + migration). Template sorting and AI coach prompts should acknowledge this field.
- **Superset / ascending series / circuit configuration** — In the workout builder, allow exercises to be grouped into a superset (A1/A2 pairs), an ascending series (weight increases each set), or a circuit (round-robin through N exercises). Store grouping as a `groupId` + `groupType` enum on `WorkoutExercise`. The sets/reps table in the detail view should render the group visually and the rest timer should skip between exercises in a superset automatically.
- **Exercise database expansion** — Add the following to the in-code exercise array (and later the seeded DB): **Glutes** (Hip Thrust, Romanian Deadlift, Glute Bridge, Cable Kickback, Sumo Squat), **Traps** (Barbell Shrug, Dumbbell Shrug, Face Pull, Rack Pull, Upright Row), **Abs** (Plank, Crunch, Leg Raise, Ab Wheel Rollout, Cable Crunch), **Weighted Abs** (Weighted Sit-up, Cable Oblique Crunch, Dumbbell Side Bend, Decline Weighted Crunch), **Stretching / Mobility** (Hip Flexor Stretch, Hamstring Stretch, Chest Opener, Pigeon Pose, Thoracic Rotation — marked `isStretching: true` so they can be filtered out of volume calculations).
- **Supplement entry editing (Protein Shake)** — The Protein Shake quick-add in Supplements logs fixed macro values the user cannot change. Replace with an editable modal pre-filled with the stored defaults; user can adjust protein/carbs/fat/calories before confirming. Persist the last-used values per supplement type in localStorage so edits carry over to the next session.
- **Chat agent-switch confirmation** — When the user taps a different agent tab mid-conversation, the visible history clears without warning. Show a small confirmation toast/dialog ("Switch to Nutritionist? Current conversation will be archived.") with a Cancel option. If confirmed, clear the local message list but keep history accessible via `GET /chat/history`.
- **Store suggestedWorkout JSON in conversation row** — `Conversation.response` currently stores only the text. Add a nullable `suggestedWorkoutJson`, `suggestedPlanJson`, and `suggestedMealPlanJson` JSON column to the `Conversation` model. Backend already extracts these at chat time — persist them so that the chat history view can re-render the "Save workout" / "Log meal plan" action buttons on old messages.
- **Weekly plan widget migration reminder in onboarding** — The widget has a silent try/catch for the missing migration. Instead of silent failure, check for the migration during onboarding (Step 1 or a post-login gate) and show a one-time banner: "Your weekly plan needs a quick setup — tap here to enable it." Trigger `npx prisma migrate deploy` via a `/api/admin/migrate` endpoint (dev only) or document the manual step more prominently.
- **Progress projections on dashboard** — Ongoing actual-vs-projected weight chart. The `calorieGoalsApi.getProjection(id)` endpoint already returns both actual and projected arrays. Just needs a Recharts `ComposedChart` wired in on the Dashboard.
- **Weekly plan → workout link** — When marking a weekly plan day complete, prompt to link it to a logged workout (a `workoutId` picker). The data model already supports this (`WeeklyPlanDay.workoutId`).
- **Meal plan save as template** — After the nutritionist suggests a meal plan, offer to save it as a reusable "meal template" (not just log it for today). Would need a new `MealTemplate` Prisma model.
- **Calorie goal progress on dashboard** — Show how many kcal remain today vs goal. The `CalorieProgress` component exists in NutritionPage; reuse it on the Dashboard.
- **Quick re-log on Nutrition page** — Add a "Quick re-log" section at the top of NutritionPage showing the user's 5 most-frequently logged foods. A single tap logs the item again at its last-used quantity, skipping the search flow entirely. Backend: add a `GET /foods/frequent?limit=5` endpoint that counts `FoodLog` entries by `foodName` for the current user and returns the top N with their last-used quantity/unit/meal.
- **Dashboard weight entry shortcut** — Add a floating "+" FAB on the Dashboard that opens a small inline modal (weight + unit + optional note) and POSTs to `POST /weight`. Eliminates the navigate-to-Progress detour for daily weigh-ins. Modal can reuse the same form fields already in the Weight page.
- **Inline rest timer in exercise detail** — In the sets/reps table inside the workout detail/active-workout view, tapping a set row to mark it complete should automatically start a countdown timer (default 90 s, configurable in Settings). Show the timer inline below the completed row; it auto-dismisses when it reaches zero. No backend change needed — timer state is local.
- **Shared recent-messages sidebar in Chat** — Currently switching between Coach, Nutritionist, and General agent tabs resets visible context. Add a collapsible "Recent" sidebar (or bottom drawer on mobile) that shows the last ~5 messages across all agent types regardless of which tab is active. Pulling from `GET /chat/history` filtered by the last 24 h is sufficient; no schema change needed.

### 🟡 Phase 4 — Data layer hardening (elevated from Phase 5)

- **Seeded DB tables for food & exercise databases** — The ~257-item food database and 115-item exercise database (soon expanded with glutes/traps/abs/stretching entries) live as static in-memory arrays. Move both into Prisma-seeded DB tables (`FoodItem`, `ExerciseItem`) with a `prisma/seed.ts` script. Benefits: full-text `LIKE` search via SQL, ability to add user-contributed entries, and a single source of truth that survives hot-reloads. `GET /search/foods` and `GET /search/exercises` routes already exist — point them at the DB instead of the array filter.

### 🔵 Phase 5 — Feature enhancements

Nice-to-haves for a mature product:

- ✅ **Progressive Web App** — Done. `manifest.json` + `sw.js` + install prompts for iOS (banner) and Android (`beforeinstallprompt`). Offline banner. App is now installable from Safari on iPhone via Share → Add to Home Screen.
- **Mobile deployment** — Once the PWA shell is in place, submit to Apple App Store and Google Play Store via a wrapper (e.g. Capacitor or PWABuilder). Requires App Store / Play Console accounts, icons, screenshots, and privacy policy. _Depends on Phase 4.5 responsive pass + PWA._
- **Push notifications / streak reminders** — PWA push or email reminders for missed workout days, calorie logging gaps, and streak milestones. _Depends on PWA._
- **Admin dashboard for usage analytics** — Internal-only page (role-gated) showing active users, workouts logged per day, food entries, AI chat usage, and error rates. Useful before any public launch to monitor real usage. Stack: aggregate queries on existing tables + a simple Recharts dashboard page under `/admin`.
- **Agent write tools** — Add `log_food` and `save_workout_template` to the agent tool set so the AI can proactively log data on the user's behalf during chat.
- **Social / sharing** — Export a workout summary or weekly stats as a shareable image (Canvas API → PNG download or Web Share API).
- **Apple Health / Samsung Health / Apple Watch** — Read steps, heart rate, active calories, and sleep data from HealthKit (iOS) and Samsung Health (Android) to enrich the dashboard and auto-log cardio. Apple Watch companion app for logging sets in-session. _Requires native wrapper (Capacitor plugin or React Native rewrite for Watch)._
- **Barcode scanner** — Use device camera to scan packaged foods and auto-fill nutrition data via Open Food Facts API. Lower priority since manual search already works well.
- **Exercise video links / form cues** — Link each exercise to a form guide video or embed cue text in the exercise detail view. Low effort (metadata field) but requires sourcing content.
- ✅ **Multi-language support** — Custom zero-dependency i18n system. `I18nProvider` + `useTranslation()` + module-level `t()`. Locale files in `client/src/i18n/locales/`. Language picker in Settings persists to `localStorage["lang"]`. **All pages fully translated** (Workouts, Chat, Nutrition, Goals, Progress, Reports, MealPlanner, Templates, Settings, AI, Dashboard, Profile, Auth). To add a language: create `client/src/i18n/locales/xx.ts` implementing `Translation` interface, add to `LOCALES` + `LANG_LABELS` in `client/src/i18n/index.tsx` — no component changes needed.

---

## Implementation Priority Ranking

Work top-to-bottom within each tier. Finish all P1s before starting P2s.

### P1 — Fix immediately (broken UX / blocks testing) — ✅ ALL RESOLVED

| #   | Item                                              | Status | Notes                                                                                                                      |
| --- | ------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rate limiter too aggressive in dev                | ✅     | 5 000 dev / 100 prod; env-var overrides for all four limiters                                                              |
| 2   | Water intake buttons not persisting               | ✅     | UTC date fix in controller + error banner + spinner ("Adding…") on quick-add buttons while `addingWater` is true.         |
| 3   | Rest/Workout days ↔ Settings desync               | ✅     | **Bidirectional**: Plan→Settings auto-syncs on save. Settings→Plan: after saving new `trainingDaysPerWeek`, sets `localStorage("fitai_plan_days_hint")`, shows "Go to plan →" nudge, and WeeklyPlanWidget auto-opens SetupModal on next Dashboard load. |
| 4   | No scroll + no category filter in workout builder | ✅     | Muscle chips in WorkoutForm; `defaultMuscle` prop chain. WeeklyPlanWidget: gradient fade + scroll hint on per-day editor (>3 active days), "✏️ Edit Schedule" button in header, "Edit schedule" clickable link in footer. |

### P2 — High priority (broken features / data correctness) — ✅ ALL RESOLVED

| #   | Item                                                                       | Status | Notes                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | Supplement entry editing (Protein Shake fixed macros)                      | ✅     | ✏️ edit button per card; inline form with cal/p/c/f inputs; overrides saved in `localStorage("supplement_macros_v1")`; amber badge when override active                  |
| 6   | Water intake not optional                                                  | ✅     | `App Preferences` card in Settings with `trackWater` toggle; stored in `localStorage("app_prefs_v1")`; NutritionPage conditionally renders water widget; storage event sync |
| 7   | Exercise database expansion (Glutes, Traps, Abs, Weighted Abs, Stretching) | ✅     | Added 22 exercises: Glutes (5), Traps (4), Weighted Abs (5), Stretching (9); updated MUSCLE_GROUPS + EQUIPMENT_TYPES; Stretching hidden from default results              |
| 8   | Env validation on startup                                                  | ✅     | `OPENAI_API_KEY` added to `requiredEnvVars` in `src/config/env.ts`; server exits fast if missing                                                                          |
| 9   | DB indexes                                                                 | ✅     | 5 indexes added to `runMigrations.ts`: WaterLog, FoodLog, Workout, Conversation, MealPlan — created at startup with `CREATE INDEX IF NOT EXISTS`                          |
| 10  | OpenAI error handling (503, timeout, context-length)                       | ✅     | `classifyOpenAIError()` helper in `agent.ts` handles 429, 503, 400 context-length, 401, timeout; `chatController.ts` forwards `userFacing` errors as HTTP 429/502         |

### P3 — Medium priority (UX improvements, deferred features)

| #   | Item                                                               | Status | Notes                                                                                                                                                                       |
| --- | ------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | Quick re-log on Nutrition page                                     | ✅     | `GET /foods/frequent?limit=5` scans last 300 logs, ranks by count. Amber strip on NutritionPage with per-food pill buttons; spinner while re-logging; reloads totals after. |
| 12  | Dashboard weight entry FAB                                         | ✅     | Fixed `⚖️` button bottom-right on Dashboard; popup card with kg input + Enter key + Save; refreshes dashboard data on success.                                              |
| 13  | Inline rest timer in exercise detail                               | ✅     | `timerExId` + `secondsLeft` state in WorkoutDetail. "✓ Set done" button per exercise; 90 s countdown + shrinking blue progress bar inline below row; ✕ to cancel.           |
| 14  | Shared recent-messages sidebar in Chat                             | ✅     | `w-56` aside panel (hidden below `lg`); fetches last 30 entries across all agents; shows agent icon + message preview + relative day; clicking triggers `requestSwitchAgent`. |
| 15  | Chat agent-switch confirmation                                     | ✅     | `pendingAgent` state; switching agent tab mid-conversation shows a centered modal ("Switch to X? Conversation is saved.") with Stay / Switch buttons.                        |
| 16  | Workout training-type support (Strength / Endurance / Hypertrophy) | ✅     | `trainingType TEXT` added to Workout schema + migration. Toggle pill-selector in WorkoutForm + EditWorkoutForm. Coloured badge on workout cards. Backend create/update both accept it. |
| 17  | Store suggestedWorkout JSON in Conversation row                    | ✅     | Already done: `metadata` column + migration in `runMigrations.ts`; `chatController.ts` stores & returns parsed JSON; ChatPage re-hydrates save buttons from history.         |
| 18  | Calorie goal progress on Dashboard                                 | ✅     | Amber CTA nudge (`bg-amber-50` banner → `/goals`) inside "Today's Calories" card when `!activeGoal`. Ring + remaining text still shows vs 2000 kcal fallback.               |
| 19  | Progress projections on Dashboard                                  | ✅     | `projectionStatus` IIFE: finds closest projected point to today, compares vs current weight with ±0.5 kg threshold. Badge renders centred below chart footer: "✅ On Track" / "⚠️ Slightly Behind" / "🚀 Ahead of Schedule". |
| 20  | Weekly plan → workout link                                         | —      | `WeeklyPlanDay.workoutId` picker on day-complete                                                                                                                            |
| 21  | Monthly workout calendar (template → full month)                   | ✅     | `WorkoutCalendarDay` model + `calendarController.ts` + routes. CalendarTab: Apply Template modal (template × weekday grid), planned day overlay, swap mode, clear month, click-to-edit day. `PlanToCalendarModal` (1–3 months, pre-filled weekday pills). `EditCalendarDayModal` bulk-apply to all same-weekday days in month. |
| 22  | Custom meal types in Nutrition page                                | —      | Allow users to add custom meal sections beyond fixed breakfast/lunch/dinner/snack. Options: (a) free-text meal label per food log entry, or (b) a user-level `mealTypes` array stored in profile. |
| 23  | Mobile-first responsive pass                                       | ✅     | `BottomNav.tsx` (4 primary tabs + "More" slide-up sheet), Sidebar `hidden md:flex`, Layout `pb-16 md:pb-0`. All pages `p-4 sm:p-6 lg:p-8`. Settings grids `1→sm:2/3 col`. WorkoutsPage tabs full-width on mobile. Chat `pb-14 md:pb-0` for bottom nav clearance. See Phase 4.5 notes.              |

### P4 — Production hardening (needed before public launch)

> CI pipeline goes here — it's the safety net that catches regressions in everything above it, so set it up once PostgreSQL + Docker are wired, then let it run on every PR from that point forward.

#### Scalability issues — ranked by urgency

| Priority | Item | Status | Notes |
| -------- | ---- | ------ | ----- |
| 🔴 Critical | **Food + exercise DB migration** | ✅ Done | `FoodItem` + `ExerciseItem` Prisma models. `prisma/seed.ts` seeds 366 foods + 105 exercises. `searchController.ts` now queries DB with `LIKE`. Static arrays kept in `src/data/` as seed source only. |
| 🔴 Critical | **PostgreSQL swap** | ✅ Done | Provider swapped to `postgresql`. `runMigrations.ts` uses `information_schema`. `pg` added, `better-sqlite3` removed. `DATABASE_URL` updated in `.env` + `.env.example`. |
| 🔴 Critical | **Redis — token blocklist + rate limiter** | ✅ Done | `src/lib/redis.ts` (ioredis). `tokenBlocklist.ts` + `rateLimiter.ts` both use Redis when `REDIS_URL` set; graceful in-memory fallback in dev. |
| 🟠 High | **Connection pooling** | Pending (after Postgres) | Prisma uses 1 connection in dev. Under load on Postgres, add PgBouncer or Prisma Accelerate to avoid exhausting connection limits. |
| 🟠 High | **Dashboard `Promise.all` parallelisation** | ✅ Done | Sequential `await` calls wrapped into `Promise.all` groups — cuts latency ~3–4× on networked Postgres. Negligible on SQLite. |
| 🟠 High | **Rewrite `$queryRawUnsafe` controllers** | ✅ Done | `waterController.ts` + `mealPlanController.ts` fully rewritten to Prisma ORM. `calendarController.ts` rewritten to Prisma ORM. `predictionController.ts` raw SQL updated to PostgreSQL `::date` cast. |
| 🟡 Medium | **Query result caching (Redis)** | ✅ Done | `searchController.ts` caches food + exercise search results in Redis with 600s TTL. `cacheGet`/`cacheSet` helpers; cache keys include all query params. |
| 🟡 Medium | **OpenAI tool loop latency** | Pending | `MAX_TOOL_ROUNDS=5` with DB queries per round = 3–8 s per chat message. Chat endpoint should run on a separate queue/worker before any public launch. |

#### Full P4 task list

| #   | Item                                          | Location                                                                            |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| 21  | OpenAI API key integration test               | `.env` → live chat test (⚠️ ask before running)                                     |
| 22  | Food + exercise → DB (seed + rewrite search)  | ✅ `prisma/seed.ts`, `FoodItem`/`ExerciseItem` models, `searchController.ts`        |
| 23  | PostgreSQL swap                               | ✅ Done — `DATABASE_URL`, schema provider, `runMigrations.ts`, `pg` dep             |
| 24  | Redis — token blocklist + rate limiter        | ✅ Done — ioredis + rate-limit-redis, graceful in-memory fallback in dev            |
| 25  | Docker (Dockerfile + docker-compose)          | ✅ Done — multi-stage Dockerfiles, docker-compose.yml, entrypoint.sh, .env.production |
| 26  | CI pipeline (lint → typecheck → test → build) | `.github/workflows/ci.yml` — set up after Docker so CI runs the containerised stack |
| 27  | Weekly plan migration reminder in onboarding  | Onboarding Step 1 or post-login gate                                                |
| 28  | Connection pooling                            | PgBouncer or Prisma Accelerate — after Postgres swap                                |
| 29  | Rewrite `$queryRawUnsafe` controllers         | ✅ Done — all three controllers rewritten to Prisma ORM                             |
| 30  | Redis query cache for search endpoints        | ✅ Done — `searchController.ts` caches both endpoints with 600s TTL                 |

### P5 — Larger features (plan a dedicated session for each)

| #   | Item                                                    | Notes                                                                     | Depends on                  |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| 28  | Superset / ascending series / circuit config            | Schema change + builder UI + rest timer integration                       | —                           |
| 29  | Meal plan save as template                              | New `MealTemplate` Prisma model                                           | —                           |
| 30  | Mobile app — React Native (Expo) ✅                     | All 5 screens done (Dashboard/Workouts/Nutrition/Chat/More). Expo Go working on iPhone. EAS build profiles configured. See `mobile/` | — |
| 31  | Progressive Web App ✅                                  | Done — manifest, service worker, install prompts (iOS + Android), offline banner, icons | —                |
| 32  | Admin dashboard (usage analytics)                       | Role-gated `/admin` page; aggregate queries on existing tables + Recharts | PostgreSQL (#23)            |
| 33  | Mobile deployment (App Store + Play Store)              | EAS build + submit. Android: `eas build --platform android --profile production`. iOS: requires Apple Developer account ($99/yr). | Docker (#25) + backend on public URL |
| 34  | Push notifications / streak reminders                   | PWA push or email; streak alerts + workout reminders                      | PWA (#31)                   |
| 35  | Agent write tools (`log_food`, `save_workout_template`) | `src/ai/agent.ts` tool set                                                | —                           |
| 36  | Social / sharing (workout summary image)                | Canvas API → PNG or Web Share API                                         | —                           |
| 37  | Apple Health / Samsung Health / Apple Watch             | HealthKit + Samsung Health SDK; Watch companion requires native wrapper   | Mobile deployment (#33)     |
| 38  | Multi-language support                                  | `react-i18next` scaffolding                                               | —                           |
| 39  | Barcode scanner for food logging                        | Open Food Facts API; manual search already works                          | —                           |
| 40  | Exercise video links / form cues                        | Per-exercise metadata field; requires content sourcing                    | —                           |

---


## Session 2026-04-30 — Bug fixes + Profile bar + Macro color fix

### New components
- **ProfileSummaryBar** (`client/src/components/layout/ProfileSummaryBar.tsx`): Persistent compact icon strip at the top of every page (rendered in `Layout.tsx`). Shows active goal pill (type + kcal), estimated body fat % (from BMI formula using weight/height/age/sex), today's calories with % of goal, and today's macros (P/C/F grams). Each pill is clickable and navigates to `/progress` or `/nutrition`. Renders nothing if dashboard data hasn't loaded yet.

### Bug fixes
- **#74**: Moved daily calorie+macro summary cards to the TOP of Nutrition tab — above hormonal banner, fasting banner, quick re-log, water, supplements.
- **#76**: `deleteLog` now has a `catch` block; errors show an `alert` instead of silently failing. Added `isCheatMeal` to `logFoodSchema` (schemas.ts) and to `updateFoodLog` destructuring + Prisma update (foodController.ts).
- **#77**: Exercise name field in existing workout edit now uses `ExerciseSearch` autocomplete. `ExerciseEditData` type extended with optional `exerciseName`. `saveEdit` spreads `exerciseName` into the API call. `setEditData` init includes `exerciseName: ex.exerciseName`.
- **#70**: ProgressPage header buttons div uses `flex-wrap` to prevent overflow on narrow screens; outer header div gets `pb-2`.
- **#72**: MacroView toggle container uses `flex-wrap + overflow-x-auto`; labels shortened ("By Meal" → "Meals", "By Food" → "Foods", "vs Goals" → "Goals"); card header switches to `flex-col sm:flex-row` on mobile.

### Visual improvements
- **MacroRing**: `strokeColor` now checks `over` BEFORE `met` — exceeding 100% of goal shows red arc, not green.
- **MacroGoalBar**: `fillColor` is red when over budget; `glowStyle` adds red glow when over.

### Pending roadmap items (from image)
- **CI/CD**: GitHub Actions pipeline (lint → typecheck → Prisma validate → build). Set up after Docker.
- **Deploy**: Backend + Postgres + Redis on Railway/Render; frontend on Vercel/Railway; env vars, health checks.
- **AI engineering**: Provider abstraction layer (DeepSeek as cheap default, OpenAI fallback). Embeddings/RAG for user history context.
- **Backend hardening**: Env validation on startup (zod), auth session UX improvements (logout all devices), pagination for large result sets (food logs, workouts).

## Session 2026-04-30 (cont.) — Polish sprint: 7 features

### New features
- **#78 AI Workout Builder**: New “🤖 AI Build” tab in Workouts. Pick muscle groups + training style + duration; AI generates full exercise plan (calls coach agent, parses JSON); one-click log as a real workout session.
- **#73 Favourites**: Star button (⭐) on every food log row pins it to localStorage. “Favourites” panel appears above Quick Re-log for instant one-tap re-logging (max 20 items, remove via ×).
- **#68/#62 Analytics enhanced**: Added Weight Trend line chart (from weight logs) and Nutrition Adherence stat grid (avg kcal, avg protein, workouts, kcal burned, days tracked, logging rate %) to the Analytics tab.

### Fixes & polish
- **#67 Multi-tag food filter**: Tag chips are now multi-select (AND logic). Backend accepts comma-separated `tags` param. Selecting Vegan + High-Protein returns foods tagged with both.
- **#75 Nutrition date persists**: Date picker state saved to sessionStorage; restores last viewed day on return (auto-resets to today if > 7 days old).
- **#79 Tab state persists**: Workouts active tab (history/calendar/templates/AI Build) and Nutrition macro view tab both survive navigation via sessionStorage.

### Pending (next priorities)
- **#71**: Editable weight prediction graph (P2, Feature)
- **#83**: AI provider abstraction — DeepSeek default, OpenAI fallback (P2, AI/ML)
- **#84**: AI embeddings + RAG for user history context in chat (P3, AI/ML)
- **#85**: Backend pagination for large result sets — food logs, workouts (P2, Infrastructure)
- Connection pooling — PgBouncer or Prisma Accelerate after Railway live (P2, Infrastructure)
- P5: Superset/circuit config, meal plan templates, admin dashboard, barcode scanner, push notifications

## Running the Project

```bash
# ── Docker (full stack, recommended for production) ──────────────────────────
# 1. Copy and fill in secrets
cp .env.production .env.production.local   # edit POSTGRES_PASSWORD, JWT_SECRET, OPENAI_API_KEY

# 2. First deploy — seed the DB
SEED_DB=true docker compose --env-file .env.production up --build -d

# 3. Subsequent deploys (no seed)
docker compose --env-file .env.production up --build -d

# Tear down (keeps volumes)
docker compose down

# Tear down + wipe data
docker compose down -v

# ── Local dev (no Docker) ────────────────────────────────────────────────────
# Requires: local Postgres on :5432, DATABASE_URL in .env
# Redis is optional — omit REDIS_URL to use in-memory fallback

# Backend (from project root)
npm run dev          # kills port 3000, starts tsx watch

# Frontend (from client/)
npm run dev          # Vite dev server on :5173

# Mobile (from mobile/)
npx expo start --host lan          # prints QR — scan with Expo Go on iPhone/Android

# If phone can't connect (Windows hotspot classified as Public network):
$env:REACT_NATIVE_PACKAGER_HOSTNAME="YOUR_PC_IP"; npx expo start
# One-time firewall rule (run PowerShell as Administrator):
New-NetFirewallRule -DisplayName "Expo Metro" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any

# EAS cloud builds
cd mobile
eas build --platform all --profile production
```

---

## Session — Railway Deploy Hardening (2026-04-30)

**Goal:** Get the codebase into a clean, deployable state for Railway with no startup crashes.

### Bugs Fixed

- **`prisma` CLI was devDep** — `npx prisma db push` and `npx prisma generate` in the production container (`npm ci --omit=dev`) would crash. Moved `prisma` → `dependencies`.
- **`tsx` was devDep** — `npx tsx prisma/seed.ts` in entrypoint would crash in production. Moved `tsx` → `dependencies`.
- **`expo` and `ngrok` in prod deps** — these are dev/mobile tools with no runtime use. Moved to `devDependencies`.
- **`@types/nodemailer` in prod deps** — type-only package. Moved to `devDependencies`.
- **Winston file transports in production** — `logs/error.log` and `logs/combined.log` would crash if `/app/logs/` doesn't exist in the container (Railway has no persistent FS). Fixed: file transports only added when `NODE_ENV !== production`; production logs to stdout only (Railway captures stdout).
- **`package-lock.json` stale** — regenerated with `npm install --package-lock-only` after package.json changes.

### Files Added

- `railway.toml` — Railway build config (DOCKERFILE builder, healthcheck at `/api/health`, restart policy)
- `docs/railway-deploy.md` — Step-by-step Railway deploy guide (PostgreSQL plugin, Redis plugin, env vars, first-deploy seed, custom domain, rollback)
- `.github/workflows/ci.yml` — GitHub Actions CI (backend typecheck + build, frontend lint + typecheck + build, Docker smoke-test on push to main)
- `package.json` scripts: added `typecheck` and `lint:client`

### Verified Clean

- `npx tsc --noEmit` passes (backend)
- `npx tsc --noEmit` passes (frontend/client)
- All routes registered in server.ts, all controller files present
- API `baseURL: "/api"` is relative — works same-origin in production
- Redis is optional (graceful fallback when `REDIS_URL` not set)
- CORS correctly uses `CLIENT_URL` env var in production
- `entrypoint.sh`: `prisma db push` → optional seed → `node dist/server.js`
- Static file path: `dist/server.js` → `../client-dist` = `/app/client-dist` ✓
- `.env` and `.env.production` confirmed gitignored (not tracked)

---

## Session 2026-04-30 — UX Polish Sprint

### Completed this session
- **Exercise search** (`WorkoutsPage.tsx`): Dropdown now uses `position:fixed` + `getBoundingClientRect` — escapes all parent `overflow` contexts. Per-row muscle group `<select>` added to `ExerciseRows`; `ExRow` type extended with `muscle: string`.
- **Save workout** (`schemas.ts`): `trainingType` added to `createWorkoutSchema` — was previously stripped by Zod before reaching the controller.
- **Modal dark mode** (`Modal.tsx`): `dark:bg-gray-800` + dark variants on panel, title, border, close button.
- **Textarea dark mode** (`Textarea.tsx`): Full dark parity — `dark:bg-gray-700 dark:border-gray-600 dark:text-white`.
- **Nutrition layout** (`NutritionPage.tsx`): Header split into 2 rows — date nav only on row 1, action buttons on row 2. Calories+macros now render immediately after the title — first visible content on page.
- **Fasting timer** (`NutritionPage.tsx`): Live counter shown inline on the button (`⏸ 2h 14m`) — no longer requires scrolling to see the timer is running.
- **Macros live update** (`ProfileSummaryBar.tsx` + `NutritionPage.tsx`): `fitai:food-logged` custom event dispatched from all 4 food-logging paths; `ProfileSummaryBar` re-fetches on each event via `useCallback` + `addEventListener`.
- **Favourites null-safe** (`NutritionPage.tsx`): `addFoodToFavs` and `relogFav` use safe fallback chains for `defaultQty`/`defaultUnit` — no more null stored in localStorage.

### Pending / backlog
- **#71** Weight prediction graph — editable target line on ProgressPage (P2, Feature)
- **#83** AI provider abstraction — DeepSeek default, OpenAI fallback (P2, AI/ML)
- **#84** RAG + embeddings for chat memory (P3, AI/ML)
- **#85** Pagination — food logs + workouts (P2, Infrastructure)
- Connection pooling — PgBouncer or Prisma Accelerate (post-live, Infrastructure)
- P5 backlog: superset/circuit, meal plan templates, admin dashboard, barcode scanner, push notifications

---

## Session 2026-05-01 — Goals Tab, Custom Exercises, Log Weight Fixes

### Features added

- **Goals tab restored as primary nav** (`BottomNav.tsx`, `Sidebar.tsx`, `App.tsx`): `/goals` was silently redirecting to `/progress`. Restored `GoalsPage` route. Added Goals (🎯) as 4th item in `PRIMARY_ITEMS` (Home / Workouts / Nutrition / Goals / AI Coach). Added to Sidebar between Nutrition and AI Coach. Updated `ProfileSummaryBar` goal pill and `OnboardingModal` post-complete redirect both now navigate to `/goals`.

- **GoalsPage — manual goal editing** (`GoalsPage.tsx`, `calorieGoalController.ts`): Added `EditGoalModal` component inside `GoalsPage.tsx`. Fields: name, current weight, target weight, target date, daily calories, protein, carbs, fats. "Recalculate macros from these targets" button calls `calorieGoalsApi.preview()` to get server-computed macro split. Calorie sanity check: warns if `protein*4 + carbs*4 + fats*9` diverges from daily calorie target by more than 50 kcal. On save: calls `calorieGoalsApi.update()` with all fields including recalculated `type` (cut/bulk/maintain). Backend `updateCalorieGoal` extended to accept and persist: `targetWeight`, `currentWeight`, `targetDate`, `dailyCalories`, `proteinGrams`, `carbsGrams`, `fatsGrams`, `weeklyChange`, `type`.

- **Log weight Modal fix** (`ProgressPage.tsx`): `showForm` state and `+ Log Weight` button existed but the `<Modal>` JSX was completely absent from the render tree — button had no effect. Added `<Modal open={showForm} onClose={() => setShowForm(false)} title="Log Weight">` wrapping `<LogWeightForm>`.

- **Weight FAB on NutritionPage** (`NutritionPage.tsx`): Added floating action button (⚖️) at `bottom-32` — identical pattern to Dashboard FAB. Wired to `weightApi.log()`. State: `showWeightFab`, `weightVal`, `savingWeight`, `weightSaved`. Fixed mangled import (missing comma between `customFoodsApi` and `weightApi`).

- **Exercise library expanded** (`src/data/exercises.ts`): Added ~70 new exercises (IDs e130–e228): Chest (Landmine Press, Svend Press, etc.), Back (Meadows Row, Pendlay Row, Good Morning, etc.), Shoulders (Cuban Press, Bradford Press, Y-T-W Raise, etc.), Biceps (Spider Curl, Drag Curl, 21s Curl, etc.), Triceps (JM Press, Kickback, etc.), Quads (Hack Squat, Sissy Squat, Box Jump, Pause Squat, etc.), Hamstrings (Nordic Curl, Swiss Ball Leg Curl, etc.), Glutes (Cable Pull-Through, Banded Clamshell, etc.), Calves (Donkey, Single-Leg, Leg Press varieties), Core (Bicycle Crunch, Dead Bug, Toes-to-Bar, etc.), Cardio (Battle Ropes, Sled Push, Sprint Intervals), Adductors, Abductors (4 exercises each), Full Body (Turkish Get-Up, Man Maker, Sandbag Carry, Bear Crawl). `MUSCLE_GROUPS` array updated with `"Adductors"` and `"Abductors"`. Total library: ~106 → ~175+ exercises.

- **Custom exercises — full stack** (`prisma/schema.prisma`, `src/controllers/customExerciseController.ts`, `src/routes/customExerciseRoutes.ts`, `src/server.ts`, `src/controllers/searchController.ts`, `client/src/types/index.ts`, `client/src/api/index.ts`, `client/src/pages/workouts/WorkoutsPage.tsx`):
  - Prisma: new `CustomExercise` model (userId FK, name, primaryMuscle, secondaryMuscles JSON, equipment, difficulty, instructions) with cascade delete.
  - CRUD API at `/api/custom-exercises` (list with q+muscle filter, create, update, delete) — all routes authenticated, all user-owned checks enforced.
  - `searchController.ts` merges user's custom exercises (prefix `custom_${id}`, `isCustom: true`) at the top of exercise search results.
  - Client: `CustomExercise` interface in `types/index.ts`; `customExercisesApi` (list/create/update/delete) in `api/index.ts`.
  - WorkoutsPage UI: `CreateCustomExerciseModal` with fields (name, primaryMuscle select, equipment select, difficulty 3-button toggle, instructions textarea). ExerciseSearch no-results state shows "+ Create 'X' as custom exercise" → fires `onChange("__create_custom__:" + query)`. `ExerciseRows` intercepts this signal, opens modal pre-filled with the query string. On creation success: row exercise name updates to new custom exercise.

### Bugs fixed

- **Log Weight button in ProgressPage silently broken**: `<Modal>` JSX was absent — state/button existed, rendering did not. Added the Modal wrapping `LogWeightForm`.
- **Weight FAB missing from Nutrition and Home**: NutritionPage had no way to log weight. Added FAB. (Dashboard FAB was already present from a prior session.)
- **NutritionPage import corruption**: `customFoodsApi   weightApi` (missing comma) caused lint error. Fixed with Python string replacement.
- **WorkoutsPage modal insertion**: File contains Unicode em-dash characters (─) encoded as multi-byte sequences on CIFS mount; Python `str.replace()` failed on banner lines. Used line-number insertion (`lines[:N] + new_lines + lines[N:]`) instead of string matching.

### TypeScript
- `npx tsc --noEmit` — 0 errors (backend)
- `npx tsc --noEmit` — 0 errors (frontend)

### Pending (next priorities)
- **#71 + dynamic goal graph**: Editable weight prediction graph in ProgressPage + live projection chart in EditGoalModal (drag/adjust target weight/date/deficit → see projected weight curve update in real time)
- **#83**: AI provider abstraction — DeepSeek default, OpenAI fallback (P2, AI/ML)
- **#84**: AI embeddings + RAG for user history context in chat (P3, AI/ML)
- **#85**: Backend pagination for large result sets — food logs, workouts (P2, Infrastructure)

---

## Session 2026-05-01 — Architecture planning: Advanced AI + Design review

### Advanced AI system plan (tasks #114–#127)

**Build order (strict):**
1. `#124` Provider abstraction (ProviderAdapter interface, OpenAI/Anthropic/DeepSeek) — hard blocker on all AI work
2. `#114` User context builder (`buildUserContext(userId)`) + AgentMessage conversation memory model
3. `#115` AI function calling tools (`get_today_nutrition`, `get_weight_trend`, `get_recent_workouts`, `get_goal_progress`, `suggest_foods`)
4. `#116` + `#117` Nutrition agent + Workout agent (parallel)
5. `#118` AINotification Prisma model + CRUD backend
6. `#119` Proactive scheduler (opt-in, per-type, timezone-aware) — requires #125 (user timezone) first
7. `#125` Proactive notification preferences UI (Settings page, all off by default)
8. `#120` + `#121` Notification center UI + Dashboard coach card (collapsed by default)
9. `#122` AI Coach page redesign (silent query routing, 3 specialist tabs, remove general chat)
10. `#123` Inline smart suggestions (Nutrition + Workouts pages)

**Goals overhaul build order:**
1. `#126` Extract shared components (ProjectionChart, GoalValidator, ImpactPanel) — blocks all below
2. `#108` Goals page visual redesign
3. `#109` + `#110` + `#111` Real-time projection chart + validator + impact panel (parallel, all use #126 components)
4. `#113` Goal creation wizard (also uses #126 components)
5. `#112` AI goal advisor (requires #114, #115)

### Design decisions locked in

- **No general AI chat** — deleted. AI Coach has 3 specialist tabs: Nutrition / Workouts / Goals
- **Silent query routing** — user types freely, backend router classifies intent and forwards to correct specialist agent. Tab lights up to show which expert answered. No user-facing "which tab?" prompt.
- **Context injection + function tools + memory (no RAG)** — `buildUserContext()` snapshot injected at call start; function tools fetch live data mid-conversation; last 20 AgentMessage rows re-injected as history per agent thread. RAG/embeddings deferred post-v1.
- **Proactive AI is opt-in** — all notification types off by default. User enables per type in Settings > AI Coach section. Timezone stored in profile, all cron times converted to UTC.
- **Date-cursor pagination for food logs** — `?before=DATE&limit=7days` keeps date groups intact. Workout history uses standard offset pagination.
- **Shared goal components first** — ProjectionChart, GoalValidator, ImpactPanel extracted before EditGoalModal or wizard work begins. Single source of truth for TDEE/projection math.
- **Dashboard coach card collapsed** — single line by default, expand on tap. Only auto-expanded when time-sensitive (< 3h left in day, milestone just crossed).
- **Custom exercise visible entry** — "+ Custom" button in WorkoutsPage as primary entry point. No-results shortcut stays as acceleration.
- **Goals page vs AI Coach Goals tab** — distinct purposes: Goals page = data view (rings, charts, editing targets). AI Coach Goals tab = conversation with goal advisor. Labels and empty states must make this split explicit.
- **Bottom nav frozen at 5 items** — no new primary nav items. Next consolidation candidates: Goals inside AI Coach (freeing one slot).

### Pending (next session priorities)
- `#124` Provider abstraction — start here, everything AI depends on it
- `#126` Shared goal components — start here for Goals overhaul
- `#106` / `#107` Pagination (food log date-cursor, workout offset)
- `#127` Custom exercise visible entry point (quick win)

---

## Session 2026-05-01 — Daily reset fix + Calories burned + i18n planning

### Daily reset bug (#128) — fixed

**Root cause:** All "today" boundaries used UTC midnight with no timezone awareness. A user in any non-UTC timezone would see stale data after UTC midnight but before their local midnight, and there was no 4am rollover.

**Fix architecture:**
- `src/utils/dayBounds.ts` — new utility. `getDayBounds(tz, rolloverHour=4)` returns UTC `{ start, end, dateStr }` for the user's effective day. Uses noon-UTC trick to compute timezone offset (avoids DST edge cases). `tzFromRequest(headers)` reads `X-Timezone` header with IANA validation + UTC fallback.
- `client/src/api/axios.ts` — `X-Timezone` header injected on every request via existing interceptor.
- `dashboardController`, `foodController`, `waterController` — all converted to `getDayBounds(tz)`. Historical date browsing (explicit date param) still uses UTC midnight — intentional, correct for past-day browsing.
- `NutritionPage.tsx` — `getEffectiveToday()` client helper for date state init, `isToday`, date picker max.

**Supplements reset correctly** because they're stored in localStorage keyed by date string and cleared when `getEffectiveToday()` changes — no backend change needed.

### Calories burned (#129) — implemented

**Backend:**
- MET lookup table in `workoutController.ts`: strength 5.0, cardio 8.0, HIIT 10.0, endurance 7.0, yoga 2.5, crossfit 8.5, etc.
- `estimateCaloriesBurned(durationMin, weightKg, trainingType)` → `MET × weight × hours`
- `createWorkout`: auto-estimates if client doesn't supply `caloriesBurned`; stores result on Workout row
- New endpoint `GET /api/workouts/calories-burned?date=YYYY-MM-DD` returns `{ date, totalBurned, workouts[] }`

**Frontend:**
- `workoutsApi.getCaloriesBurned(date?)` in api/index.ts
- NutritionPage Calories card: "−X kcal burned" (orange) + "Net: Y kcal" shown when burned > 0
- WorkoutsPage already rendered `caloriesBurned` on workout cards — now always populated

**Later:** Apple Watch / Health kit integration will replace MET estimates with actual HR-derived calorie burn.

### i18n (#130) — completed

**Architecture:** Custom zero-dependency i18n. `I18nProvider` + `useTranslation()` hook + exported module-level `t()` (imported as `_t` in files that shadow it with the hook). Language stored in `localStorage["lang"]`.

**Files:**
- `client/src/i18n/index.tsx` — provider, hooks, `LOCALES` map, `LANG_LABELS`, module-level `t()`
- `client/src/i18n/locales/en.ts` — English strings (~613 lines, typed via `Translation` interface). Sections: `nav`, `common`, `dashboard`, `nutrition` (65 keys), `workouts` (91 keys), `progress`, `goals` (13 keys), `profile`, `settings` (38 keys), `auth`, `offline`, `chat` (35 keys), `reports`, `mealPlanner`, `templates`, `ai`
- `client/src/i18n/locales/es.ts` — Spanish strings implementing same interface (all sections translated)

**Pages fully translated:** Workouts, Chat, Settings (with toast on language change), Goals, Nutrition, Reports, MealPlanner, Templates, and all shared components (Dashboard, Profile, Auth, Sidebar, BottomNav). Month names in Reports use `Intl.DateTimeFormat` so they auto-localise without extra keys. Day names in MealPlanner are in `mealPlanner.monday…sunday` keys.

**Adding a language:** Create `client/src/i18n/locales/xx.ts` implementing `Translation` interface → add to `LOCALES` + `LANG_LABELS` in `index.tsx`. Zero component changes needed.

**AI locale injection:** `X-Language` header on every request → `chatController.ts` reads it → `prompts.ts` instructs AI to respond in user's language (exercise names stay English).

**Pending (next session priorities):**
- `#128` ✅ Daily reset + 4am rollover
- `#129` ✅ Calories burned estimation + display
- `#130` ✅ i18n — Spanish fully done (all pages)
- `#126` Shared goal components (blocks Goals overhaul)
- `#124` Provider abstraction (blocks AI agents)

## Session 2026-05-01 (continued) — Calories burned UX + i18n + Exercise library

### Calories burned prominent display + inline edit (#131) — completed

**WorkoutsPage:**
- `quickEstimateKcal(trainingType, durationMin, weightKg)` helper mirrors backend MET table; auto-fills calories field live as duration/type change. `caloriesIsAuto` flag tracks whether user has manually overridden — shows "↩ reset estimate" link if so.
- `WorkoutDetail` meta row: replaced `· X kcal` span with an orange flame pill button. Clicking it opens inline editor (number input + Save/✕). State: `kcalValue`, `kcalDraft`, `editingKcal`, `savingKcal`. Saves via `workoutsApi.update(id, { caloriesBurned })`.
- History cards: Badge replaced with `🔥 X kcal` orange pill (bg-orange-100, border-orange-200).
- NutritionPage Calories card: Burned total is now a clickable button that expands into per-workout breakdown list (`burnedWorkouts[]`). Tap to collapse.

### i18n — Spanish (#130) — completed

**Architecture:** Custom zero-dependency i18n (avoids npm registry issues). Mirrors react-i18next API surface for easy future swap.

**Files:**
- `client/src/i18n/index.tsx` — `I18nProvider`, `useTranslation()` hook, `changeLanguage()`, `getInitialLang()` (reads localStorage `lang` key or browser navigator.language)
- `client/src/i18n/locales/en.ts` — English strings (~250 keys across 9 namespaces), typed via `Translation` interface
- `client/src/i18n/locales/es.ts` — Spanish strings implementing same interface. Exercise names stay in English.
- `client/src/main.tsx` — App wrapped in `<I18nProvider>`

**Language picker:** `LanguagePicker` component in `SettingsPage.tsx` (🇬🇧 English / 🇪🇸 Español toggle buttons). Persists to `localStorage["lang"]`.

**Navigation:** Sidebar and BottomNav both call `useTranslation()` and render nav labels through `t("nav.*")`.

**AI locale injection:**
- `client/src/api/axios.ts` — sends `X-Language: en|es` header on every request
- `chatController.ts` — reads `x-language` header → `userWithLang = { ...user, language }`
- `src/ai/prompts.ts` — `UserContext.language` field. When `"es"`: appends instruction to respond entirely in Spanish (exercise names remain in English)

### Exercise library expansion (#133) — completed

**New muscle groups:**
- `Brachialis` — 6 exercises: Hammer Curl, Cross-Body Hammer Curl, Reverse Curl, Zottman Curl, Cable Hammer Curl, Rope Cable Curl (IDs e130–e135)
- Extended `Glutes` — 8 new: Abduction Machine, Banded Side Walk, Cable Hip Abduction, Step-Up, Clamshell, Nordic Hamstring Curl, Reverse Hyperextension, Lateral Band Walk (IDs e140–e147)
- Extended `Traps` — 4 new: Snatch-Grip Deadlift, Trap Bar Shrug, Meadows Row, High Pull (IDs e150–e153)

**Compound filter groupings (`COMPOUND_GROUP_MAP`):**
- `Push` → Chest, Shoulders, Triceps
- `Pull` → Back, Biceps, Traps, Brachialis
- `Upper Body` → Chest, Back, Shoulders, Biceps, Triceps, Forearms, Brachialis, Traps
- `Lower Body` → Quads, Hamstrings, Glutes, Calves, Adductors, Abductors

Map used in: `searchExercises()` (in-memory fallback), `searchController.ts` (DB query, both regular + custom exercises), `WorkoutsPage` muscle group chips.

Compound chips appear at the top of all muscle group selectors (WorkoutForm builder, ExerciseRows per-row selector, AddExercisePanel).

**Pending:**
- `#126` Shared goal components (blocks Goals overhaul)
- `#124` Provider abstraction (blocks AI function tools)
- `#106` Food log date-cursor pagination
- `#107` Workout history pagination
