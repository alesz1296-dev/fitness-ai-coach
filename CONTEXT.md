# FitAI Coach — Agent Context File

Read this at the start of every session before touching any code.

---

## What This Project Is

A full-stack AI-powered fitness coaching web app.

- **Backend**: Node.js + Express + TypeScript (ESM / NodeNext), Prisma ORM + SQLite (`dev.db`), JWT auth, OpenAI API
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
├── scripts/
│   └── kill-port.cjs           # Kills port 3000 before dev server starts (Windows fix)
├── CONTEXT.md                  # ← This file
└── LOG.md                      # Session-by-session change log
```

---

## Key Architectural Decisions

| Topic | Decision |
|---|---|
| Module system | ESM (`"module": "NodeNext"` in tsconfig.json). All imports need `.js` extensions. |
| Auth | JWT access tokens (15 min) + JWT refresh tokens (30 days) with JTI-based in-memory revocation. No DB table for tokens. |
| Token revocation | `src/lib/tokenBlocklist.ts` — in-memory Map, cleared on restart. Production needs Redis. |
| Schema source of truth | `prisma/schema.prisma` only. The root `schema.prisma` was stale and has been deleted. |
| AI structured output | AI embeds fenced blocks: ` ```workout-json``` `, ` ```nutrition-json``` `, ` ```meal-plan-json``` `. Backend extracts with regex, returns as `suggestedWorkout` / `suggestedPlan` / `suggestedMealPlan` in chat API response. |
| AI tool-calling | `agent.ts` uses a MAX_TOOL_ROUNDS=5 loop. 6 read-only tools: get_recent_workouts, get_nutrition_summary, get_weight_trend, get_active_calorie_goal, get_workout_templates, get_personal_records. Each agent type gets a tailored tool subset. |
| Rate limiting | `generalLimiter` mounted on `/api/` in `server.ts`. In-memory (needs Redis for production). |
| Validation | All routes use Zod schemas via `validate()` middleware. `schemas.ts` is the single source of all schemas. |
| Windows dev | `predev` script runs `scripts/kill-port.cjs` to kill port 3000. Server has SIGINT handler + 3s force-exit. |
| Onboarding detection | `Layout.tsx` checks `!user.goal && !localStorage.getItem('fitai_onboarded_${userId}')` to show the wizard. |

---

## API Routes (all under `/api`)

| Method | Path | Description | Validated |
|---|---|---|---|
| POST | `/auth/register` | Register | ✅ |
| POST | `/auth/login` | Login | ✅ |
| POST | `/auth/refresh` | Refresh access token | — |
| POST | `/auth/logout` | Logout | — |
| GET | `/auth/me` | Current user | — |
| GET/PUT | `/users/profile` | User profile | ✅ PUT |
| PUT | `/users/password` | Change password | ✅ |
| GET/POST/PUT/DELETE | `/workouts` | Workout CRUD | ✅ |
| POST | `/workouts/:id/exercises` | Add exercise to existing workout | ✅ |
| PUT/DELETE | `/workouts/exercises/:id` | Edit / remove an exercise row | ✅ PUT |
| POST | `/workouts/start-from-template/:id` | Start workout from template | — |
| GET | `/workouts/stats` | Workout stats + PRs | — |
| GET | `/workouts/exercises/:name/progression` | Exercise progression chart data | — |
| GET/POST/PUT/DELETE | `/foods` | Food log CRUD | ✅ POST/PUT |
| POST | `/foods/bulk` | Log multiple foods at once (AI meal plan) | ✅ |
| GET | `/foods/history` | Last N days of calorie data | — |
| GET/POST/DELETE | `/weight` | Weight entries | ✅ POST |
| GET/POST/PUT/DELETE | `/goals` | Fitness goals | ✅ POST/PUT |
| GET/POST/PUT/DELETE | `/calorie-goals` | Calorie/macro goals | ✅ POST/PUT/POST preview |
| GET/POST/PUT/DELETE | `/templates` | Workout templates | ✅ |
| POST | `/templates/seed` | Seed 24 system templates | — |
| POST | `/chat` | Send AI message (rate limited) | ✅ |
| GET/DELETE | `/chat/history` | Conversation history | — |
| POST | `/chat/save-workout` | Save AI workout as template | ✅ |
| POST | `/chat/save-calorie-plan` | Save AI plan as calorie goal | ✅ |
| GET/POST | `/weekly-plan` | Weekly plan CRUD | ✅ |
| PATCH | `/weekly-plan/days/:id/toggle` | Mark day complete | ✅ |
| PUT | `/weekly-plan/days/:id` | Update day | ✅ |
| DELETE | `/weekly-plan/:id` | Delete plan | ✅ |
| GET | `/reports` | Monthly progress reports | — |
| POST | `/reports/generate` | Generate report (rate limited) | ✅ |
| GET | `/dashboard` | Dashboard aggregates | — |
| GET | `/search/foods` | Food search | — |
| GET | `/search/exercises` | Exercise search (supports ?muscle= filter) | — |

---

## Prisma Models (summary)

User, Workout, WorkoutExercise, WorkoutTemplate, TemplateExercise, FoodLog, WeightEntry, Goal, CalorieGoal, Conversation, WeeklyPlan, WeeklyPlanDay

Notable field names (easy to get wrong):
- `MonthlyReport`: `totalWorkouts`, `totalVolume`, `avgCalories`, `avgProtein`, `weightDelta`
- `Conversation`: `message` (user text), `response` (AI text), `agentType`
- `WeeklyPlan` unique: `@@unique([userId, weekStart])` → key name `userId_weekStart`
- `MonthlyReport` unique: `@@unique([userId, year, month])` → key name `userId_year_month`

---

## Frontend Pages & Components

| Route / File | Status | Notes |
|---|---|---|
| `/dashboard` | ✅ Done | Dashboard aggregates, recent workouts, calorie goal progress |
| `/workouts` | ✅ Done | History tab + Templates tab (merged). Add-exercise panel with muscle-group filter. Profile-aware recommended banner. |
| `/templates` | ✅ Removed | Redirects to `/workouts` |
| `/nutrition` | ✅ Done | Food log by meal, macro rings, AI meal plan suggestion (✨ Suggest Plan), delete entries, live macro recalculation |
| `/weight` | ✅ Done | Weight log + trend chart |
| `/goals` | ✅ Done | CRUD for fitness goals |
| `/chat` | ✅ Done | 3 agents, tool-calling, save workout/plan from chat |
| `/reports` | ✅ Done | Monthly reports with AI summary |
| `/settings` | ✅ Done | ProfileForm, PasswordForm, AccountInfo |
| `/progress` | ✅ Done | Two tabs: Body & Weight (weight trend + body composition card with fat%/muscle% auto-calc via Deurenberg) and Exercise Progression (per-exercise line charts) |
| `OnboardingModal` | ✅ Done | 3-step wizard shown to new users. Goal → Stats → Plan preview (TDEE + macros + suggested template). Saves profile + calorie goal. |

---

## Known Issues & TODO

### 🔴 Active bugs / gaps
- *(All Phase 3 items resolved in Session 8 — see LOG.md)*
- *(All Phase 4 feature polish items resolved in Sessions 9–11 — see LOG.md)*

> **Note for next deploy:** DB migrations were applied directly via sqlite3 in the sandbox. When pulling to a new machine, run `npx prisma generate` to regenerate Prisma client types, then `npx prisma migrate deploy` to apply:
> - `20260423000000_add_conversation_metadata_and_profile_complete`
> - `20260423000001_add_protein_multiplier`

### 🟠 Phase 4 — Production hardening
These should be done before any public deployment:

- **PostgreSQL** — Swap SQLite (`dev.db`) for PostgreSQL. Update `DATABASE_URL` in `.env` and run `prisma migrate deploy`. No schema changes needed.
- **Redis** — Replace in-memory token blocklist (`tokenBlocklist.ts`) and rate limiter with Redis-backed implementations. Required for multi-instance deployments.
- **Docker** — `Dockerfile` for backend + frontend + optional Nginx reverse proxy. `docker-compose.yml` wiring them together with a Postgres service.
- **CI pipeline** — GitHub Actions: lint → `tsc --noEmit` (both) → `prisma validate` → build → optional test run.
- **Env validation on startup** — Fail fast if `OPENAI_API_KEY`, `JWT_SECRET`, or `DATABASE_URL` are missing. `src/config/env.ts` already has the structure; add `process.exit(1)` on missing required vars.
- **OpenAI error handling** — Current code only handles 401 and 429. Add handling for: context length exceeded (400 with specific code), model not found, service unavailable (503), timeout.
- **DB indexes** — Add `@@index` in schema for frequently queried fields: `FoodLog.userId + date`, `Workout.userId + date`, `WeightEntry.userId + date`.

### 🟡 Phase 4 — Feature polish (UX improvements) — COMPLETED in Sessions 9–11

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
- **Progress projections on dashboard** — Ongoing actual-vs-projected weight chart. The `calorieGoalsApi.getProjection(id)` endpoint already returns both actual and projected arrays. Just needs a Recharts `ComposedChart` wired in on the Dashboard.
- **Weekly plan → workout link** — When marking a weekly plan day complete, prompt to link it to a logged workout (a `workoutId` picker). The data model already supports this (`WeeklyPlanDay.workoutId`).
- **Meal plan save as template** — After the nutritionist suggests a meal plan, offer to save it as a reusable "meal template" (not just log it for today). Would need a new `MealTemplate` Prisma model.
- **Calorie goal progress on dashboard** — Show how many kcal remain today vs goal. The `CalorieProgress` component exists in NutritionPage; reuse it on the Dashboard.

### 🔵 Phase 5 — Feature enhancements
Nice-to-haves for a mature product:

- **Barcode scanner** — Use device camera to scan packaged foods and auto-fill nutrition data (requires a barcode API like Open Food Facts).
- **Exercise video links / form cues** — Link exercises to form guide videos or embed cue text on the exercise detail.
- **Push notifications / streak reminders** — PWA push or email reminders for missed workout days, calorie logging gaps.
- **Social / sharing** — Export a workout summary or weekly stats as a shareable image.
- **Progressive Web App** — Service worker + manifest for offline support and home-screen install.
- **Seeded DB tables** — Move the ~257-item food database (expanded Session 9) and 115-item exercise database from in-memory arrays into Prisma-seeded DB tables for full-text search support.
- **Agent write tools** — Add `log_food` and `save_workout_template` to the agent tool set so the AI can proactively log data on the user's behalf during chat.
- **Multi-language support** — The UI is English-only. i18n scaffolding (react-i18next) would open the app to a wider audience.

---

## Running the Project

```bash
# Backend (from project root)
npm run dev          # kills port 3000, starts tsx watch

