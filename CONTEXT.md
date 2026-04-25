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

| Topic                  | Decision                                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module system          | ESM (`"module": "NodeNext"` in tsconfig.json). All imports need `.js` extensions.                                                                                                                                                             |
| Auth                   | JWT access tokens (15 min) + JWT refresh tokens (30 days) with JTI-based in-memory revocation. No DB table for tokens.                                                                                                                        |
| Token revocation       | `src/lib/tokenBlocklist.ts` — in-memory Map, cleared on restart. Production needs Redis.                                                                                                                                                      |
| Schema source of truth | `prisma/schema.prisma` only. The root `schema.prisma` was stale and has been deleted.                                                                                                                                                         |
| AI structured output   | AI embeds fenced blocks: ` ```workout-json``` `, ` ```nutrition-json``` `, ` ```meal-plan-json``` `. Backend extracts with regex, returns as `suggestedWorkout` / `suggestedPlan` / `suggestedMealPlan` in chat API response.                 |
| AI tool-calling        | `agent.ts` uses a MAX_TOOL_ROUNDS=5 loop. 6 read-only tools: get_recent_workouts, get_nutrition_summary, get_weight_trend, get_active_calorie_goal, get_workout_templates, get_personal_records. Each agent type gets a tailored tool subset. |
| Rate limiting          | `generalLimiter` mounted on `/api/` in `server.ts`. In-memory (needs Redis for production).                                                                                                                                                   |
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
- `WorkoutCalendarDay`: `date` is `String` (YYYY-MM-DD), `muscleGroups` stored as JSON string in SQLite. Unique: `@@unique([userId, date])` → key `userId_date`. Created via `TABLE_MIGRATIONS` in `runMigrations.ts` (no Prisma migration file needed).

---

## Frontend Pages & Components