# Frontend (from client/)
npm run dev          # Vite dev server on :5173

# DB migrations
npx prisma migrate dev --name <name>
npx prisma generate

# If Prisma client is stale
npx prisma generate && npx prisma migrate dev
```

---

## Common Gotchas

- Always run `npx prisma generate` after changing `prisma/schema.prisma`
- On Windows, `Remove-Item -Recurse -Force node_modules/.prisma` (not `rd /s /q`) if client is stale
- ESM imports require `.js` extension even for `.ts` source files
- CORS preflight: `OPTIONS` must be in `allowedHeaders` and `app.options("*", cors())` must be present
- `WeeklyPlanWidget` will crash if the `WeeklyPlan` migration hasn't been run — it has a try/catch that shows a migration reminder
- Token blocklist is in-memory — cleared on server restart, so recently logged-out refresh tokens become temporarily valid again
- `meal` field on `FoodLog`: typed as `"breakfast" | "lunch" | "dinner" | "snack" | null` — never pass a plain `string`
- Food DB stores nutrition per 100g. Use `calcMacro(valuePer100g, qty, unit, defaultQty)` in `NutritionPage.tsx` — the unit-aware formula differs for weight vs count-based units
- Onboarding wizard is suppressed by `localStorage.fitai_onboarded_${userId}`. Clear that key to re-trigger it during testing