| Route / File      | Status     | Notes                                                                                                                                                         |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`      | ✅ Done    | Dashboard aggregates, recent workouts, calorie goal progress. Weight FAB (fixed ⚖️ button, bottom-right) for quick weigh-ins.                                 |
| `/workouts`       | ✅ Done    | History tab + Calendar tab + Templates tab. Training-type pill selector + coloured card badge. Inline rest timer in workout detail. Calendar: monthly grid with planned days overlay, "Apply Template" modal (assign templates to weekdays → fills whole month), click-to-edit days, swap-days mode, clear month. **PlanToCalendarModal**: from template detail, populates 1–3 months with pre-filled weekday pills + duration picker. **EditCalendarDayModal** now has "🔁 Apply to all [Mon/Tue/…]s this month" bulk-apply button (calls `calendarApi.populate` for that single weekday + overwrite). Training days/week selector is now an obvious labeled badge with pencil icon. Templates include endurance (running base/intervals/tempo/long run/triathlon/HIIT/rowing) and powerlifting (5/3/1 variants) plans. |
| `/templates`      | ✅ Removed | Redirects to `/workouts`                                                                                                                                      |
| `/nutrition`      | ✅ Done    | Food log by meal, macro rings, AI meal plan suggestion (✨ Suggest Plan), delete entries, live macro recalculation. ⚡ Quick Re-log amber strip (top 5 frequent foods). |
| `/weight`         | ✅ Done    | Weight log + trend chart                                                                                                                                      |
| `/goals`          | ✅ Done    | CRUD for fitness goals                                                                                                                                        |
| `/chat`           | ✅ Done    | 3 agents, tool-calling, save workout/plan from chat. History sidebar (last 30 across agents). Agent-switch confirmation modal. Save buttons re-hydrated from `metadata` on history load. AI suggestions now show as prominent `SuggestionCard` components (icon + question + confirm/dismiss/saved states) instead of small link buttons. |
| `/reports`        | ✅ Done    | Monthly reports with AI summary                                                                                                                               |
| `/settings`       | ✅ Done    | ProfileForm, PasswordForm, AccountInfo                                                                                                                        |
| `/progress`       | ✅ Done    | Two tabs: Body & Weight (weight trend + body composition card with fat%/muscle% auto-calc via Deurenberg) and Exercise Progression (per-exercise line charts) |
| `OnboardingModal` | ✅ Done    | 3-step wizard shown to new users. Goal → Stats → Plan preview (TDEE + macros + suggested template). Saves profile + calorie goal.                             |

---

## Known Issues & TODO

### 🔴 Active bugs / gaps

- _(All Phase 3 items resolved in Session 8 — see LOG.md)_
- _(All Phase 4 feature polish items resolved — see LOG.md)_
- ✅ **Rate limiter too aggressive during testing** — Fixed in `src/middleware/rateLimiter.ts`. Dev mode now uses 5 000 req/15 min (general), 500 (chat), 200 (auth). Override via env vars: `RATE_LIMIT_MAX`, `CHAT_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `REPORT_RATE_LIMIT_MAX`.
- ✅ **Water intake buttons not persisting** — Fixed in `src/controllers/waterController.ts`: `logWater` stores dates as UTC midnight, `getToday` uses UTC-consistent start/end boundaries. Frontend `handleAddWater`/`handleDeleteWater` now catches errors and shows an inline banner.
- ✅ **Rest/Workout days ↔ Settings desync** — Fixed in `WeeklyPlanWidget.tsx`: `SetupModal` receives `initialDays` from `user.trainingDaysPerWeek`; on save it calls `usersApi.updateProfile({ trainingDaysPerWeek })` and refreshes the auth store so Settings stays in sync.
- ✅ **No scroll / no category filter in workout builder** — Fixed in `WorkoutsPage.tsx`: added `BUILDER_MUSCLE_GROUPS` filter chips above `ExerciseRows` in `WorkoutForm`; selected muscle passed as `defaultMuscle` prop and forwarded to each `ExerciseSearch`.
- ✅ **Water intake not optional** — Fixed: `App Preferences` card added to SettingsPage with `trackWater` toggle stored in `localStorage("app_prefs_v1")`; NutritionPage conditionally renders the water widget based on this preference. Also fixed WeeklyPlanWidget: mismatch banner shown when `user.trainingDaysPerWeek` ≠ `plan.days.length` with an "Adjust plan →" CTA. Header button now reads "✏️ Edit Schedule" with scroll hint in plan picker.

> **Note for next deploy:** DB migrations were applied directly via sqlite3 in the sandbox. When pulling to a new machine, run `npx prisma generate` to regenerate Prisma client types, then `npx prisma migrate deploy` to apply:
>
> - `20260423000000_add_conversation_metadata_and_profile_complete`
> - `20260423000001_add_protein_multiplier`

### 🟠 Phase 4 — Production hardening

These should be done before any public deployment:

- **PostgreSQL** — Swap SQLite (`dev.db`) for PostgreSQL. Update `DATABASE_URL` in `.env` and run `prisma migrate deploy`. No schema changes needed.
- **Redis** — Replace in-memory token blocklist (`tokenBlocklist.ts`) and rate limiter with Redis-backed implementations. Required for multi-instance deployments.
- **Docker** — `Dockerfile` for backend + frontend + optional Nginx reverse proxy. `docker-compose.yml` wiring them together with a Postgres service and Redis service.
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

**Remaining for PWA / App Store (Phase 5):**
- `vite-plugin-pwa` service worker + manifest for home-screen install
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

- **Progressive Web App** — `vite-plugin-pwa`: service worker + manifest for offline support and home-screen install. Prerequisite for push notifications and the stepping-stone to mobile deployment.
- **Mobile deployment** — Once the PWA shell is in place, submit to Apple App Store and Google Play Store via a wrapper (e.g. Capacitor or PWABuilder). Requires App Store / Play Console accounts, icons, screenshots, and privacy policy. _Depends on Phase 4.5 responsive pass + PWA._
- **Push notifications / streak reminders** — PWA push or email reminders for missed workout days, calorie logging gaps, and streak milestones. _Depends on PWA._
- **Admin dashboard for usage analytics** — Internal-only page (role-gated) showing active users, workouts logged per day, food entries, AI chat usage, and error rates. Useful before any public launch to monitor real usage. Stack: aggregate queries on existing tables + a simple Recharts dashboard page under `/admin`.
- **Agent write tools** — Add `log_food` and `save_workout_template` to the agent tool set so the AI can proactively log data on the user's behalf during chat.
- **Social / sharing** — Export a workout summary or weekly stats as a shareable image (Canvas API → PNG download or Web Share API).
- **Apple Health / Samsung Health / Apple Watch** — Read steps, heart rate, active calories, and sleep data from HealthKit (iOS) and Samsung Health (Android) to enrich the dashboard and auto-log cardio. Apple Watch companion app for logging sets in-session. _Requires native wrapper (Capacitor plugin or React Native rewrite for Watch)._
- **Barcode scanner** — Use device camera to scan packaged foods and auto-fill nutrition data via Open Food Facts API. Lower priority since manual search already works well.
- **Exercise video links / form cues** — Link each exercise to a form guide video or embed cue text in the exercise detail view. Low effort (metadata field) but requires sourcing content.
- **Multi-language support** — The UI is English-only. i18n scaffolding (react-i18next) would open the app to a wider audience.

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

| #   | Item                                          | Location                                                                            |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| 21  | OpenAI API key integration test               | `.env` → live chat test (⚠️ ask before running)                                     |
| 22  | Seeded DB tables for food & exercise          | `prisma/seed.ts` + new `FoodItem` / `ExerciseItem` models                           |
| 23  | PostgreSQL swap                               | `DATABASE_URL` + `prisma migrate deploy`                                            |
| 24  | Redis — token blocklist + rate limiter        | `tokenBlocklist.ts` + `rateLimiter.ts`                                              |
| 25  | Docker (Dockerfile + docker-compose)          | Repo root → API + Postgres + Redis services                                         |
| 26  | CI pipeline (lint → typecheck → test → build) | `.github/workflows/ci.yml` — set up after Docker so CI runs the containerised stack |
| 27  | Weekly plan migration reminder in onboarding  | Onboarding Step 1 or post-login gate                                                |

### P5 — Larger features (plan a dedicated session for each)

| #   | Item                                                    | Notes                                                                     | Depends on                  |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| 28  | Superset / ascending series / circuit config            | Schema change + builder UI + rest timer integration                       | —                           |
| 29  | Meal plan save as template                              | New `MealTemplate` Prisma model                                           | —                           |
| 30  | Mobile version readiness — Phase 4.5                    | Responsive layout pass + bottom tab nav + touch targets                   | Ask for dedicated session   |
| 31  | Progressive Web App                                     | `vite-plugin-pwa` — offline support + installable                         | Phase 4.5                   |
| 32  | Admin dashboard (usage analytics)                       | Role-gated `/admin` page; aggregate queries on existing tables + Recharts | PostgreSQL (#23)            |
| 33  | Mobile deployment (App Store + Play Store)              | Capacitor or PWABuilder wrapper; accounts + privacy policy required       | PWA (#31) + Phase 4.5 (#30) |
| 34  | Push notifications / streak reminders                   | PWA push or email; streak alerts + workout reminders                      | PWA (#31)                   |
| 35  | Agent write tools (`log_food`, `save_workout_template`) | `src/ai/agent.ts` tool set                                                | —                           |
| 36  | Social / sharing (workout summary image)                | Canvas API → PNG or Web Share API                                         | —                           |
| 37  | Apple Health / Samsung Health / Apple Watch             | HealthKit + Samsung Health SDK; Watch companion requires native wrapper   | Mobile deployment (#33)     |
| 38  | Multi-language support                                  | `react-i18next` scaffolding                                               | —                           |
| 39  | Barcode scanner for food logging                        | Open Food Facts API; manual search already works                          | —                           |
| 40  | Exercise video links / form cues                        | Per-exercise metadata field; requires content sourcing                    | —                           |

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
