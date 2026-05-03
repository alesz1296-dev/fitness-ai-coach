# FitAI Coach — Change Log

Most recent session first.

## 2026-05-03 - Session: dynamic refresh + food localization

### Goal
Make the core tabs refresh through shared app events and expand the food catalog with more exact single-item staples plus a database-backed localization layer.

### Files modified
- `src/data/foods.ts` - added exact single-item foods and beverage staples; bumped `FOOD_DB_VERSION` to `2026-05-03-staples-v6`
- `src/controllers/searchController.ts` - added locale-aware food name output with DB-backed localized names and AI fallback
- `src/lib/appEvents.ts` - added a shared `dataChanged` event used to fan out refreshes
- `client/src/components/layout/Layout.tsx` - now refreshes the auth profile on shared data changes
- `client/src/components/layout/ProfileSummaryBar.tsx` - now refetches on shared data changes
- `client/src/pages/dashboard/Dashboard.tsx` - now refreshes on shared data changes
- `client/src/pages/progress/ProgressPage.tsx` - now refreshes on shared data changes
- `client/src/pages/settings/SettingsPage.tsx` - weight changes still confirm before logging as current weight

### Notes
- Added exact entries for `Egg (whole, 1)`, `Egg White (1)`, `Apple Juice (1 cup)`, and `Coffee (black)`.
- The food catalog now stores optional localized names so the API can prefer a translated DB string before falling back to AI translation.
- Shared `dataChanged` events reduce the amount of page-specific manual refresh glue.

---

## 2026-05-03 - Session: weight sync overhaul

### Goal
Make the profile weight, dashboard weight FAB, nutrition weight FAB, and progress weight logs all behave like one shared current-weight source of truth.

### Files modified
- `src/lib/weightSync.ts` - added shared helpers for current-day weight logging, day normalization, duplicate-day lookup, and latest-weight syncing
- `src/controllers/weightController.ts` - same-day weight logs now overwrite the existing entry for that day, and create/update/delete now resync `User.weight`
- `src/controllers/userController.ts` - profile weight changes now log today's weight instead of only writing the profile field directly
- `client/src/pages/settings/SettingsPage.tsx` - added a confirmation modal before logging a new current weight from profile settings
- `client/src/pages/dashboard/Dashboard.tsx` - emits shared weight sync events after log/edit/delete
- `client/src/pages/progress/ProgressPage.tsx` - emits shared weight sync events after log/edit/delete
- `client/src/pages/nutrition/NutritionPage.tsx` - emits shared weight sync events after logging weight
- `client/src/components/layout/Layout.tsx` - listens for weight sync events and refreshes the auth profile store
- `client/src/lib/appEvents.ts` - made `emitWeightLogged()` usable with or without a weight payload

### Notes
- Weight logging is now treated as a daily overwrite flow instead of a loose profile field edit.
- Same-day logs are collapsed into one entry, and the latest log always becomes the user's current profile weight.
- Settings now asks for confirmation with: `Are you sure you want to log this as your current weight?`

---

## 2026-05-03 — Session: Latin / Indian staples + branded supermarket foods

### Goal
Expand the food DB again with the kinds of foods people actually search and type: Latin/Hispanic staples, Indian/South Asian staples, and more branded supermarket-style convenience items like cereal cups, snack packs, and frozen meals.

### Files modified
- `src/data/foods.ts` — added a new cuisine/convenience block; bumped `FOOD_DB_VERSION` to `2026-05-03-staples-v5`
- `client/src/pages/nutrition/NutritionPage.tsx` — added `Latin / Hispanic`, `Indian`, and `South Asian` cuisine filter chips
- `client/src/i18n/locales/en.ts` — added `nutrition.tagLatin`, `nutrition.tagIndian`, `nutrition.tagSouthAsian`
- `client/src/i18n/locales/es.ts` — added the same new tag labels in Spanish

### Notes
- The new foods lean into high-frequency user queries rather than niche items.
- Latin/Hispanic coverage now includes tacos, enchiladas, empanadas, tamales, pupusas, arepas, bowls, and rice/bean staples.
- Indian/South Asian coverage now includes curries, dal, biryani, naan, roti, samosas, paneer dishes, dosa, and idli.
- The branded supermarket pass covers cereal cups, oatmeal cups, yogurt tubes, pudding cups, microwave popcorn, snack packs, frozen burritos, and frozen pizza slices.

---

## 2026-05-03 — Session: Food catalog expansion + gluten-free filters + DB version stamp

### Goal
Expand the food catalog with the kinds of items users actually type, especially convenience foods, packaged grab-and-go snacks, sandwiches, seafood, dairy alternatives, and gluten-free staples. Add a small Nutrition page version stamp so it is obvious when the newest food DB is loaded.

### Files modified
- `src/data/foods.ts` — added a large new block of common staples and convenience foods, plus aliases and more `gluten-free` tags; exported `FOOD_DB_VERSION` and `FOOD_DB_LABEL`
- `client/src/pages/nutrition/NutritionPage.tsx` — added a small food DB version note under the page header; added the `gluten-free` filter chip
- `client/src/i18n/locales/en.ts` — added `nutrition.tagGlutenFree`
- `client/src/i18n/locales/es.ts` — added `nutrition.tagGlutenFree`

### Notes
- The new catalog pass focuses on real user query forms like sandwiches, cups, bowls, snack packs, wraps, and frozen convenience meals.
- Gluten-free is now an explicit filter tag in Nutrition, not just a hidden food attribute.
- The Nutrition header now shows the current food DB version and item count for quick verification after deploys.

---

---

## 2026-05-02 — Session: Offline + Caching Mode

### Goal
Add full offline support: API response caching in the service worker, an IndexedDB sync queue
for failed mutations, and a Zustand store + hook to replay queued ops on reconnect.

### Files created
- `client/src/lib/idb.ts` — lightweight IndexedDB wrapper (addPendingOp, getPendingOps,
  deletePendingOp, getPendingCount, clearPendingOps)
- `client/src/store/offlineStore.ts` — Zustand store tracking isOffline, pendingCount,
  syncing, lastSyncAt
- `client/src/hooks/useOfflineSync.ts` — flushQueue() standalone fn + useOfflineSync() hook
  (sets up online/offline/SW-message listeners; mounted once in App)

### Files modified
- `client/public/sw.js` — rewrote fetch handler:
  - Static assets: unchanged cache-first strategy, new cache name `fitai-shell-v2`
  - API GETs: stale-while-revalidate with 5-minute TTL (`fitai-api-v1` cache)
    - Fresh (<5 min): serve cache instantly, refresh in background
    - Stale (>5 min): wait for network, fall back to stale cache if offline
    - No cache at all: wait for network, return 503 JSON if offline
  - Non-GET mutations: pass-through (axios handles offline queuing)
  - Background Sync event: broadcasts SW_SYNC_REPLAY to all window clients
- `client/src/api/axios.ts` — added response interceptor:
  - Detects pure network errors (!error.response) on non-GET, non-auth mutations
  - Serializes method + url + body + auth headers to IndexedDB via addPendingOp
  - Increments offlineStore.pendingCount
- `client/src/components/OfflineBanner.tsx` — now reads from offlineStore:
  - Shows "X changes waiting to sync" when pendingCount > 0
  - "Sync now" button calls flushQueue() directly
  - "Syncing..." state while replay is in progress
  - "Back online — syncing X changes..." on reconnect flash
- `client/src/App.tsx` — added useOfflineSync() call at app root

### TypeScript
`npx tsc --noEmit` exits 0, no errors.

## 2026-05-02 — Session: Dashboard + WeeklyPlanWidget + ChatPage i18n completion

### Goal
Complete the remaining dynamic translation gaps the user identified:
- Dashboard: "day rest / since last workout", protein/carbs/fats labels, "consumed", chart legend "weight"/"projected", "View all"/"Manage" buttons, quick action labels
- WeeklyPlanWidget: day-of-week abbreviations, "Week of", "Edit schedule", "Sync to calendar"
- ChatPage: suggested starter prompts
- MealPlannerPage: remove stale `DAY_NAMES` constant

### Changes

**`client/src/pages/dashboard/Dashboard.tsx`**
- `StatCard`: added `useTranslation()` hook; `"tap to view →"` → `t("dashboard.tapToView")`
- Stat card sub-text: `"of X kcal target"` → `t("dashboard.kcalTarget")`, protein target, weight target, `"in the last 7 days"` → `t("dashboard.inTheLast7Days")`
- Rest-day streak: `"day/days rest"` → `t("dashboard.dayRest")` / `t("dashboard.daysRest")`
- `"Since last workout"` → `t("dashboard.sinceLastWorkout")`; `"Trained today"` → `t("dashboard.trainedToday")`
- MacroBar calls: `label="Protein/Carbs/Fats"` → `t("common.protein/carbs/fats")`
- Calorie ring: `"consumed"` → `t("dashboard.consumed")`; `"of X kcal"` → dynamic with `t("dashboard.kcalOf")`; `"kcal over"` → `t("dashboard.kcalOver")`
- Weight chart: `name="weight"` → `name={t("common.weight")}`, `name="projected"` → `name={t("dashboard.projected")}`; tooltip formatter simplified
- "View all →" / "Manage →" buttons → `t("common.viewAll")` / `t("common.manage")` (already existed in en.ts)
- Weight FAB: `"Saved!"`, `"Cancel"`, `"Save"` → `t()` calls
- Quick actions: all four labels now use `t("dashboard.chatWithCoach")` etc.
- `"My Goal"` fallback, `"Log your first workout"`, `"Set a goal"` buttons → `t()` calls

**`client/src/components/WeeklyPlanWidget.tsx`**
- Replaced static `DAY_LABELS = ["Mon", ...]` with `getDayLabels(lang: string)` helper using `Intl.DateTimeFormat({ weekday: "short" })`
- `useTranslation()` expanded to `{ t, i18n }` in main widget; `dayLabels` computed from `i18n.language`
- `dayLabels` prop threaded through `SetupModal` (+ `initDayConfigs`), `PlanCard`, `SyncCalendarModal`
- `PlanCard`: added `useTranslation()` + local `dayLabels`
- "Week of X" header → `t("mealPlanner.weekOf")`
- "X/Y days" badge → `t("dashboard.daysCompleted")`
- "Avg calories burned" → `t("dashboard.avgCalBurned")`
- "Edit schedule" → `t("dashboard.editSchedule")`; "Sync to calendar" → `t("dashboard.syncToCalendar")`
- "Training days saved!" toast → `t("dashboard.trainingDaysSaved")`
- `WeeklyPlanWidget` apiError fallback header → `t("dashboard.weeklyTrainingPlan")`

**`client/src/pages/chat/ChatPage.tsx`**
- Module-level `STARTERS` constant replaced with `getStarters(t: (k: TKey) => string)` function
- `STARTERS` now computed inside `ChatPage` component after `const { t } = useTranslation()`
- 12 new `chat.starterCoach*`, `chat.starterNutri*`, `chat.starterGeneral*` keys used

**`client/src/pages/mealplanner/MealPlannerPage.tsx`**
- Removed stale module-level `DAY_NAMES` constant (was superseded by `DAY_NAMES_T` using `t()` in a previous session)

**`client/src/i18n/locales/en.ts`**
- Added 23 new `dashboard.*` keys: `tapToView`, `kcalTarget`, `target`, `targetColon`, `inTheLast7Days`, `dayRest`, `daysRest`, `sinceLastWorkout`, `trainedToday`, `consumed`, `kcalOf`, `kcalOver`, `projected`, `chatWithCoach`, `nutritionAdvice`, `browseTemplates`, `monthlyReport`, `trainingDaysSaved`, `myGoal`, `saved`, `kgToGo`
- Added 12 new `chat.*` starter keys: `starterCoach1–4`, `starterNutri1–4`, `starterGeneral1–4`

**`client/src/i18n/locales/es.ts`**
- All 35 new keys translated to Spanish

### TypeScript
- `npx tsc --noEmit` — **0 errors**

### Commit pending
```bash
git add -A
git commit -m "feat: complete dashboard/widget/chat i18n — day labels, macros, chart legend, quick actions, starters"
git push origin main
```

---

## 2026-05-02 — Session: Full i18n Spanish translation (all pages)

### Goal
Every UI string on every page now renders in Spanish when Spanish is selected. Previously only nav labels and basic common strings were translated; all feature pages (Workouts, Chat, Nutrition, Goals, Settings, Reports, MealPlanner, Templates, Progress) remained in English.

### Architecture

**Custom zero-dependency i18n system** (`client/src/i18n/index.tsx`):
- `I18nProvider` with React context, `useTranslation()` hook, `changeLanguage()`
- Exported module-level `t()` function for use outside React components (imported as `_t` to avoid shadowing the hook's `t` inside components)
- `LOCALES` map + `LANG_LABELS` dict — adding a language requires only a new locale file + two entries here; zero component changes needed
- Language persisted in `localStorage["lang"]`

**Locale files:**
- `client/src/i18n/locales/en.ts` — ~613 lines. Typed via `Translation` interface. Sections: `nav`, `common`, `dashboard`, `nutrition` (65 keys), `workouts` (91 keys), `progress`, `goals` (13 keys), `profile`, `settings` (38 keys), `auth`, `offline`, `chat` (35 keys), `reports`, `mealPlanner`, `templates`, `ai`
- `client/src/i18n/locales/es.ts` — All sections with Spanish values, same interface

### Pages translated this session

| File | Keys added / approach |
|------|-----------------------|
| `WorkoutsPage.tsx` | 91 new `workouts.*` keys; `useTranslation()` injected into 22 sub-functions; `TRAINING_TYPES` module-level array uses `_t()`; 80+ JSX string replacements |
| `ChatPage.tsx` | 35 new `chat.*` keys; `AGENTS` array uses module-level `t()`; SuggestionCard, ChatBubble, dialog, toast, modal all translated |
| `SettingsPage.tsx` | 38 new `settings.*` keys; hooks injected into 8 functions; language picker, profile form, password form, data export card |
| `GoalsPage.tsx` | 13 new `goals.*` keys; ActiveGoalChart, GoalForm, EditGoalModal hooks added |
| `NutritionPage.tsx` | 65 new `nutrition.*` keys; hooks injected into 13 sub-functions; food search, custom foods, macro display, meal planning, supplements |
| `ReportsPage.tsx` | `reports.*` keys; all section headers, stat labels, empty states |
| `MealPlannerPage.tsx` | `mealPlanner.*` keys; plan cards, form, empty state |
| `TemplatesPage.tsx` | `templates.*` keys; template cards, builder |
| `ProgressPage.tsx` | Existing `progress.*` keys wired in |
| `Dashboard.tsx` | Existing `dashboard.*` keys wired in |

### TypeScript
- `npx tsc --noEmit` — **0 errors** (frontend)

### Commit pending
All changes are local. Run from project root:
```bash
rm .git/index.lock   # if VS Code held the lock
git add -A
git commit -m "feat: complete i18n translation for all pages (Workouts, Chat, Settings, Goals, Nutrition, Reports, MealPlanner, Templates)"
git push origin main
```

---

## 2026-04-29 — Session: Analytics tab + Issues 11–20 + PWA (iPhone)

### Analytics backend + frontend

**`src/routes/analytics.ts`** (new)
- Simple authenticated router: `GET /` → `getAnalytics` controller.
- Registered in `src/server.ts` as `app.use("/api/analytics", analyticsRoutes)`.

**`client/src/api/index.ts`** (modified)
- Added `AnalyticsDayPoint`, `AnalyticsWeekPoint`, `AnalyticsSummary`, `AnalyticsData` TypeScript interfaces.
- Added `analyticsApi.get(days)` calling `GET /api/analytics?days=${days}`.
- Updated `authApi.login` to accept optional `rememberMe?: boolean`.

**`client/src/pages/progress/ProgressPage.tsx`** (modified)
- Added `analyticsApi` import + `AnalyticsData` type.
- Added `StatBadge` helper component.
- Added `AnalyticsTab` component with 4 Recharts charts:
  1. Calorie intake — `ComposedChart` with Area (daily) + Line (7-day rolling avg)
  2. Macro breakdown — stacked Bar (protein/carbs/fat)
  3. Calorie balance — Bar (in vs out) + net Line
  4. Workout frequency — Bar + rolling avg Line
- Added `{ id: "analytics", label: "Analytics", icon: "📈" }` to TABS.
- Progress page now has 5 tabs (was 4).

---

### Issues 11–20 resolved

**#11 — Pagination caps** (`goalController.ts`, `mealPlanController.ts`)
- Added `take: 50` to all unbounded `findMany` calls in both controllers.

**#13 — Empty states**
- `MealPlannerPage.tsx` — dashed-border empty state card with icon, description, "Create first plan" button.
- Chat, Nutrition, Weight pages — first-user empty state messages added.

**#14 — Offline banner** (`client/src/components/OfflineBanner.tsx`) (new)
- Listens to `window.addEventListener("offline"/"online")`.
- Shows a dismissible dark bar when offline; shows a 3s green "Back online" flash on reconnect.
- Rendered inside `<BrowserRouter>` at root in `App.tsx`.

**#15 — Password strength** (`src/middleware/schemas.ts`)
- `registerSchema` + `resetPasswordSchema` — added three `.regex()` validators:
  - Must contain uppercase letter
  - Must contain number
  - Must contain special character

**#16 — Session expiry UX** (`client/src/api/axios.ts`, `client/src/pages/auth/Login.tsx`)
- `clearSession(expired = false)` — when `expired = true`, redirects to `/login?sessionExpired=1`.
- Failed refresh now calls `clearSession(true)`.
- `Login.tsx` — `useSearchParams` detects `?sessionExpired=1`; shows yellow banner "Your session has expired."
- Login form also gained "Remember me (30 days)" checkbox + "Forgot password?" link.

**#17 — Data export** (`src/controllers/userController.ts`, `src/routes/users.ts`)
- New `exportData` handler: `Promise.all` fetches all user data (workouts, food logs, weight, goals, calorie goals).
- Sets `Content-Disposition: attachment; filename="fitai-export-YYYY-MM-DD.json"`.
- Registered as `GET /api/users/export`.
- Settings page: "Your Data" card with "⬇ Download my data" button using fetch → Blob → anchor.click pattern.

**#18 — Redis search cache** (`src/controllers/searchController.ts`)
- `cacheGet(key)` + `cacheSet(key, value)` helpers wrapping `redisClient.get/setex`.
- TTL = 600 seconds (10 minutes).
- Both `foodSearch` and `exerciseSearch` check cache first; set cache after DB hit.
- Cache keys include all query params for precision invalidation.

**#19 — Streaming chat** — Deferred (major SSE refactor; lower priority than remaining items).

**#20 — Remember me** (`src/controllers/authController.ts`, `client/src/pages/auth/Login.tsx`)
- `signRefreshToken(userId, email, rememberMe)` — expiry `30d` when remembered, `24h` otherwise.
- `login` destructures `rememberMe = true` from body and passes `Boolean(rememberMe)` to token signer.
- Frontend login form passes `rememberMe` boolean to `authApi.login()`.

---

### PWA — iPhone installable

**`client/public/manifest.json`** (new)
- `name: "FitAI Coach"`, `short_name: "FitAI"`, `display: "standalone"`, `theme_color: "#6366f1"`, `background_color: "#111827"`, `start_url: "/dashboard"`.
- Icons: 192×192 and 512×512 (`/icons/icon-192.png`, `/icons/icon-512.png`).
- Shortcuts: Log Workout → /workouts, Log Food → /nutrition, AI Coach → /chat.

**`client/public/sw.js`** (new)
- Cache name `fitai-v1`. Precaches `/` and `/index.html` on install.
- Activate: deletes old caches. Claim all clients.
- Fetch strategy: network-first for `/api/` (503 JSON on offline); cache-first for static assets; SPA fallback to `/index.html`.

**`client/public/icons/icon-192.png` + `icon-512.png`** (new)
- Generated with pure Python stdlib (no Pillow) — circular purple `#6366f1` background, white "F" letterform.

**`client/index.html`** (modified)
- `<link rel="manifest" href="/manifest.json" />`
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title: FitAI`
- `<link rel="apple-touch-icon" href="/icons/icon-192.png" />`
- `<meta name="theme-color" content="#6366f1" />`
- Viewport updated to `width=device-width, initial-scale=1.0, viewport-fit=cover`

**`client/src/main.tsx`** (modified)
- Added service worker registration: `navigator.serviceWorker.register("/sw.js")` on `window.load`.

**`client/src/components/InstallPrompt.tsx`** (new)
- Detects iOS via `navigator.userAgent` + `!window.MSStream`.
- Detects standalone mode via `navigator.standalone` + `display-mode: standalone` media query.
- iOS: shows a dismissible banner after 3s with Share → Add to Home Screen instructions.
- Android: captures `beforeinstallprompt` event; shows "Install" button that calls `deferredPrompt.prompt()`.
- Dismissed state stored in `localStorage("fitai_install_dismissed")`.

**`client/src/App.tsx`** (modified)
- Added `<OfflineBanner />` + `<InstallPrompt />` inside `<BrowserRouter>` at root.

---

### Commit messages (for git log)

```
feat(analytics): add analytics route, controller wire-up, and 4-chart Analytics tab in Progress page

fix(pagination): add take:50 cap to goalController and mealPlanController findMany calls

fix(ux): add empty states to MealPlanner, Chat, Nutrition, Weight pages

feat(offline): add OfflineBanner component with online/offline detection and back-online flash

fix(auth): enforce password complexity (uppercase + digit + special char) in registerSchema

fix(auth): session expiry UX — redirect to /login?sessionExpired=1 on refresh failure + banner

feat(export): add GET /api/users/export endpoint + Download my data button in Settings

feat(cache): wire Redis 10-min TTL cache to food and exercise search endpoints

fix(auth): remember me checkbox on login — 30d vs 24h refresh token expiry

feat(pwa): add manifest.json, service worker, icons, install prompt (iOS + Android), offline banner
```

---

## 2026-04-26 — Session: 🔴 Critical security fixes (A–E)

### #60 — Zod env validation (`src/config/env.ts`)
Rewrote from manual array check to full Zod schema:
- `z.object({...}).safeParse(process.env)` — fails fast on startup with clear per-field error messages
- `REFRESH_SECRET` added as required (was missing entirely from the old validator)
- `CLIENT_URL` validated as a URL when present
- Exports a typed `env` object — no more `process.env.X` scattered across the codebase
- Both `authController.ts` and `auth.ts` middleware now import from `env.ts` instead of reading `process.env` directly

### #61 — Hardcoded secret fallbacks removed
`src/controllers/authController.ts` + `src/middleware/auth.ts`:
- Removed `|| "secret-key"` and `|| "refresh-secret-key"` fallbacks from all JWT signing/verification
- All secret reads now go through the validated `env` object — missing secrets cause a startup exit, not a silent insecure default

### #62 — CORS wildcard removed (`src/server.ts`)
- Replaced `origin: process.env.CLIENT_URL || "*"` with an explicit origin callback
- `ALLOWED_ORIGINS` = `[env.CLIENT_URL]` in production, dev localhost list when `CLIENT_URL` is unset
- Requests with no origin (mobile apps, curl) still pass — only unknown browser origins are blocked

### #63 — JSON body limit reduced (`src/server.ts`)
- `express.json({ limit: "10mb" })` → `{ limit: "100kb" }` (same for `urlencoded`)
- 10mb was 100× the largest payload this app can produce

### #64 — Deep health check (`src/server.ts` `/api/health`)
- Now probes Postgres (`prisma.$queryRaw\`SELECT 1\``) and Redis (`redisClient.ping()`) with a 2s timeout each
- Returns HTTP 200 + `{ status: "OK" }` only when both pass
- Returns HTTP 503 + `{ status: "DEGRADED", checks: { postgres, redis } }` on any failure
- Docker/orchestrator healthchecks will now correctly restart the container when the DB is down

### #65 — `authController_clean.ts` (pending manual delete)
File confirmed as a 180-line stale duplicate with insecure fallback secrets.
**Action required**: `Remove-Item src\controllers\authController_clean.ts` in your terminal.
TypeScript already passes with 0 errors across all backend files.

---

## 2026-04-26 — Session: Security incident + pre-production audit

### GitGuardian incident — POSTGRES_PASSWORD exposed in git history

**What happened**: `.env.production` and `.env.production.local` were committed in `e0c63f8` with `POSTGRES_PASSWORD=Spsc1296!postgres` in plaintext. GitGuardian detected and emailed.

**What was NOT exposed** (confirmed via full history scan):
- `.env` was never committed — real `OPENAI_API_KEY`, `JWT_SECRET`, `REFRESH_SECRET` were safe on disk only
- `mobile/.env` was never committed
- The `sk-proj-...your-key-here...` in `.env.example` history was a placeholder, not the real key

**Remediation steps taken:**
1. Scrubbed both files — replaced real password with `CHANGE_ME` placeholders
2. Ran `git rm --cached .env.production .env.production.local` to untrack both files
3. Updated `.gitignore` — added `.env.*` blanket pattern (only `!.env.example` allowed through)
4. Ran `py -m git_filter_repo --path .env.production --invert-paths --force` × 2 to purge both files from all 28 commits in history
5. Force-pushed cleaned history to GitHub (`git push origin --force --all`)
6. **Action required by user**: Rotate `POSTGRES_PASSWORD` on the actual Postgres instance + update local `.env`
7. **Action required by user**: Mark incident as Remediated on GitGuardian dashboard

### Pre-production security & UX audit

Full codebase audit completed. Findings documented in CONTEXT.md under "Pre-production audit". Key findings:

**🔴 Critical (5 items — fix before any public traffic):**
- Hardcoded JWT/REFRESH_SECRET fallbacks in `authController.ts` (`|| "secret-key"`)
- CORS wildcard fallback (`CLIENT_URL || "*"`)
- JSON body limit `10mb` → should be `100kb`
- Health check doesn't probe DB or Redis
- Stale `authController_clean.ts` duplicate file (delete it)

**🟠 High (5 items — before first real users):**
- No forgot password / reset flow
- No email verification
- No request timeout middleware (OpenAI calls can hang indefinitely)
- 4 controllers bypass Zod (`mealPlanController`, `reportController`, `templateController`, `workoutController`)
- 36 `any` types in backend TypeScript

**🟡 Medium (6 items — polished product):**
- No pagination on `goalController`, `mealPlanController`, `foodController`, `calendarController`
- No optimistic UI updates
- Empty states missing on Nutrition, Reports, Weight, MealPlanner, Chat
- No offline/network error detection
- Password strength only `min(8)` — no complexity
- No session expiry UX (Axios interceptor doesn't redirect on 401)

**🔵 Lower priority (4 items):**
- No account data export endpoint
- Redis search cache not wired
- No streaming chat responses (SSE)
- No "remember me" on login

### Production roadmap formalised

CONTEXT.md Phase 4/5 section rewritten. Full 9-item sequence to production:

| # | Item | Status |
|---|------|--------|
| 1 | PostgreSQL migration | ✅ Done |
| 2 | Docker Compose | ✅ Done |
| 3 | Env validation with Zod | ⏳ Next session |
| 4 | Backend tests (Vitest) | ⏳ Pending |
| 5 | GitHub Actions CI | ⏳ Pending |
| 6 | Redis (core ✅ / query cache ⏳) | Partial |
| 7 | CD pipeline | ⏳ Pending |
| 8 | Deployment (VPS + EAS mobile) | ⏳ Pending |
| 9 | Monitoring & Logging (pino + Sentry) | ⏳ Pending |

---

## 2026-04-26 — Session: MacroRing goal-progress fix + Docker prep

### #59 — MacroRing: arc now tracks goal progress (not macro distribution)
`NutritionPage.tsx` — `MacroRing` rewritten to fix the core logic bug:

**Root cause**: `pct = value / totalMacroG` (distribution) was driving the SVG arc. `goalPct = value / goal` only controlled glow/colour — the arc never reflected goal progress, so rings stayed ≪ 100% even when a macro was far exceeded.

**Fix**:
- `arcPct` = `goal ? Math.min(rawGoalPct, 100) : distributionPct` — drives the SVG arc; capped at 100 so it never wraps past full circle
- `displayPct` = uncapped `rawGoalPct` when goal is set — centre label shows e.g. "112%" when over goal
- **Three visual states**:
  - < 70 % of goal → normal colour, no glow
  - ≥ 70 % of goal → blue glow
  - ≥ 100 % of goal → ring full, green colour + green glow, "Goal met ✓" badge
  - > 100 % (over) → red text + red glow + "Over goal" badge (was previously invisible)
- Without a goal the ring still shows macro distribution proportion (fallback, unchanged behaviour)
- File truncation (recurring issue — file ended mid-statement at `open={sho`) detected and repaired; all three trailing modals (`LogFoodForm`, `SuggestMealPlanModal`, `BuildDishModal`) restored

---

## 2026-04-26 — Session: Calendar overhaul, training sync fix, macro by-food, Progress & Goals

### #54 — Calendar Monthly Plan Builder
`WorkoutsPage.tsx` — `CalendarTab` overhauled:
- New **"🗓 Build Plan"** button is now the primary CTA (was "Apply Template")
- **Empty-state card** shown when calendar has no entries: "No plan for [Month] — Build My Monthly Plan"
- New `MonthlyPlanBuilderModal` component (Mon–Sun grid):
  - Each weekday toggles between **workout** (brand) and **rest** (green) with a single click
  - Workout days: template picker dropdown + free-text workout name field
  - Pre-fills workout/rest based on `user.trainingDaysPerWeek` via `DEFAULT_DAY_PATTERNS`
  - Duration: 1 / 2 / 3 months — fills ALL matching weekdays across the range
  - Rest days are written as explicit `isRestDay: true` entries so they show on the calendar
  - "Apply Template" button demoted to secondary action

### #55 — Training days sync — definitive fix (v3, final)
Root cause: `WorkoutsPage.trainingDays` was **local state** initialised from `calorieGoalsApi.getActive()` — a completely separate DB field from `user.trainingDaysPerWeek`. Profile saves updated the user record but never touched the calorie goal record, so WorkoutsPage never saw the change.

**Fix: single source of truth = auth store**
- `WorkoutsPage` — `trainingDays` is now a **derived constant** (`const trainingDays = user?.trainingDaysPerWeek ?? 4`), not state. No `setTrainingDays` anywhere.
- `saveTrainingDays()` in WorkoutsPage now calls:
  1. `usersApi.updateProfile({ trainingDaysPerWeek: n })` — writes the user record
  2. `updateUser(res.data.user)` — pushes the change into the Zustand auth store, which propagates to Profile and any other consumers immediately
  3. `calorieGoalsApi.update(activeGoalId, { trainingDaysPerWeek: n })` — keeps calorie goal record in sync as a side effect
- `useRef` tracks previous value so the "Training days updated to N 💪" toast only fires on actual changes, not on component mount
- `SettingsPage.ProfileForm` — on save calls `calorieGoalsApi.update(activeGoalId, { trainingDaysPerWeek })` too
- `WeeklyPlanWidget.SetupModal` — on save syncs calorie goal record via `calorieGoalsApi`

### #58 — Inline calendar day editor (no modal for quick edits)
`WorkoutsPage.tsx` — `CalendarTab` selected-day panel replaced with fast inline editor:
- **Workout / Rest Day** toggle buttons side-by-side; tapping Rest Day saves immediately (no extra click)
- Workout name text input — Enter key saves; blue Save button saves
- "Apply to all [Weekday]s this month" quick-action link — calls `calendarApi.populate` for every matching weekday in the current month in one tap
- Remove button to delete the day's entry
- Logged workouts shown read-only below
- "⚙️ More" button opens full `EditCalendarDayModal` for notes / multi-month bulk operations
- `saveInline()` async helper used by all quick actions — calls `calendarApi.updateDay` then `loadCalendar()`
- `prevSelectedRef` useRef syncs inline state whenever the selected date changes

### #56 — Macro breakdown by food source
`NutritionPage.tsx` — new **"🔍 By Food"** view added to the macro tab toggle (alongside Rings / Breakdown / By Meal / vs Goals):
- `MacroByFood` component: sortable table of every food logged today
- Columns: Food name, Protein (g), Carbs (g), Fat (g), Calories
- Click any column header to sort; click again to reverse
- Mini percentage bar under each macro value (relative to that macro's daily total)
- Totals row in `<tfoot>`
- Shows meal label and quantity in subtext per food row

### #57 — Merge Goals into Progress & Goals
- `ProgressPage.tsx` — added **"🎯 Goals"** as 4th tab; renders `<GoalsPage embedded />` inside a tab panel
- `GoalsPage.tsx` — accepts `embedded?: boolean` prop; hides top H1 and uses tighter padding when embedded; `/goals` route now redirects to `/progress` via `<Navigate>`
- Page header updated to "Progress & Goals"
- `Sidebar.tsx` + `BottomNav.tsx` — "Progress" renamed to "Progress & Goals" (icon 📈); separate "Goals" nav entry removed (was duplicate)

---

## 2026-04-26 — Session: Calendar full-plan builder + macro ring glow

### MacroRing SVG glow (#52)
`client/src/pages/nutrition/NutritionPage.tsx` — `MacroRing` updated with optional `goal` prop:
- `goalPct` computed as `(value / goal) * 100`
- SVG `filter: drop-shadow(...)` applied to wrapper div: blue at ≥70%, green at ≥100%
- Stroke colour switches to `#22c55e` at 100%
- Label + value text turns green, "Goal met" badge appears
- Three call sites already pass `goal={activeGoal?.proteinGrams}` etc.

### ApplyTemplateModal — 1–3 month duration (#53)
`client/src/pages/workouts/WorkoutsPage.tsx` — `ApplyTemplateModal` redesigned:
- **Duration picker**: 1 / 2 / 3 month buttons shown above assignment rows
- **Range label**: shows e.g. "2026-04 – 2026-06" under the picker
- `handleApply` now loops through all months via `getMonthRange()` helper and accumulates total day count
- Toast message covers the full date range: "Applied 48 day(s) across 2026-04 – 2026-06"
- Dark mode polish on all selects / weekday buttons

### EditCalendarDayModal — bulk-apply multi-month (#53)
- Added `bulkDuration` state (1 | 2 | 3 months) with toggle buttons in the bulk-apply section
- `handleApplyAll` now loops through `getMonthRange(month, bulkDuration)` and calls `calendarApi.populate` per month
- Button label dynamically shows "Apply to all {Weekday}s (2 months)" etc.

### getMonthRange() helper
Added `function getMonthRange(startMonth: string, count: number): string[]` in WorkoutsPage before `ApplyTemplateModal`. Takes a `"YYYY-MM"` start and count, returns an array of month strings. Reused by both `ApplyTemplateModal` and `EditCalendarDayModal`.

### TypeScript — Modal open prop
Added `open` (always `true`) to all self-contained modal components that use `<Modal>` without the prop: `PlanToCalendarModal`, `ApplyTemplateModal`, `EditCalendarDayModal`, `SyncCalendarModal`.

---

## 2026-04-26 — Session: Bug fixes — Dashboard hooks, training sync, macro glow, calendar

### Dashboard hooks crash fixed
`client/src/pages/dashboard/Dashboard.tsx` — `useIsDark()` and `chartColors` were called after an early `return` (loading spinner), violating React Rules of Hooks. Moved both to before the first early return. Eliminates "Rendered more hooks than during the previous render" crash.

### Training days bidirectional sync + toast
**`client/src/components/WeeklyPlanWidget.tsx`**:
- `SetupModal.save()` now `await`s `usersApi.updateProfile()` (was fire-and-forget — caused race where `getProfile()` ran before the write finished)
- `onSave` callback shows a "Training days saved!" toast via new `useToast` / `ToastBanner` inline hook
- Added `📆 Sync to calendar` link in the day-grid footer (visible when a plan exists)
- Added `SyncCalendarModal` — reads the full weekly plan (each day with its own label), shows a 1/2/3-month duration picker, calls `calendarApi.populate` per month; addresses "full weekly plan in calendar, not single day" issue

**`client/src/pages/settings/SettingsPage.tsx`**:
- Added `useToast` / `ToastBanner` to `ProfileForm`
- Toast "Training days updated to N!" shown when `trainingDaysPerWeek` changes on save (alongside the existing plan-nudge banner)

### Macro progress glow — NutritionPage + Dashboard
**`MacroGoalBar`** (NutritionPage goals tab):
- ≥ 70 % of goal → blue glow `box-shadow: 0 0 8px 2px rgba(59,130,246,0.40)`
- ≥ 100 % of goal → fill turns green + green glow + "✓" badge in value label

**`MacroBar`** (Dashboard daily macros):
- Same thresholds: blue glow at 70 %, green fill + glow + "✓" at 100 %

### Calendar: sync full weekly plan for 1–3 months
`SyncCalendarModal` in `WeeklyPlanWidget` maps each active plan day (with its unique label — Push/Pull/Legs etc.) to `calendarApi.populate` assignments. Previously you could only push one template at a time; now the entire split schedule populates in one action across 1, 2, or 3 months.

---

## 2026-04-26 — Session: Docker + Redis + Zod validation + Error boundary

### Docker — full stack
**`Dockerfile`** (backend, multi-stage):
- Stage 1 (`builder`): `node:20-alpine`, installs all deps, runs `tsc`
- Stage 2 (production): `node:20-alpine`, prod-only deps + `prisma generate`, copies `dist/`
- Entrypoint: `entrypoint.sh` runs `prisma db push` on every start; seeds DB when `SEED_DB=true`

**`client/Dockerfile`** (frontend, multi-stage):
- Stage 1 (`builder`): `node:20-alpine`, runs `npm run build` (Vite)
- Stage 2: `nginx:1.27-alpine`, serves `dist/` with `client/nginx.conf`

**`client/nginx.conf`**:
- `location /api/` → `proxy_pass http://server:3000` (reverse proxy to backend service)
- `location /` → `try_files $uri /index.html` (SPA fallback)
- Static asset caching (`1y, immutable`), gzip enabled

**`docker-compose.yml`** — 4 services:
- `postgres` (postgres:16-alpine) — named volume `postgres_data`, healthcheck `pg_isready`
- `redis` (redis:7-alpine) — named volume `redis_data`, healthcheck `redis-cli ping`, persistence on
- `server` — builds from root Dockerfile, `env_file: .env.production`, DATABASE_URL + REDIS_URL injected, `depends_on` postgres + redis (healthy)
- `client` — builds from `client/Dockerfile`, port 80, `depends_on` server

**`.env.production`** — template with placeholder secrets for POSTGRES_PASSWORD, JWT_SECRET, OPENAI_API_KEY; comments for SEED_DB and rate-limit overrides

**`.dockerignore`** (root + client/) — excludes `node_modules`, `dist`, `.env`, `mobile/`, `*.md`

### Redis integration
**`src/lib/redis.ts`** — ioredis singleton. Returns `null` when `REDIS_URL` is not set (dev without Docker).

**`src/lib/tokenBlocklist.ts`** — rewritten:
- With Redis: `SET blocklist:{jti} 1 EX {ttlSec}` / `GET blocklist:{jti}`
- Without Redis: original in-memory Map fallback
- `blockToken` + `isBlocked` are now `async` — `authController.ts` updated with `await`

**`src/middleware/rateLimiter.ts`** — rewritten:
- With Redis: `rate-limit-redis` `RedisStore` per limiter (prefixed `rl:general:`, `rl:auth:`, etc.)
- Without Redis: express-rate-limit default memory store (unchanged dev behaviour)

**`src/config/env.ts`** — `REDIS_URL` added as optional (no crash when missing)

**`package.json`** — added `ioredis@^5.3.2` + `rate-limit-redis@^4.2.0`

### Zod validation — all routes covered
8 new schemas in `schemas.ts`: logWater, updateWaterTarget, populateCalendar, swapCalendarDays, updateCalendarDay, createMealPlan, updateMealPlan, addMealPlanEntry, updateMealPlanDayNotes. Wired into `routes/water.ts`, `routes/calendar.ts`, `routes/mealPlans.ts`.

### React error boundary
`client/src/components/layout/ErrorBoundary.tsx` — class component with `getDerivedStateFromError`. Every protected route in `App.tsx` wrapped. Fallback UI: icon + message + collapsible error detail + "Try again" / "Go to Dashboard" buttons.

### Commands to run after pulling
```bash
npm install                         # picks up ioredis + rate-limit-redis
cp .env.production .env.production.local
# edit: POSTGRES_PASSWORD, JWT_SECRET, OPENAI_API_KEY

# First deploy (seeds DB):
SEED_DB=true docker compose --env-file .env.production up --build -d

# Subsequent deploys:
docker compose --env-file .env.production up --build -d
```

---

## 2026-04-26 — Session: Zod validation + Error boundary + CONTEXT update

### Input validation — all remaining unvalidated routes covered
Added 8 new Zod schemas to `src/middleware/schemas.ts`:
- `logWaterSchema` — `POST /api/water` (amount: positive int ≤ 5000)
- `updateWaterTargetSchema` — `PUT /api/water/target` (targetMl: 250–10 000)
- `populateCalendarSchema` — `POST /api/calendar/populate` (month, assignments array, overwrite flag)
- `swapCalendarDaysSchema` — `POST /api/calendar/swap` (date1, date2, refine: must differ)
- `updateCalendarDaySchema` — `PUT /api/calendar/:date` (workoutName, muscleGroups, templateId, isRestDay, notes)
- `createMealPlanSchema` — `POST /api/meal-plans` (name, weekStart YYYY-MM-DD)
- `updateMealPlanSchema` — `PUT /api/meal-plans/:id` (name)
- `addMealPlanEntrySchema` — `POST /api/meal-plans/:id/days/:dayId/entries` (full food fields + meal enum)
- `updateMealPlanDayNotesSchema` — `PUT /api/meal-plans/:id/days/:dayId/notes`

Wired up `validate()` + `validateIdParam()` in:
- `src/routes/water.ts` — POST, PUT/target
- `src/routes/calendar.ts` — POST/populate, POST/swap, PUT/:date
- `src/routes/mealPlans.ts` — all POST/PUT routes

`tsc --noEmit` passes clean after fixes.

### React error boundary
Created `client/src/components/layout/ErrorBoundary.tsx`:
- Class component with `getDerivedStateFromError` + `componentDidCatch`
- Friendly fallback UI: icon, message, collapsible error detail, "Try again" + "Go to Dashboard" buttons
- Accepts optional `fallback` render prop for custom UIs
- Wrapped every protected page route in `App.tsx` with `<ErrorBoundary>` — a crash in one page no longer takes down the whole app

### CONTEXT.md updated
- Stack description: SQLite → PostgreSQL
- Scalability table: PostgreSQL swap ✅, `$queryRawUnsafe` rewrite ✅
- Phase 4 bullet: PostgreSQL item marked ✅ with detail
- Running the project: `prisma db push` + Docker Postgres command added
- Note for new machines rewritten with full bootstrap sequence

---

## 2026-04-26 — Session: Dark mode complete + PostgreSQL migration

### Dark mode — full pass completed
- `ChatPage.tsx` — agent-switch modal dark variants (carried over from previous session)
- `Dashboard.tsx` — streak cards, macro bars, calorie ring, weight FAB, chart labels, quick actions
- `GoalsPage.tsx` — presets, form sections, stat boxes, past goals
- `ProgressPage.tsx` — tabs, body comp cards, formula select, composition metrics, tables
- `ReportsPage.tsx` — stat boxes, detail view, AI summary text, selects
- `TemplatesPage.tsx`, `MealPlannerPage.tsx` — full dark pass
- `NutritionPage.tsx` (143 classes) + `WorkoutsPage.tsx` (174 classes) — systematic Python pass
- `Login.tsx`, `Register.tsx` — card bg + link text
- Added `useIsDark()` hook (`useDarkMode.ts`) — MutationObserver on `<html>` class, reactive
- Recharts charts in `Dashboard.tsx` and `ProgressPage.tsx` — dynamic colors via `useIsDark()`; grid, ticks, tooltip bg/border all adapt to dark mode

### PostgreSQL migration
**Schema** (`prisma/schema.prisma`): `provider = "sqlite"` → `provider = "postgresql"`

**`runMigrations.ts`** — complete rewrite:
- `PRAGMA table_info` → `information_schema.columns WHERE table_schema='public'`
- `sqlite_master WHERE type='table'` → `information_schema.tables WHERE table_schema='public'`
- `sqlite_master WHERE type='index'` → `pg_indexes WHERE schemaname='public'`
- All CREATE TABLE SQL converted: `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`, `datetime('now')` → `NOW()`, `INTEGER` booleans → `BOOLEAN`, `TEXT` timestamps → `TIMESTAMPTZ`, `REAL` → `DOUBLE PRECISION`
- All ALTER TABLE SQL converted to PostgreSQL types

**`waterController.ts`** — rewritten to pure Prisma ORM (`db.waterLog.create/findMany/findFirst/delete`). Zero raw SQL.

**`mealPlanController.ts`** — rewritten to pure Prisma ORM:
- `loadPlan()` now uses `db.mealPlan.findFirst({ include: { days: { include: { entries } } } })`
- `createPlan()` uses nested `days: { create: [...] }` for 7 slots in one transaction
- `deletePlan()` relies on Prisma cascade (schema has `onDelete: Cascade`)
- All other handlers use `findFirst / update / delete / aggregate`
- Eliminates all 20+ `$queryRawUnsafe` + `$executeRawUnsafe` calls — SQL injection surface removed

**`predictionController.ts`** — SQLite `date(date)` → PostgreSQL `"date"::date` cast

**`package.json`** — removed `better-sqlite3` + `@types/better-sqlite3`, added `pg@^8.13.3` + `@types/pg`

**`.env` + `.env.example`** — `DATABASE_URL` updated to `postgresql://postgres:postgres@localhost:5432/fitai`

### Commands to run after pulling this branch
```bash
# 1. Install updated deps
npm install

# 2. Start a local Postgres (Docker)
docker run -d --name fitai-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fitai -p 5432:5432 postgres:16

# 3. Re-generate Prisma client for PostgreSQL
npx prisma generate

# 4. Push schema to Postgres (first time) OR run migrate
npx prisma db push          # fast, for dev
# npx prisma migrate dev    # for production-grade migration history

# 5. Seed food + exercise data
npm run prisma:seed

# 6. Start dev server
npm run dev
```

---

## 2026-04-25 — Session: Dark mode pass (all pages)

### Dark mode — complete pass across all client pages

Applied `dark:` Tailwind variants to every page that was missing them. Pages fixed:
- `ChatPage.tsx` — agent-switch modal (final piece from last session)
- `Dashboard.tsx` — streak cards, macro bars, weight FAB popup, chart labels, quick actions, weight log input
- `GoalsPage.tsx` — preset buttons, form sections, goal stat boxes, past goals list
- `ProgressPage.tsx` — tabs, body comp cards, formula select, BMI gauge, composition metrics, weight log table, prediction tables
- `ReportsPage.tsx` — stat boxes, detail view, AI summary, selects, headings
- `TemplatesPage.tsx` — full dark pass
- `MealPlannerPage.tsx` — full dark pass

Remaining (large files, deferred to next session):
- `NutritionPage.tsx` (143 light-only classes)
- `WorkoutsPage.tsx` (174 light-only classes)

`Card` + `CardHeader` already had dark variants. `SettingsPage.tsx` already had dark variants. `Layout.tsx` root div already provides `dark:text-gray-100` inheritance.

---

## 2026-04-25 — Session: DB migration + scalability review

### Scalability review findings

Full audit of the codebase for scalability bottlenecks. Key findings documented in CONTEXT.md under "P4 — Scalability issues" table:

- **Food + exercise static arrays** (366 foods, 105 exercises) → migrated to DB this session ✅
- **SQLite write contention** → PostgreSQL swap is next (Docker session)
- **In-memory token blocklist + rate limiter** → Redis (Docker session)
- **Connection pooling** → PgBouncer / Prisma Accelerate after Postgres
- **Dashboard `Promise.all`** → already done, no changes needed
- **`$queryRawUnsafe` controllers** → deferred until after Postgres swap
- **OpenAI tool loop latency** → noted, separate queue/worker before public launch

### Food + exercise DB migration

**Problem**: `FOOD_DB` (366 items) and `EXERCISE_DB` (105 items) were loaded into process memory on startup and searched with plain JS `.filter()` on every request. No pagination, no SQL indexing, no user-contributed items possible.

**Backup files created**:
- `docs/backup-food-db.md` — full `FOOD_DB` TypeScript source + tag reference
- `docs/backup-exercise-db.md` — full `EXERCISE_DB` TypeScript source + muscle/equipment reference

**Schema — `prisma/schema.prisma`**: Added two new models:
- `FoodItem` — id (String PK), name, calories, protein, carbs, fats, defaultQty, defaultUnit, tags (JSON string). `@@index([name])`.
- `ExerciseItem` — id (String PK), name, primaryMuscle, secondaryMuscles (JSON string), equipment, difficulty, instructions. `@@index([name])`, `@@index([primaryMuscle])`, `@@index([equipment])`.

**`src/lib/runMigrations.ts`**: Added `FoodItem` and `ExerciseItem` to `TABLE_MIGRATIONS` (created on server boot). Added 4 entries to `INDEX_MIGRATIONS`: `idx_fooditem_name`, `idx_exerciseitem_name`, `idx_exerciseitem_primarymuscle`, `idx_exerciseitem_equipment`.

**`prisma/seed.ts`** (new file): Imports `FOOD_DB` and `EXERCISE_DB`, upserts all rows via Prisma (`upsert` with `skipDuplicates`-equivalent logic). Safe to re-run. Added `"prisma:seed": "tsx prisma/seed.ts"` to `package.json`.

**`src/controllers/searchController.ts`** (rewritten):
- Both handlers are now `async` and check `db.foodItem.count()` / `db.exerciseItem.count()` first
- If DB is populated: queries with Prisma `findMany` using `contains` for name/tag matching, `equals`/`in` for muscle+equipment filters, `take`/`skip` for pagination. Returns `source: "db"`.
- If DB is empty (pre-seed / first boot): falls back to static array filter. Returns `source: "static"`. Zero downtime during migration.
- JSON tag array stored as string — matched with `contains: '"tagname"'` pattern.
- "Legs" broad alias (`in: ["Quads","Hamstrings","Glutes","Calves"]`) preserved from original.
- Stretching excluded from default (no-muscle-filter) results preserved.
- Response shape unchanged — frontend requires no updates.

**`src/controllers/calendarController.ts`**: Fixed pre-existing TypeScript error — all 6 handler signatures used plain `Request` instead of `AuthRequest`. Replaced all with `AuthRequest`.

**TypeScript**: `tsc --noEmit` → zero errors after all changes.

### To activate on your machine

```bash
# From project root — one time after pulling these changes:
npx prisma generate          # regenerates Prisma client with FoodItem + ExerciseItem
npm run prisma:seed          # seeds 366 foods + 105 exercises into dev.db
npm run dev                  # server boot will also create the tables via runMigrations
```

---

## 2026-04-25 — Session: Mobile App (Phases 3–5)

### Phase 3 — Placeholder screens + navigation wiring

- **`mobile/src/screens/main/WorkoutsScreen.tsx`** — placeholder created
- **`mobile/src/screens/main/NutritionScreen.tsx`** — placeholder created
- **`mobile/src/screens/main/ChatScreen.tsx`** — placeholder created
- **`mobile/src/screens/main/MoreScreen.tsx`** — placeholder created
- **`mobile/App.tsx`** — rewritten to call `authStore.initialize()` on mount before rendering `RootNavigator`. Shows a green `ActivityIndicator` on a dark `#111827` background while the auth store hydrates from `SecureStore`. Renders `<StatusBar style="light" />` + `<RootNavigator />` once ready.

---

### Phase 4 — Full mobile screens with live API data

#### DashboardScreen (`mobile/src/screens/main/DashboardScreen.tsx`)
- Fetches `dashboardApi.get()` + `calorieGoalsApi.getProjection()` on mount
- 4 stat cards: calories, protein, weight, weekly workouts
- Calorie progress bar (goal-aware) + macro rows (Protein / Carbs / Fats)
- 2×2 streak grid (workout streak, nutrition streak, rest days, cheat meals) + water progress bar
- Weight Progress section: latest/starting/change stats + projection status badge ("✅ On Track" / "⚠️ Slightly Behind" / "🚀 Ahead of Schedule") using same ±0.5 kg logic as web
- Active Goal card: Cut / Bulk / Maintain badge + daily calorie target
- Recent Workouts list (last 3)
- Quick Actions 2×2 grid navigating to bottom tabs
- Floating ⚖️ FAB (bottom-right) opens a Modal for weight entry; shows "✅ Saved!" flash for 1 s before closing; re-fetches dashboard on save
- `fmtDateShort()`, `fmtDateLong()` helpers (no date-fns dep); `greeting()` returns morning/afternoon/evening

#### WorkoutsScreen (`mobile/src/screens/main/WorkoutsScreen.tsx`)
- `workoutsApi.getAll()` paginated (page=1, limit=15 initial); infinite scroll via `onMomentumScrollEnd`
- `WorkoutCard` component: name, date, duration, exercises list, kcal badge
- `WorkoutDetail` modal: full exercise table (sets / reps / weight / RPE) per exercise, per-exercise notes
- `LogWorkoutModal`: name, duration (min), calories, notes inputs; calls `workoutsApi.create()`; refreshes list on save
- Pull-to-refresh via `RefreshControl`; "Load more" footer spinner while fetching next page

#### NutritionScreen (`mobile/src/screens/main/NutritionScreen.tsx`)
- `foodApi.getToday()` on mount; totals card (calories, protein, carbs, fats) with mini `ProgressBar` per macro
- Logs grouped by Breakfast / Lunch / Dinner / Snack via `logsByMeal()` helper
- Per-entry ✕ delete button calling `foodApi.delete()`
- Full-screen Log Food Modal: meal type pills, 400 ms debounced food search via `searchApi.foods()`, `FlatList` results, quantity input, macro preview row, save
- `MacroChip` reusable component

#### ChatScreen (`mobile/src/screens/main/ChatScreen.tsx`)
- `AGENTS` constant: coach 🏋️ / nutritionist 🥗 / general 🤖 with display names + emoji
- `STARTERS` map: 3 conversation starter chips per agent
- `chatApi.getHistory()` on mount and on agent tab switch; `fromHistory()` maps `Conversation[]` → `ChatMessage[]`
- `chatApi.send()` for outgoing messages; typing indicator (3-dot animated) while awaiting response
- User messages (right-aligned, brand-green) / assistant messages (left-aligned, dark card, avatar)
- Suggestion chips rendered inline after assistant messages that return structured JSON
- Agent tabs at top with active underline indicator

#### MoreScreen (`mobile/src/screens/main/MoreScreen.tsx`)
- Profile card: avatar initials circle, display name, email, username
- Stats row: weight / height / age / fitness level
- `EditProfileModal`: firstName, lastName, weight, height, age fields; calls `usersApi.updateProfile()`; calls `authStore.updateUser(updated)` after save
- `MenuRow` component for tappable list rows with chevron
- Section groups: Account, App, Support
- Sign Out: `Alert.alert` confirmation → `authStore.logout()`

---

### Phase 5 — EAS Build config + Expo Go testing

#### app.json (mobile)
- `"runtimeVersion": { "policy": "appVersion" }` for OTA updates
- `"userInterfaceStyle": "dark"`
- `"splash": { "backgroundColor": "#111827" }`
- `"ios": { "bundleIdentifier": "com.fitaicoach.app", "buildNumber": "1" }`
- `"android": { "package": "com.fitaicoach.app", "versionCode": 1 }`

#### eas.json (mobile) — new file
- `development` profile: dev client + `distribution: "internal"`
- `preview` profile: `distribution: "internal"` → direct APK install, no Play Store needed
- `production` profile: `autoIncrement: true`, OTA channel `"production"`
- `submit` section: iOS and Android placeholders

#### @shared types internalization
- **Problem**: EAS cloud builds only upload the `mobile/` subdirectory; `../shared/` is outside the archive boundary
- **Fix**: Copied all shared TypeScript interfaces into `mobile/src/shared/types/index.ts` (full copy of web `shared/types/index.ts`)
- Updated `mobile/babel.config.js`: `"@shared": "../shared"` → `"@shared": "./src/shared"`
- Updated `mobile/tsconfig.json`: `"@shared/*": ["../shared/*"]` → `"@shared/*": ["./src/shared/*"]`
- All `@shared/types` imports in screens continue to work unchanged

#### package.json devDependencies fixes
- Added `"babel-plugin-module-resolver": "^5.0.2"` — was a transitive dep locally but EAS clean install didn't pick it up
- Added `"babel-preset-expo": "~12.0.0"` — same issue; EAS requires it be explicit in `package.json`
- `expo-updates` auto-installed by EAS during first build attempt

---

### Build errors encountered and resolved

| Error | Root cause | Fix |
|---|---|---|
| `eas project:init` "Invalid UUID" | Placeholder `"YOUR_EAS_PROJECT_ID"` in `app.json extra.eas` | Removed entire `extra.eas` block; re-ran `eas project:init` |
| "Command must be re-run" | `expo-updates` was installed mid-first-build, changing config | Simply re-ran `eas build` |
| "Unknown error — Bundle JS" | `@shared/types` alias pointed to `../shared/` outside EAS upload boundary | Internalized types to `mobile/src/shared/types/` |
| "Cannot find module 'babel-plugin-module-resolver'" | Not in `package.json` devDependencies, only a transitive dep | Added explicitly to devDependencies |
| "Cannot find module 'babel-preset-expo'" | Same issue | Added explicitly to devDependencies |

---

### Expo Go / iPhone testing setup

- `--host 192.168.137.1` threw AssertionError (flag only accepts `lan`/`tunnel`/`localhost`) → use `$env:REACT_NATIVE_PACKAGER_HOSTNAME="..."` env var instead
- Expo Go timeout on iPhone: Windows Firewall was blocking port 8081. Root cause: hotspot network is classified as **Public** profile in Windows, so rules with `-Profile Private` don't apply
- Fix: `New-NetFirewallRule -DisplayName "Expo Metro" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any`
- Must run PowerShell **as Administrator** or get "Access is denied"
- Created `TESTING.md` with full setup guide, checklists, EAS build commands, and common issues table

---

## 2026-04-24 — Session: Dashboard P3 #18 + #19

### Task 24 (P3 #18) — Calorie goal CTA nudge on Dashboard
- **`client/src/pages/dashboard/Dashboard.tsx`**:
  - When `!activeGoal`, an amber banner button now appears inside the "Today's Calories" card below the remaining/over text.
  - Styled as `bg-amber-50 border border-amber-200 rounded-xl` with "No calorie goal set / Set a goal to track your progress →" text; clicking navigates to `/goals`.
  - Ring + kcal remaining still render (vs 2000 kcal fallback) so the card is never empty.

### Task 25 (P3 #19) — Projection on-track status badge on Dashboard
- **`client/src/pages/dashboard/Dashboard.tsx`**:
  - Added `projectionStatus` IIFE computed variable (runs before `return`). Logic:
    1. Returns `null` if no projection, no active goal, or no weight logs.
    2. Iterates `projection.projected` to find the point closest to today (`todayStr`).
    3. Computes `delta = currentWeight − expectedWeight`. Applies ±0.5 kg threshold, goal-type-aware direction (cut → losing faster = ahead; bulk → gaining faster = ahead).
    4. Returns `{ label, cls }` for one of three states: "✅ On Track" (blue), "⚠️ Slightly Behind" (amber), "🚀 Ahead of Schedule" (green).
  - Badge renders centred below the existing chart footer (`hasProjection && activeGoal` block) when `projectionStatus != null`.

---

## 2026-04-24 — Session: Mobile Responsive Pass (P3 #23)

### M1 — Bottom navigation + sidebar hide on mobile
- **`client/src/components/layout/BottomNav.tsx`** — new file. Fixed bottom tab bar (`flex md:hidden`, `z-40`, `bg-gray-900`). 4 primary tabs: Dashboard, Workouts, Nutrition, AI Coach. 5th "More ⋯" button opens a slide-up sheet with: Meal Planner, Progress, Goals, Reports, Settings + Logout. Sheet has a drag handle, `rounded-t-2xl`, backdrop overlay, `env(safe-area-inset-bottom)` padding for iPhone home-bar clearance.
- **`client/src/components/layout/Sidebar.tsx`** — Changed `<aside className="w-60 min-h-screen bg-gray-900 flex flex-col">` → `hidden md:flex md:flex-col w-60 min-h-screen bg-gray-900 shrink-0`. Sidebar now only visible at `md+` breakpoint.
- **`client/src/components/layout/Layout.tsx`** — Added `BottomNav` import + render. Added `pb-16 md:pb-0` to `<main>` (reserves space above fixed bottom bar). Added `min-w-0` to main to prevent flex children overflowing.

### M2 — Responsive page container padding
All pages changed from hard-coded `p-8` to `p-4 sm:p-6 lg:p-8`:
- Dashboard, NutritionPage, GoalsPage, WorkoutsPage, ReportsPage (both states), SettingsPage, ProgressPage (was `p-6 lg:p-8` → `p-4 sm:p-6 lg:p-8`)
- MealPlannerPage already had `p-4 md:p-6`

Settings form grids made responsive:
- `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (first name/last name, sex/activity, training schedule, injury areas, cycle)
- `grid-cols-3` → `grid-cols-1 sm:grid-cols-3` (age/weight/height)

Macro input grids:
- NutritionPage food-log form: `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`
- WorkoutsPage set/rep fields (both instances): `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`
- MealPlannerPage daily totals bar: `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`

### M3 — Dashboard + key page responsive pass
- **Dashboard header**: `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`. Heading font size `text-2xl` → `text-xl sm:text-2xl`. Action buttons get `flex-1 sm:flex-none` so they stretch on mobile.
- Dashboard stat grids already used `grid-cols-2 lg:grid-cols-4` — no changes needed.
- NutritionPage main layout: `grid-cols-1 lg:grid-cols-3` already responsive.
- ProgressPage: already had responsive header (`sm:flex-row`) and `grid-cols-2 sm:grid-cols-4` stats grid.

### M4 — Workouts + Chat mobile polish
- **WorkoutsPage header**: `flex items-center justify-between flex-wrap` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`. Training days badge label hidden on mobile (`hidden sm:inline`) to save space; emoji stays. Heading `text-xl sm:text-2xl`.
- **WorkoutsPage tabs**: `w-fit` → `w-full sm:w-fit`. Each tab: `flex-1 sm:flex-none px-3 sm:px-4` — fills width on mobile.
- **ChatPage**: Added `pb-14 md:pb-0` to outer `h-screen` container — reserves 56px above fixed bottom nav so input bar is never hidden. Header padding `px-6 py-4` → `px-4 sm:px-6 py-3 sm:py-4`. Header `h1` `text-lg` → `text-base sm:text-lg`.
- **ReportsPage detail view**: `p-8` → `p-4 sm:p-6 lg:p-8`.

---

## 2026-04-24 — Session: UX Polish + Mobile Start

### Task 13 (final piece) — "Apply to all same-weekday days" in EditCalendarDayModal
- **`client/src/pages/workouts/WorkoutsPage.tsx`**:
  - `EditCalendarDayModal` now accepts a `month: string` ("YYYY-MM") prop.
  - Added `bulkWorking` state + `handleApplyAll()` — calls `calendarApi.populate` with `overwrite: true` for just the matching weekday of the edited date across the whole month.
  - Weekday derived from `getDay()` with Mon-based offset. Label shown as "Mon"–"Sun" in button.
  - New button section at bottom of modal: "🔁 Apply to all [Mon/Tue/…]s in [Month]" with a sub-hint line.
  - Primary "Save" button renamed "Save this day" for clarity.
  - `CalendarTab` passes `month={monthKey}` to the modal.
  - `handleApplyAll` returns the count from `res.data.count` in the success message.

### Task 14 — Training days/week UX
- **`client/src/pages/workouts/WorkoutsPage.tsx`**:
  - The training days selector was a subtle underline-only number. Replaced with a labelled badge: `🗓️ Training days/week [N] ✏️` with brand-coloured background, border, hover state, and group-hover animations. Edit mode shows Save + ✕ cancel buttons instead of relying on onBlur.

### Task 15 — More templates (endurance + strength/powerlifting)
- **`src/lib/seedSplits.ts`**: 13 new templates appended:
  - **Powerlifting / 5-3-1**: Press Day, Deadlift Day, Bench Day, Squat Day
  - **Powerlifting Peak**: SBD Day A, SBD Day B
  - **Running / Endurance**: Base Easy Run, Interval Day, Tempo Run, Long Run
  - **Cross-training**: HIIT Circuit Full Body, Triathlon Prep, Cardio Conditioning (Rowing)
  - All use `splitType: "Custom"`, `objective: "endurance"` or `"strength"` as appropriate. Endurance exercises use time-based reps (e.g. "20 min easy").

### Task 16 — Water intake DB error fix
- **`src/controllers/waterController.ts`**: Full rewrite from `(prisma as any).waterLog.*` → raw SQL via `$queryRawUnsafe` / `$executeRawUnsafe`. All 5 endpoints rewritten:
  - `logWater`: INSERT + SELECT last row
  - `getToday`: UTC date range query + `waterTargetMl` lookup
  - `getHistory`: date-range scan + group-by-date in JS
  - `deleteLog`: ownership check + DELETE
  - `updateWaterTarget`: raw UPDATE on User

### Task 17 — Create Plan button on Meal Planner fix
- **`src/controllers/mealPlanController.ts`**: Full rewrite from `(prisma as any).mealPlan.*` → raw SQL (same pattern as waterController). All 7 functions rewritten with `$queryRawUnsafe` / `$executeRawUnsafe`. Cascade delete handled manually (entries → days → plan).
- **`client/src/pages/mealplanner/MealPlannerPage.tsx`**: `CreatePlanModal.onSave` typed as `Promise<void>` (was `void`). Added `saving` + `error` state inside the modal, `handleSubmit` async wrapper with try/catch, loading spinner on Button. `handleCreate` in page typed as `async (...): Promise<void>`.

### Task 18 — Prominent AI suggestion cards in Chat
- **`client/src/pages/chat/ChatPage.tsx`**:
  - New `SuggestionCard` component: icon + title + question text + "Yes, …" confirm button (full-width, colour-coded) + "Not now" dismiss + × close. Transitions to a ✅ "Saved! Check [Title]." in-place on success.
  - `CardState` type: `"idle" | "saving" | "saved" | "dismissed"`.
  - `ChatBubble` now renders one `SuggestionCard` per suggestion type below the message bubble (💪 workout = brand blue, 🥗 meal plan = orange, 🎯 goal = green).
  - All three save handlers (`handleSaveWorkout`, `handleSaveMealPlan`, `handleSavePlan`) refactored to `async (): Promise<void>` — throw on error, show toast on success. `SuggestionCard` manages its own saving/saved/idle state independently.
  - Old small `.rounded-full` link-style buttons removed.

---

## 2026-04-24 — Session: Workout Calendar (P3 #21)

### Feature: Monthly workout calendar with template population + editing

**Goal**: Clicking the "Calendar" tab on the Workouts page now shows a fully-featured monthly planner. Applying a template populates every matching weekday across the whole month. Days are editable, swappable, and removable.

**Backend — new files**

- `prisma/schema.prisma` — added `WorkoutCalendarDay` model:
  - Fields: `id`, `userId`, `date` (String "YYYY-MM-DD"), `workoutName?`, `muscleGroups?` (JSON string), `templateId?`, `isRestDay` (Boolean), `notes?`, `createdAt`, `updatedAt`
  - `@@unique([userId, date])` → composite key `userId_date`
  - User relation added to `User` model as `calendarDays WorkoutCalendarDay[]`

- `src/lib/runMigrations.ts` — added `WorkoutCalendarDay` to `TABLE_MIGRATIONS` (creates table if not exists) and `idx_workoutcalendar_userid` index to `INDEX_MIGRATIONS`. No Prisma migration file needed — table is created at server startup.

- `src/controllers/calendarController.ts` — new file with 6 exported functions:
  - `getCalendarMonth` — GET `/api/calendar?month=YYYY-MM`, returns all days in range
  - `populateCalendar` — POST `/api/calendar/populate`, accepts `{ month, assignments[], overwrite? }` where each assignment has `{ dayOfWeek: 0-6, workoutName, muscleGroups?, templateId?, isRestDay? }`. Upserts one row per matching day in the month.
  - `updateCalendarDay` — PUT `/api/calendar/:date`, upserts a single day
  - `deleteCalendarDay` — DELETE `/api/calendar/:date`, removes a single day
  - `swapCalendarDays` — POST `/api/calendar/swap`, swaps plan fields between two dates
  - `clearCalendarMonth` — DELETE `/api/calendar/clear?month=YYYY-MM`, deletes all days in month

- `src/routes/calendar.ts` — router wiring all 6 endpoints, all behind `authenticate`

- `src/server.ts` — added `import calendarRoutes` and `app.use("/api/calendar", calendarRoutes)`

**Frontend — client/src/types/index.ts**

Added `WorkoutCalendarDay` interface (matching the model, with `muscleGroups` as `string[]`).

**Frontend — client/src/api/index.ts**

Added `calendarApi` with methods: `getMonth`, `populate`, `updateDay`, `deleteDay`, `swap`, `clearMonth`. Added `WorkoutCalendarDay` to the import.

**Frontend — client/src/pages/workouts/WorkoutsPage.tsx**

- Added `calendarApi` and `WorkoutCalendarDay` to imports
- Replaced the old minimal `CalendarTab` with a full implementation:
  - Loads `calendarDays` from `GET /api/calendar?month=` on mount and on month change
  - Loads all available `templates` for the Apply Template modal
  - Calendar grid overlays planned days (indigo) on top of logged workouts (brand-blue) and rest days (green)
  - Each cell shows: day number + short workout label + colour-coded dot
  - **Swap mode**: toggle button → click first day to select → click second day to execute swap; amber ring on selected day; banner shows current state
  - **Selected day detail panel**: shows planned info (with edit/remove links) and any logged workouts; if nothing planned, shows "+ Add Plan" and "😴 Mark Rest" buttons
  - **"Apply Template" modal** (`ApplyTemplateModal`): up to N rows, each row has template select dropdown + weekday checkboxes (Mon–Sun pill buttons); overwrite toggle; validates no duplicate weekdays; calls `calendarApi.populate`
  - **"Edit Day" modal** (`EditCalendarDayModal`): rest day toggle; template link dropdown (auto-fills label); label override input; notes textarea; calls `calendarApi.updateDay`
  - **"Clear Month"** button (shown only when month has planned days): confirms then calls `calendarApi.clearMonth`
  - Toast messages bubbled through callbacks to `CalendarTab`'s own `useToastInCal` so they survive modal unmount

**Action required on next server start**: Run `npx prisma generate` to regenerate the Prisma client with the new `WorkoutCalendarDay` accessor.

---

## 2026-04-24 — Session: P3 items #11–17

### P3 #11 — Quick re-log on Nutrition page
- **`src/controllers/foodController.ts`**: Added `getFrequentFoods` — scans last 300 entries per user, groups by `foodName.toLowerCase()`, ranks by count, returns top N with last-used macros/quantity/unit/meal.
- **`src/routes/foods.ts`**: Registered `GET /frequent` before `/:id` param route to avoid routing conflict.
- **`client/src/api/index.ts`**: Added `foodApi.frequent(limit?)`.
- **`client/src/pages/nutrition/NutritionPage.tsx`**: `frequentFoods` state loaded on mount; amber "⚡ Quick Re-log" strip renders when ≥1 entry exists; each food pill shows name + kcal; one-tap re-logs to the current date and refreshes totals; spinner + disabled state during save.

### P3 #12 — Dashboard weight entry FAB
- **`client/src/pages/dashboard/Dashboard.tsx`**: Added `weightApi` import; `showWeightFab` / `weightVal` / `savingWeight` state; fixed bottom-right `⚖️` button; popup card with kg number input (Enter key support); on save calls `weightApi.log`, flashes "✅ Saved!" for 800 ms, then re-fetches dashboard to update chart + stat cards.

### P3 #13 — Inline rest timer in WorkoutDetail
- **`client/src/pages/workouts/WorkoutsPage.tsx`**: Added `timerExId: number | null` + `secondsLeft: number` state inside `WorkoutDetail`. `setInterval` runs while `timerExId !== null`, auto-clears at 0. "✓ Set done" green button per exercise triggers 90 s countdown. Inline blue countdown strip shows `mm:ss` + shrinking progress bar + ✕ dismiss. Starting a new timer replaces the current one.

### P3 #14 — Shared recent-messages sidebar in Chat
- **`client/src/pages/chat/ChatPage.tsx`**: Layout changed from `flex-col` to `flex` with a `w-56` `<aside>` (hidden below `lg` breakpoint). `loadSidebarHistory` fetches last 30 conversations across all agents (`chatApi.getHistory(undefined, 1, 30)`) and refreshes on every new message. Each item shows agent icon, label, truncated user message, and relative day label.

### P3 #15 — Chat agent-switch confirmation
- **`client/src/pages/chat/ChatPage.tsx`**: Agent tab buttons now call `requestSwitchAgent()` instead of `setAgent()` directly. If `messages.length > 0`, sets `pendingAgent` state and shows a centered modal with agent icon, "Your conversation is saved" message, and Stay / Switch buttons. Sidebar entries use the same function.

### P3 #16 — Workout training-type support
- **`prisma/schema.prisma`**: Added `trainingType String?` to `Workout` model.
- **`src/lib/runMigrations.ts`**: Added `Workout.trainingType TEXT` to `MIGRATIONS` array — applied on next server boot.
- **`src/controllers/workoutController.ts`**: Both `createWorkout` and `updateWorkout` accept and persist `trainingType`.
- **`client/src/types/index.ts`**: Added `trainingType?: string | null` to `Workout` interface.
- **`client/src/api/index.ts`**: Added `trainingType?: string` to `WorkoutCreateInput`.
- **`client/src/pages/workouts/WorkoutsPage.tsx`**: Added `TRAINING_TYPES` constant (Strength 🏋️ / Hypertrophy 📈 / Endurance 🏃 / Cardio ❤️ / Mobility 🧘) with per-type colours. Toggle pill-selector added to `WorkoutForm` and `EditWorkoutForm`. Coloured pill badge shown on workout cards when type is set.

### P3 #17 — Store suggestedWorkout JSON in Conversation row
- Already fully implemented in a prior session: `metadata` column in `runMigrations.ts`, `chatController.ts` stores + parses JSON, ChatPage re-hydrates save buttons from history. Confirmed complete — no additional work needed.

---

## 2026-04-23

### Completed this session

#### Nutrition page — macro goal bars + deficit/surplus banner
- **`NutritionPage.tsx`**: Added `activeGoal: CalorieGoal | null` state, fetched in parallel with today's food log via `calorieGoalsApi.getActive()`.
- **`MacroGoalBar` component**: progress bar per macro (protein/carbs/fat) showing consumed vs. target grams, percentage, over/under amount, and coloured bar fill. Only renders when an active goal exists.
- **`DeficitSurplusBanner` component**: within ±80 kcal → green "Right on target"; surplus → orange with bulk-friendly message; deficit → blue with cut-friendly message.
- **Calorie card updates**: shows goal kcal and `CalorieProgress` bar when a goal is set; shows "Set a calorie goal" nudge when not; TDEE displayed in footer stats.
- **Macros card updates**: tab toggle "🍩 Distribution / 🎯 vs Goals" (toggle only shown when goal exists); Distribution = existing doughnut rings; vs Goals = three `MacroGoalBar`s.

#### Goals page — preset goal templates
- **`GoalsPage.tsx`**: Added `GOAL_PRESETS` array of 6 presets: Fat Loss (−8%/16wk), Aggressive Cut (−12%/12wk), Lean Bulk (+4%/16wk), Muscle Building (+7%/20wk), Maintenance (0%/12wk), Body Recomposition (0%/20wk).
- **`applyPreset(preset)`**: computes target weight from `currentWeight × (1 + weightPct/100)`, calls `addWeeks(weeks)` for target date, sets all form fields, immediately calls `getPreview({ cw, tw, td })` via override params to bypass setState timing.
- **`getPreview(overrides?)`**: refactored to accept optional `{ cw?, tw?, td? }` overrides so `applyPreset` can pass fresh computed values without waiting for React state update.
- Preset cards rendered as a 2-column grid above the customise fields; active preset highlighted with its theme colour; profile-incompleteness warning shown when age/height/sex/activityLevel are missing.
- Manual field changes reset `activePreset` and `preview`.

#### Settings page — improved error messages + protein multiplier slider
- **`SettingsPage.tsx`**: Added `parseApiError(e)` helper — surfaces field-level Zod details, API error string, or falls back to `e.message`.
- **`NutritionPreferencesForm`**: range slider (0.8–2.2 g/kg, step 0.1), live "X g protein/day" preview using `user.weight`, reference table (sedentary → cutting), warning banner at ≥2.2 g/kg, saves via `usersApi.updateProfile({ proteinMultiplier })`.
- All save handlers now use `parseApiError(e)` for consistent user-facing errors.

#### Backend — schema + error improvements
- **`src/middleware/schemas.ts`**: Added `proteinMultiplier: z.coerce.number().min(0.8).max(2.2).optional()` to `updateProfileSchema` (was being stripped by Zod, causing silent 500s).
- **`src/middleware/errorHandler.ts`**: Type-aware error messages — Prisma P2002 → "A record with that value already exists.", P2025 → "Record not found.", P2xxx → "Database error — please try again.", JWT → "Session expired — please log in again.", SyntaxError → "Invalid request format.", otherwise → "Something went wrong. Please try again." Dev mode exposes `detail` + `stack`.

### TypeScript check: ✅ zero errors (frontend)

---

## 2026-04-23 — Session 10

### Completed this session

#### Task 11 — Body Recomposition goal option
- **`OnboardingModal.tsx`**: Added `body_recomp` to `GoalKey` type and `GOAL_OBJECTIVE` map (→ hypertrophy). Added new goal card: "🔄 Gain Muscle, Maintain Fat %" (cyan, adj factor 1.0 = TDEE calories). Updated `computePlan` protein from hardcoded `2` to `1.8`.
- **`WorkoutsPage.tsx`**: Extended `GOAL_OBJECTIVE_MAP` with `lose_fat`, `build_muscle`, `body_recomp`, `performance`, `maintain` keys so template sorting works regardless of whether `user.goal` uses the old free-text or new enum-style value.

#### Task 7 — Protein multiplier (2.0 g/kg default, slider in Settings)
- **`prisma/schema.prisma`**: Added `proteinMultiplier Float @default(2.0)` to `User` model.
- **`prisma/migrations/20260423000001_add_protein_multiplier/migration.sql`**: SQL migration file (`DEFAULT 2.0`).
- SQLite migration applied via Python sqlite3 `ALTER TABLE "User" ADD COLUMN "proteinMultiplier" REAL NOT NULL DEFAULT 2.0`.
- **`node_modules/.prisma/client/index.d.ts`**: Manually patched — added `proteinMultiplier: number` to `$UserPayload` scalars; `proteinMultiplier?: number` to `UserCreateInput`, `UserSelect`; `proteinMultiplier?: FloatFieldUpdateOperationsInput | number` to `UserUpdateInput`.
- **`src/lib/calorieCalculator.ts`**: Added `proteinMultiplier?: number | null` to `CalcInput`. Changed protein line to `const multiplier = input.proteinMultiplier ?? 2.0; const proteinGrams = Math.round(currentWeight * multiplier)`.
- **`src/controllers/userController.ts`**: Added `proteinMultiplier` to `getProfile` select, `updateProfile` data (clamped 0.8–2.2) and select.
- **`src/controllers/calorieGoalController.ts`**: Both `createCalorieGoal` and `previewCalorieGoal` now fetch `proteinMultiplier` from the user and pass it to `calculateCalorieGoal`.
- **`src/controllers/chatController.ts`**: `saveCaloriePlan` now fetches and passes `proteinMultiplier` to `calculateCalorieGoal`.
- **`src/controllers/authController.ts`**: `getMe` now selects `profileComplete` and `proteinMultiplier`.
- **`client/src/types/index.ts`**: Added `proteinMultiplier?: number | null` to `User` interface.
- **`client/src/pages/settings/SettingsPage.tsx`**: Added `NutritionPreferencesForm` component — range slider (0.8–2.2, step 0.1), live "X g protein/day" preview from current weight, a reference table of common protein ranges, warning at ≥2.2 g/kg. Inserted between ProfileForm and PasswordForm in the page.

#### Task 8 — Workout plan UX (toasts + fork-to-custom + rename)
- **`WorkoutsPage.tsx`**: Added `useToast()` hook and `ToastBanner` component (fixed bottom-right, 3s auto-dismiss).
- **History tab**: Toast "Workout logged!" on save, "Workout deleted." on delete, "Workout updated!" on edit save.
- **Templates tab**: Toast on template delete, fork, and start. `forkTemplate()` creates a user-owned copy via `templatesApi.create()`, switches to "My Templates" sub-tab, shows a toast with instructions to rename. `renameTemplate()` calls `templatesApi.update()` and updates local state.
- **`TemplateDetail`**: Added `onFork` prop (shown for system templates as a "Fork" button inside a blue hint card) and `onRename` prop (shown for user templates as an inline rename input triggered by a pencil button next to the title). Rename confirms with Enter key or button, cancels with Escape.

#### Task 9 — Expanded muscle group filter + full exercise list
- **`WorkoutsPage.tsx`**: `MUSCLE_GROUPS` array updated: removed "Arms", added "Biceps", "Triceps", "Forearms", "Hamstrings"; kept "Legs" as a broad alias.
- **`AddExercisePanel`**: Replaced the `ExerciseSearch` combobox with a full scrollable checklist. Calls `searchApi.exercises("", { muscle }, 80)` when muscle chip changes. Results show as a selectable list with exercise name + equipment. Filter input narrows results client-side. Sets/Reps/kg/RPE inputs unchanged.
- **`src/data/exercises.ts`**: Added 5 Forearms exercises (e067–e069c): Barbell Wrist Curl, Reverse Wrist Curl, Farmer's Carry, Plate Pinch, Dead Hang. Added "Forearms" and "Legs" to `MUSCLE_GROUPS`. Updated `searchExercises` to treat `muscle === "Legs"` as a broad filter matching Quads/Hamstrings/Glutes/Calves.

#### Task 10 — Smart plan suggestions (injury, missing muscles, gender/goal-aware)
- **`WorkoutsPage.tsx`**: Added `SmartPlanSuggestions` component rendered inside `TemplateDetail` (below exercise list). Three suggestion types: `warning` (amber), `tip` (blue), `info` (gray).
- **Injury detection**: Flags plans with ≥2 spinal-load exercises and no core work ("⚠️ Lower back load…"). Flags quad-dominant plans with no hamstring work.
- **Missing muscle detection**: For plans with ≥6 exercises, checks for missing Chest/Back/Quads/Shoulders.
- **Gender-aware**: Female users — suggests Hip Thrusts/Bulgarian Split Squats if no glute work. Male users — warns about push/pull imbalance (>1.5× chest-to-back ratio).
- **Goal-aware**: Fat loss → compound movement tip if no compound exercises. Build muscle/body_recomp + beginner → progressive overload note.

### Both TypeScript checks: ✅ zero errors (backend + frontend)

---

## 2026-04-23 — Session 9

### Completed this session

#### Progress page — separated sections + body composition
- **`ProgressPage.tsx`** — Full rewrite. Added two tabs: "⚖️ Body & Weight" and "🏋️ Exercise Progression".
- **Body & Weight tab**: stats row, body weight trend chart (AreaChart), new `BodyCompositionCard`, and weight log table. The log table now includes an "Est. Fat%" column per entry.
- **`BodyCompositionCard`** — New component. Auto-calculates from user profile (`weight`, `height`, `age`, `sex`) using the Deurenberg equation (BMI + age + sex → body fat %). Shows: BMI gauge bar with category (Underweight/Normal/Overweight/Obese), fat % badge with ACE category (Essential/Athlete/Fitness/Average/Above average) and colour coding, muscle mass % and kg (≈85% of lean mass), lean mass kg, body breakdown horizontal bar, and a body fat % trend `ComposedChart` with dual Y-axis (fat% left, weight kg right). Renders a "complete your profile" prompt if weight/height/age/sex are missing.
- **Exercise Progression tab**: moved `ExerciseProgressionSection` (unchanged) under the Strength tab, keeping it fully separate from the body weight section.
- **Formulas**: Deurenberg 1991 — `Fat% = 1.20×BMI + 0.23×age − 16.2 (male) / −5.4 (female)`. Muscle estimate = lean mass × 0.85.

#### Food database expansion (+67 entries, ~190 → ~257 items)
- **`src/data/foods.ts`** — Added three new categories:
  - **Integral / Whole Grain** (f130–f146, 17 items): whole grain bread, multigrain bread, rye/dark bread, Ezekiel sprouted bread, whole wheat pasta & penne, whole grain/wild rice, rolled oats, steel cut oats, buckwheat, farro, barley, Wasa crispbread, whole grain tortilla, corn, freekeh.
  - **Fit / High-Protein** (f150–f169, 20 items): skyr, quark, egg white omelette, tuna steak, tempeh, seitan, lupin beans, chicken strips, turkey meatballs, low-fat protein shake, rice protein powder, sardines, smoked salmon, broccoli sprouts, cauliflower, baby spinach, rice cake with PB, fat-free Greek yogurt, protein pudding, veggie omelette.
  - **Keto / Low-Carb** (f170–f193, 24 items): whole avocado, almond flour, coconut flour, MCT oil, brie/parmesan/cream cheese, heavy cream, sour cream, bacon, pepperoni, pork rinds, zucchini noodles, cauliflower rice, shirataki noodles, macadamia/pecan/Brazil nuts, beef jerky, keto bread, coconut milk, olives, salami, keto protein bar.

### Both TypeScript checks: ✅ zero errors

---

## 2026-04-23 — Session 8

### Completed this session — Phase 3 finish

#### Onboarding projection chart (Step 3)
- **`OnboardingModal.tsx`** — Added `computeProjection()` helper: takes `currentWeight`, `targetWeight`, `durationDays` → returns week-by-week `ProjectionPoint[]` (week, weight, label). Added `projection` state to `PlanStep`, computed via `useEffect` when stats are sufficient. Renders a Recharts `AreaChart` with gradient fill, dashed `ReferenceLine` at target weight, and a summary line (e.g. "75 kg → 67 kg over 12 weeks"). Chart only appears when the user has entered their weight.

#### Chat save buttons persist across history reloads
- **`prisma/schema.prisma`** — Added `metadata String?` to `Conversation` model.
- **`src/controllers/chatController.ts`** — Moved structured-JSON extraction before the `prisma.conversation.create` call. Builds `{ suggestedWorkout?, suggestedPlan?, suggestedMealPlan? }` and stores as `JSON.stringify(...)` in `metadata` (only when non-empty). `getHistory` parses `metadata` back to an object before returning.
- **`client/src/types/index.ts`** — Added `metadata?: { suggestedWorkout?, suggestedPlan?, suggestedMealPlan? } | null` to `Conversation` interface.
- **`client/src/pages/chat/ChatPage.tsx`** — `loadHistory` reads `c.metadata` and spreads structured fields onto assistant messages, restoring all save buttons from history. Added `suggestedMealPlan` to `ChatMessage` type. Added `handleSaveMealPlan` (bulk-logs all items via `foodApi.bulk()`). `ChatBubble` now shows 🥗 "Log Meal Plan" button when `suggestedMealPlan` present. Strips `meal-plan-json` blocks from displayed text.

#### Onboarding re-show robustness — profileComplete flag
- **`prisma/schema.prisma`** — Added `profileComplete Boolean @default(false)` to `User` model.
- **`src/controllers/userController.ts`** — `updateProfile` sets `profileComplete: true` whenever `goal` is non-null in the update. Both `getProfile` and `updateProfile` selects include `profileComplete`.
- **`client/src/types/index.ts`** — Added `profileComplete?: boolean | null` to `User` interface.
- **`client/src/components/layout/Layout.tsx`** — Changed onboarding trigger from `!user.goal` to `!user.profileComplete`. `localStorage` dismiss key kept as a session-level guard for users who skip.

#### DB migration
- Applied directly via Python/sqlite3 (Prisma binary downloads blocked in sandbox). Migration SQL saved to `prisma/migrations/20260423000000_.../migration.sql`. Prisma client type definitions (`node_modules/.prisma/client/index.d.ts`) patched to add new fields to payload, select, create, and update types — user should run `npx prisma generate` on first pull to regenerate clean types.

### Both TypeScript checks: ✅ zero errors

---

## 2026-04-22 — Session 7

### Completed this session

#### Zod validation — all remaining routes covered
- **`schemas.ts`** — Added `upsertWeeklyPlanSchema`, `toggleDaySchema`, `updateDaySchema`, `addExerciseToWorkoutSchema`, `bulkLogFoodsSchema`, `bulkFoodItemSchema`.
- **`weeklyPlan.ts`** (routes) — Added `validateIdParam("dayId")` + `validate(...)` to all mutating routes (POST /, PATCH /days/:dayId/toggle, PUT /days/:dayId, DELETE /:planId). Previously zero validation on this router.
- **`workouts.ts`** (routes) — Added `validate(addExerciseToWorkoutSchema)` to `POST /:id/exercises`.

#### Bulk food log endpoint
- **`foodController.ts`** — Added `bulkLogFoods` handler: runs a `prisma.$transaction` for all items, stores at UTC noon per date, returns all created logs.
- **`foods.ts`** (routes) — Registered `POST /api/foods/bulk` with `validate(bulkLogFoodsSchema)`.
- **`api/index.ts`** — Added `foodApi.bulk(foods, date?)`.

#### Nutritionist meal plan suggestions (end-to-end)
- **`prompts.ts`** — Added `MEAL_PLAN_JSON_INSTRUCTIONS` to nutritionist system prompt. Added `MEAL_PLAN_JSON_REGEX` and `extractMealPlanJson()`. Updated General agent to include meal plan instructions.
- **`chatController.ts`** — Extracts `suggestedMealPlan` from AI response and returns it alongside `suggestedWorkout` / `suggestedPlan`.
- **`api/index.ts`** — Added `suggestedMealPlan` to `chatApi.send()` return type.
- **`NutritionPage.tsx`** — Added `SuggestMealPlanModal` component: calls nutritionist agent with a preset meal-plan prompt, shows loading state, parses `meal-plan-json`, displays preview table grouped by meal with totals, "Log All Meals" calls `foodApi.bulk()` and refreshes the log. Added "✨ Suggest Plan" button in page header.

#### Onboarding wizard (new users)
- **`OnboardingModal.tsx`** — New 3-step wizard: (1) Goal selection (4 cards: Lose Fat / Build Muscle / Maintain / Performance), (2) Stats (weight, height, age, sex, activity level, training days/week), (3) Plan preview showing TDEE + macro targets (Mifflin-St Jeor) + a recommended workout template. "Start with this plan" saves profile via `usersApi.updateProfile()` and creates a calorie goal via `calorieGoalsApi.create()`. "Skip for now" dismisses without saving. Progress dots on top.
- **`Layout.tsx`** — Integrated OnboardingModal. Shows automatically if `user.goal` is null and the user hasn't previously dismissed it (tracked in `localStorage.fitai_onboarded_${userId}`). 800ms delay so dashboard renders first.

### Both TypeScript checks: ✅ zero errors

---

## 2026-04-22 — Session 6

### Completed this session

#### Workout section overhaul
- **WorkoutsPage.tsx** — Full rewrite. Two main tabs: "🏋️ History" (logged workouts) and "📋 Templates" (merged TemplatesPage content).
- **Add Exercise to existing workout** — `WorkoutDetail` now has a dashed "+ Add Exercise" button that opens `AddExercisePanel`. Panel includes: muscle-group filter chips (Any / Back / Chest / Legs / Shoulders / Arms / Core / Glutes), `ExerciseSearch` filtered by selected muscle, Sets / Reps / kg / RPE inputs, and an "Add to Workout" button that calls the new backend endpoint.
- **TemplatesTab** — Inlined from TemplatesPage. Recommended / My Templates sub-tabs. My Templates includes a delete button per card. "Ask AI Coach" CTA on empty state.
- **RecommendedBanner** — Profile-aware banner at top of Recommended tab. Maps user `goal` to an objective (lose weight → fat_loss, build muscle → hypertrophy, etc.) and shows a contextual hint. Recommended templates within each group are sorted so matching-objective templates appear first.
- **Sidebar.tsx** — Removed "Templates" nav entry.
- **App.tsx** — Removed TemplatesPage import; `/templates` route now `<Navigate to="/workouts" replace />`.

#### Backend: add exercise to existing workout
- **`workoutController.ts`** — Added `addExerciseToWorkout` handler: verifies ownership, computes next `order`, normalises exercise name, creates `WorkoutExercise` row.
- **`routes/workouts.ts`** — Registered `POST /:id/exercises` → `addExerciseToWorkout`.
- **`client/src/api/index.ts`** — Added `workoutsApi.addExercise(workoutId, data)`.

#### Nutrition bug fixes (from Session 5)
- **`foodController.ts`** — Fixed stale `targetDate` reference (was `startOfDay`). Fixed UTC day-boundary query. POST stores at UTC noon.
- **`NutritionPage.tsx`** — Rewritten: `calcMacro` helper, live macro recalculation, delete entries (optimistic), per-meal subtotals, "Ask Nutritionist" button.

### Both frontend and backend TypeScript checks: ✅ zero errors

---

## 2026-04-22 — Session 5

### Bugs reported (from frontend test)
- **Nutrition page: food add broken** — user cannot add food to the day log. To investigate: form submission, `foodApi.log()` call, network response.
- **Nutrition page: food search doesn't auto-populate macros** — selecting a food from search should fill in calories/protein/carbs/fats automatically.

### Features planned & added to backlog
- **Workout overhaul**: merge Templates into Workouts section, recommended routines based on profile/goals/weekly plan, add/remove exercises per workout day with muscle group suggestions, coach can push workout plans inline.
- **Nutrition overhaul**: fix food add flow, auto-populate macros on search, delete food entries, nutritionist suggests daily meal plans based on goals + calories burned.
- **Onboarding wizard**: first-time setup flow collecting goal, stats, training days; realistic projection graphs (weight/body comp over 4/8/12/24 weeks); suggested starting plan; ongoing projection chart on dashboard.

### Completed this session
- **AI agent tool-calling** (`src/ai/agent.ts`) — full rewrite. Added 6 tool definitions (get_recent_workouts, get_nutrition_summary, get_weight_trend, get_active_calorie_goal, get_workout_templates, get_personal_records). Each agent gets a tailored tool subset. Replaced single API call with a MAX_TOOL_ROUNDS=5 loop. Handlers are Prisma queries returning human-readable strings.
- **chatController.ts** — added `id` to user profile select so tool handlers have the userId.
- **userController.ts** — fixed `getProfile` and `updateProfile` to include `sex` and `activityLevel` (were silently dropped before).
- **reportController.ts** — fixed `avgCalories`/`avgProtein` null coalescing to satisfy Prisma non-nullable Float fields.
- **chatController.ts** — added `tdee` field to `saveCaloriePlanFromChat` Prisma create (required by schema).
- **env.ts** — fixed corrupted template literal (escaped `${}`) causing TS errors.
- **CONTEXT.md / LOG.md** — renamed CLAUDE.md → CONTEXT.md, created LOG.md, added all new TODOs.

---

## 2026-04-21 — Session 4

### Identified / Planned
- **AI agent tool-calling** (not yet implemented): Current `src/ai/agent.ts` is a basic `chat.completions.create` wrapper — the AI only sees a static user profile snapshot and has no access to live data. Plan is to rewrite using OpenAI function-calling so the coach/nutritionist agents can query the DB in real time. Tools to add: `get_todays_nutrition`, `get_recent_workouts`, `get_weight_trend`, `get_active_calorie_goal`, `get_workout_templates`, and optionally write tools `log_food` / `save_workout_template`. Added to 🔴 backlog in CONTEXT.md.

---

## 2026-04-21 — Session 3

### Features
- **Weekly plan templates**: Redesigned `SetupModal` in `WeeklyPlanWidget.tsx` with a two-step flow.
  - Step 1: select training days per week (2–7), browse Intermediate + Advanced plan cards.
  - Step 2: auto-filled day labels from the selected template, still fully editable.
  - 14 built-in templates covering Full Body, Upper/Lower, PPL, Bro Split, and DUP across all day counts.
  - "Custom" option skips directly to the day picker with blank labels.
  - "← Back" link in Step 2 lets users return to the plan browser.
  - Empty state updated to "Browse Plans" CTA.

### Bug fixes
- **Report controller** (backend + frontend): verified fully correct — all column names match schema (`totalWorkouts`, `totalVolume`, `avgCalories`, `avgProtein`, `weightDelta`), unique key `userId_year_month` correct, N+1 PR detection replaced with batched `groupBy`. `ReportsPage.tsx` column references confirmed matching.
- **Meal field type** (`NutritionPage.tsx`): `meal` state was `useState<string>` causing a TS error against `FoodLog.meal` which expects `"breakfast" | "lunch" | "dinner" | "snack" | null`. Fixed state type and added cast on the `onChange` handler.

### Housekeeping
- Renamed `CLAUDE.md` → `CONTEXT.md` for agent-agnostic naming.
- Created `LOG.md` (this file).
- Updated `CONTEXT.md`: removed resolved items from "Needs verification", marked ReportsPage and NutritionPage as done, added WorkoutsPage TS issue to 🔴 Not yet implemented, added meal field gotcha.

---

## 2026-04-21 — Session 2

### Features
- **Save-from-chat end-to-end** (`ChatPage.tsx`, `api/index.ts`):
  - `chatApi.send` return type extended to include `suggestedWorkout` and `suggestedPlan`.
  - Message type extended with those optional fields; stored on the assistant message when the API returns them.
  - Save buttons now only appear when structured JSON actually came back (not keyword-matched).
  - `handleSaveWorkout` sends the real parsed workout payload (name, exercises, splitType, etc.).
  - `handleSavePlan` calls `chatApi.saveCaloriePlan` with actual macro data.
  - Fenced JSON blocks stripped from displayed chat text so users don't see raw JSON.
  - Toast notification shows red on error with the actual API error detail.
- **Weekly plan suggested templates**: Added plan-picker step to the weekly plan setup modal (see Session 3 above for detail — this was the groundwork commit).

### Bug fixes verified
- Report controller column names confirmed correct in both backend and frontend.
- Meal field backend fix confirmed (`foodController.ts` includes `meal` in both create and update).

---

## 2026-04-20 — Session 1

### Features
- **Phase 1 (Backend)**: Full Express + TypeScript REST API — auth, workouts, nutrition, weight, goals, calorie goals, templates, AI chat (3 agents), weekly plan, reports, dashboard, search.
- **Phase 2 (Frontend)**: All 8 React pages wired up in `App.tsx`. Zustand auth store, Axios API client, Recharts charts, Tailwind CSS.
- **Edit/delete logged workouts** (`WorkoutsPage.tsx`): `EditWorkoutForm` modal, delete with confirmation.
- **Weekly plan widget** (`WeeklyPlanWidget.tsx`): day grid, mark complete, calorie logging, progress bar, graceful error if migration not run.

### Bug fixes
- **JWT refresh tokens**: Replaced DB-stored `RefreshToken` model with JTI-based in-memory revocation (`tokenBlocklist.ts`). Eliminates the `prisma.refreshToken is undefined` crash caused by Windows Prisma client file-lock issues.
- **CORS 405**: Added `OPTIONS` to allowed methods + `app.options("*", cors())`.
- **EADDRINUSE port 3000** (Windows): `scripts/kill-port.cjs` run via `predev`, SIGINT handler + 3s force-exit in `server.ts`.
- **`generalLimiter` dead code**: Was defined but never mounted — now applied to `/api/` in `server.ts`.
- **Meal field dropped** (backend): `meal` added to destructuring and Prisma `create`/`update` in `foodController.ts`.
- **AI structured output broken**: System prompts updated to embed `workout-json` / `nutrition-json` fenced blocks. Backend extracts and returns them as `suggestedWorkout` / `suggestedPlan`.
- **Report controller column drift**: Rewrote with correct Prisma field names. N+1 PR detection replaced with 2-query batched `groupBy`.
- **Stale files deleted**: Root `schema.prisma` (conflicted with `prisma/schema.prisma`) and `tsconfig.ts` (CommonJS config, shadowed `tsconfig.json`).
- **Auth error messages**: Register shows field-level Zod errors inline; login shows specific messages for 401, 429, and network errors.

---

## Session — 2026-04-30 — Bug fixes + Profile bar + Macro color fix

### Fixed
- #74: Moved daily calorie+macro summary to the TOP of Nutrition tab (above supplements/water)
- #76: Added catch block to deleteLog — errors now show alert instead of silently failing; added isCheatMeal to logFoodSchema + updateFoodLog controller
- #77: Exercise name in existing workout exercise edit now has ExerciseSearch autocomplete
- #70: ProgressPage header buttons use flex-wrap to avoid overflow on narrow mobile screens
- #72: MacroView toggle uses flex-wrap + shorter labels on mobile, card header uses flex-col on mobile

### New features
- MacroRing + MacroGoalBar: exceeding 100% of goal now shows glowing RED instead of green
- ProfileSummaryBar: persistent icon strip at top of all pages showing active goal, estimated BF%, today's calories + macros; each pill navigates to the relevant tab

### Pending (image roadmap)
- CI/CD: GitHub Actions pipeline
- Deploy: Railway/Render full stack with health checks
- AI: Provider abstraction (DeepSeek default, OpenAI fallback), RAG
- Backend: env validation, pagination, auth UX

---

## Session 2026-04-30 — Polish sprint: 7 features + Railway verification

### Deployment verified (no changes)
- Dockerfile, entrypoint.sh, docker-compose.yml untouched — Railway safe
- Exercise DB: 106 exercises, fallback static array in place

### Fixed / implemented
- #67: Food tag filtering now multi-select AND logic — click multiple chips to combine filters; backend accepts comma-separated `tags` param
- #75: Nutrition date persisted in sessionStorage — restores last viewed day on return (auto-resets if >7 days old)
- #79: Tab state persisted — Workouts tab and Nutrition macro view survive navigation via sessionStorage
- #73: Favourites system — star any logged food; Favourites panel above Quick Re-log; localStorage, max 20 items
- #68/#62: Analytics tab — added Weight Trend chart + Nutrition Adherence stats (logging rate, avg macros, totals)
- #78: AI Workout Builder — new "AI Build" tab in Workouts; pick muscles + style + duration; AI generates plan; log directly

### Remaining
- #81 CI/CD, #82 Deploy, #83 AI providers, #84 RAG, #85 env validation, #71 weight prediction graph

---

## 2026-04-30 — Railway Deploy Hardening

**Fixed 5 bugs that would crash the production container:**
1. `prisma` CLI in devDeps → moved to deps (needed by `entrypoint.sh`: `prisma db push`)
2. `tsx` in devDeps → moved to deps (needed by `entrypoint.sh`: `tsx prisma/seed.ts`)
3. `expo` + `ngrok` in prod deps → moved to devDeps (zero runtime use)
4. `@types/nodemailer` in prod deps → moved to devDeps
5. Winston file transports always ran → now dev-only; production logs to stdout (Railway captures stdout)

**Regenerated** `package-lock.json` after dep changes.

**Added:** `railway.toml`, `docs/railway-deploy.md`, `.github/workflows/ci.yml`

**Verified:** backend tsc clean, frontend tsc clean, all routes present, CORS correct, static path correct, .env files gitignored.

---

## 2026-04-30 — Table + Docs update

**CONTEXT.md:** Updated pending section with current state of all remaining TODOs and categories.

**Pending as of this session:**
- #71 Weight prediction graph (P2, Feature)
- #83 AI provider abstraction / DeepSeek (P2, AI/ML)
- #84 RAG + embeddings for chat memory (P3, AI/ML)
- #85 Pagination for food logs + workouts (P2, Infrastructure) — note: env validation already done via Zod in src/config/env.ts
- Connection pooling (post-Railway-live, Infrastructure)
- P5 backlog: superset/circuit, meal plan templates, admin dashboard, barcode scanner, push notifications

---

## 2026-04-30 — UX Polish Sprint: Exercise Search, Nutrition Layout, Dark Mode, Favourites, Fasting

### Root causes diagnosed and fixed (7 issues)

**#91 — Exercise search dropdown invisible (P1 · UX · WorkoutsPage)**
- Root cause: Modal content div has `overflow-y-auto`; `position:absolute` dropdowns are clipped by any ancestor with non-`visible` overflow — even after removing inner `max-h-80 overflow-y-auto` from ExerciseRows.
- Fix: Rewrote `ExerciseSearch` to use `position:fixed` + `getBoundingClientRect()` on the input ref. Dropdown renders at exact screen coordinates, bypassing all parent overflow contexts. Added `useRef<HTMLInputElement>` + `calcPos()` helper.

**#92 — Per-row muscle group selector (P2 · Feature · WorkoutsPage)**
- Added `muscle: string` field to `ExRow` interface and `newRow()`.
- Each exercise row now has a compact `<select>` (Any muscle / Chest / Back / …) rendered above the search input.
- Per-row muscle filter overrides the global chip; both systems coexist.

**#93 — Save workout: trainingType silently dropped + Modal dark mode (P1 · Bug)**
- `createWorkoutSchema` (Zod) didn't include `trainingType` → Zod stripped it before the controller ran; training type was never saved. Added `trainingType: z.string().max(50).optional()`.
- `Modal.tsx` had hardcoded `bg-white` with no dark variants → form content invisible/inverted in dark mode. Added `dark:bg-gray-800`, `dark:border-gray-700`, `dark:text-white`, `dark:hover:bg-gray-700` to panel, header, title, close button.

**#94 / Textarea dark mode (P1 · Bug · WorkoutsPage)**
- `Textarea.tsx` component had zero dark-mode CSS classes — the Notes field in WorkoutForm rendered white in dark mode, making the entire form appear inverted.
- Added full dark mode parity: `dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500` matching the `Input` component.

**Nutrition layout — calories/macros at top (P1 · UX · NutritionPage)**
- 7 action buttons were crammed into the same flex row as the date nav, wrapping on mobile and pushing calories/macros off-screen.
- Fixed: Split header into two rows. Row 1: title + `← date →` only. Row 2: action buttons (`+ Log Food`, fasting timer, My Foods, Build Dish, AI Plan, Ask AI). Calories + macro cards render immediately after row 1 — first content seen on the page.
- Shortened button labels (`✨ AI Plan`, `🥗 Ask AI`, `🥣 Build Dish`) to prevent wrapping on mobile.

**Fasting timer not visible / "not working" (P1 · UX · NutritionPage)**
- Timer elapsed display was only in a banner below the macro cards — user had to scroll to see it was running.
- Fixed: The "Start Fast" button now shows the live counter inline (`⏸ 2h 14m`) using `formatFastingDuration(fastingElapsed)` in the button label. Timer is visible from the top of the page at all times.
- Button tooltip updated: `End fast · 2h 14m elapsed`.

**Macros not updating after logging food (P1 · Bug · ProfileSummaryBar)**
- `ProfileSummaryBar` (persistent top bar across all pages) fetched `dashboardApi.get()` once on mount and never re-fetched — showed stale macro numbers regardless of what was logged.
- Fix: Introduced `fitai:food-logged` custom DOM event. Dispatched from every food logging path: `LogFoodForm.onSave`, `BuildDishModal.onSaved`, `relogFav`, `handleQuickRelog`. `ProfileSummaryBar` listens via `window.addEventListener("fitai:food-logged", fetchData)` and re-fetches immediately on any log action.

**Favourites `addFoodToFavs` null quantity (P2 · Bug · NutritionPage)**
- When adding a food to favourites via search, `item.defaultQty` and `item.defaultUnit` could be `null` from the API response. Stored `null` in localStorage, causing silent failures on re-log.
- Fix: Safe fallback chain: `item.defaultQty ?? item.servingSize ?? 100` and `item.defaultUnit ?? item.servingUnit ?? "g"`. Same fix applied to `relogFav` quantity/unit defaults.

### Files modified
| File | Change |
|------|--------|
| `client/src/components/ui/Textarea.tsx` | Full dark mode class parity |
| `client/src/components/layout/ProfileSummaryBar.tsx` | `fetchData` refactored to `useCallback`; `fitai:food-logged` event listener |
| `client/src/components/ui/Modal.tsx` | Dark mode: panel, header border, title, close button |
| `client/src/pages/nutrition/NutritionPage.tsx` | Header restructure; fasting button shows live timer; `fitai:food-logged` dispatch ×4; `addFoodToFavs` null-safe defaults |
| `client/src/pages/workouts/WorkoutsPage.tsx` | `ExerciseSearch` → `position:fixed` dropdown; `ExRow` + `newRow` muscle field; per-row `<select>` in `ExerciseRows`; `globalMuscle` replaces `activeMuscle` |
| `src/middleware/schemas.ts` | `trainingType` added to `createWorkoutSchema` |

### TypeScript
- `npx tsc --noEmit` — 0 errors (backend)
- `npx tsc --noEmit` — 0 errors (frontend)

---

## 2026-05-01 — Goals Tab, Custom Exercises, Log Weight Fixes

### Features & fixes delivered

**#103 — Goals tab restored as standalone primary nav (P1 · Feature)**
- `/goals` was `<Navigate to="/progress" replace />` — completely missing GoalsPage.
- Restored proper `<Route path="/goals" element={<ErrorBoundary><GoalsPage /></ErrorBoundary>} />` in App.tsx.
- Added Goals (🎯 /goals) as 4th item in BottomNav `PRIMARY_ITEMS` (Home / Workouts / Nutrition / Goals / AI Coach).
- Added to Sidebar between Nutrition and AI Coach. Progress renamed from "Progress & Goals" → "Progress".
- `ProfileSummaryBar` goal pill `onClick` → `navigate("/goals")` (was `/progress`).
- `OnboardingModal` post-complete redirect → `navigate("/goals")` (was `/workouts?tab=templates`).

**#104 — GoalsPage manual goal editing (P1 · Feature)**
- Added `EditGoalModal` inside `GoalsPage.tsx`. Fields: name, current weight, target weight, target date, daily calories, protein, carbs, fats.
- "Recalculate macros" button calls `calorieGoalsApi.preview()` to server-compute macro split.
- Calorie sanity check warns if macro-derived cals differ from target by >50 kcal.
- Save calls `calorieGoalsApi.update()` with all fields; auto-computes `type` (cut/bulk/maintain) from weight delta.
- Backend `updateCalorieGoal` extended to accept and persist: `targetWeight`, `currentWeight`, `targetDate`, `dailyCalories`, `proteinGrams`, `carbsGrams`, `fatsGrams`, `weeklyChange`, `type`.

**#105 — Log weight button in ProgressPage broken (P1 · Bug)**
- Root cause: `showForm` state and `+ Log Weight` FAB existed, but `<Modal>` JSX was completely absent from render tree. Button set state to `true`, nothing rendered.
- Fix: Added `<Modal open={showForm} onClose={() => setShowForm(false)} title="Log Weight"><LogWeightForm .../></Modal>` before closing `</div>` of the ProgressPage return.

**#106 — Weight FAB missing from NutritionPage (P2 · Feature/Bug)**
- NutritionPage had no way to log weight, and the import for `weightApi` was also corrupted (missing comma).
- Fixed import corruption: `customFoodsApi   weightApi` → `customFoodsApi, weightApi`.
- Added `weightApi` to imports from `../../api`.
- Added state: `showWeightFab`, `weightVal`, `savingWeight`, `weightSaved`.
- Added `handleLogWeight` function (calls `weightApi.log({ weight: w })`).
- Added weight FAB (⚖️) at `bottom-32` — identical pattern to Dashboard FAB.

**#107 — Exercise library expanded ~106 → ~175+ exercises (P2 · Feature)**
- Added ~70 exercises (IDs e130–e228) across all muscle groups.
- New muscle groups: `"Adductors"` (Hip Adductor Machine, Hip Abductor Machine, Lateral Band Walk, Sumo Walk), `"Abductors"` (Hip Abductor Machine, Lateral Band Walk, Sumo Walk, Banded Clamshell variation).
- Additions per group: Chest (+6), Back (+8), Shoulders (+6), Biceps (+5), Triceps (+4), Quads (+6), Hamstrings (+4), Glutes (+4), Calves (+3), Core (+6), Cardio (+4), Adductors (+4), Abductors (+4), Full Body (+4).
- `MUSCLE_GROUPS` array updated to include new groups.

**#108 — Custom exercises full stack (P2 · Feature)**
- Prisma model `CustomExercise` added (userId FK, name, primaryMuscle, secondaryMuscles `@default("[]")`, equipment, difficulty, instructions, timestamps, cascade delete). `User` model gets `customExercises CustomExercise[]` relation.
- `prisma db push` will apply schema on next deploy (no migration files needed).
- CRUD controller: `listCustomExercises` (q + muscle filter), `createCustomExercise` (validates name + primaryMuscle), `updateCustomExercise` (user-owned check), `deleteCustomExercise` (user-owned check). All return `isCustom: true` and `id: "custom_${e.id}"`.
- Route file: `/api/custom-exercises` with `authenticate` middleware on all 4 routes. Registered in `server.ts`.
- `searchController.ts` extended: after DB seed results, fetches user's `customExercise` rows and prepends them to results (custom exercises appear first). Total count includes custom count.
- Client types: `CustomExercise` interface (id: string, dbId, name, primaryMuscle, secondaryMuscles, equipment, difficulty, instructions, isCustom: true) added to `client/src/types/index.ts`.
- Client API: `customExercisesApi` (list/create/update/delete) added to `client/src/api/index.ts`.
- WorkoutsPage UI: `CreateCustomExerciseModal` with name, primaryMuscle (select), equipment (select), difficulty (3-button toggle), instructions (textarea). ExerciseSearch no-results shows "+ Create 'X' as custom exercise" button → fires `onChange("__create_custom__:" + query)`. `ExerciseRows` catches `__create_custom__:` prefix → opens modal pre-filled. On success: row exercise name updated, modal closed.

### Files modified
| File | Change |
|------|--------|
| `client/src/App.tsx` | `/goals` route: `Navigate → GoalsPage` |
| `client/src/components/layout/BottomNav.tsx` | Goals added as 4th PRIMARY_ITEM |
| `client/src/components/layout/Sidebar.tsx` | Goals added between Nutrition and AI Coach |
| `client/src/components/layout/ProfileSummaryBar.tsx` | Goal pill onClick → `/goals` |
| `client/src/components/OnboardingModal.tsx` | Post-complete navigate → `/goals` |
| `client/src/pages/goals/GoalsPage.tsx` | `EditGoalModal` component added; Edit button on active goal card |
| `client/src/pages/progress/ProgressPage.tsx` | `<Modal>` + `<LogWeightForm>` JSX added (was missing) |
| `client/src/pages/nutrition/NutritionPage.tsx` | Import comma fix; `weightApi` added; weight FAB added |
| `client/src/pages/workouts/WorkoutsPage.tsx` | `CreateCustomExerciseModal`; ExerciseSearch "create" shortcut; ExerciseRows modal wiring |
| `client/src/api/index.ts` | `customExercisesApi` (list/create/update/delete) |
| `client/src/types/index.ts` | `CustomExercise` interface |
| `prisma/schema.prisma` | `CustomExercise` model + `User.customExercises` relation |
| `src/controllers/calorieGoalController.ts` | Extended `updateCalorieGoal` to accept all goal fields |
| `src/controllers/customExerciseController.ts` | NEW — CRUD for custom exercises |
| `src/controllers/searchController.ts` | Merges user custom exercises into exercise search results |
| `src/routes/customExerciseRoutes.ts` | NEW — 4 routes + authenticate middleware |
| `src/server.ts` | `customExerciseRoutes` registered at `/api/custom-exercises` |
| `src/data/exercises.ts` | ~70 exercises added; MUSCLE_GROUPS updated |

### TypeScript
- `npx tsc --noEmit` — 0 errors (backend)
- `npx tsc --noEmit` — 0 errors (frontend)

---

## 2026-05-01 — Roadmap planning: Pagination + Goals Overhaul

### New tasks registered

| # | Title | Priority | Category | Status |
|---|-------|----------|----------|--------|
| 106 | Pagination — food log history (backend + frontend) | P2 | Infrastructure/UX | pending |
| 107 | Pagination — workout history (backend + frontend) | P2 | Infrastructure/UX | pending |
| 108 | Goals page visual overhaul — active goal card + layout redesign | P1 | UX | pending |
| 109 | Goals — dynamic real-time projection chart in EditGoalModal | P1 | Feature | pending |
| 110 | Goals — realistic goal validator with instant inline warnings | P1 | Feature/Safety | pending |
| 111 | Goals — calorie & macro impact panel (current vs new plan comparison) | P1 | Feature | pending |
| 112 | Goals — AI goal advisor with scientific sources + disclaimers | P2 | AI/ML | pending |
| 113 | Goals — goal creation wizard (from scratch, multi-step) | P1 | Feature | pending |

### Goals overhaul scope notes

**Projection chart (#109):**
- Built with Recharts `ComposedChart` (Line + Area)
- Three series: actual logged weight trend, old plan line, new proposed plan line
- Computed fully client-side via TDEE + deficit math (Mifflin-St Jeor for BMR)
- Updates on every input change with ~150ms debounce — no API round-trips needed
- X-axis: today → target date. Y-axis: weight (kg or lbs per user preference)

**Validator (#110) — evidence-based thresholds:**
- Weight loss > 1% body weight/week → aggressive warning
- Calorie intake < BMR → unsustainable warning (blocks save unless overridden)
- Implied rate > 1.5 kg/week → unrealistic timeline + suggested extension in weeks
- Daily deficit > 1000 kcal → extreme deficit warning
- Weight gain > 0.5 kg/week → aggressive bulk note

**AI advisor (#112) — required output format:**
- Inline medical disclaimer on every response
- Source footnotes: ACSM, WHO, PubMed-linked studies (Mifflin-St Jeor, ISSN protein guidelines, etc.)
- Flags contradictions between suggestion and actual logged behaviour
- Uses existing `/api/chat` coach agent endpoint

**Pagination (#106, #107) — API contract:**
- Query: `?page=1&limit=20`
- Response envelope: `{ data: [...], total: number, page: number, totalPages: number }`
- Frontend: "Load more" button pattern (not infinite scroll) to keep scroll position predictable

---

## 2026-05-01 — Advanced AI system: planning + task registration

### Architecture layers

**Layer 1 — Foundation**
- `buildUserContext(userId)` service (src/services/userContext.ts): structured snapshot of profile, goal, 7-day averages, today's remaining macros, weight trajectory, muscle group frequency, top foods. Injected as system block into every AI call.
- AI function calling tools (src/services/aiTools.ts): `get_today_nutrition()`, `get_weight_trend(days)`, `get_recent_workouts(days)`, `get_goal_progress()`, `suggest_foods(macros_remaining)`. Wired into agent.ts tool-use loop.

**Layer 2 — Specialist agents**
- Nutrition agent (src/agents/nutritionAgent.ts): dietetics system prompt + context injection + suggest_foods tool calls.
- Workout agent (src/agents/workoutAgent.ts): exercise science system prompt + get_recent_workouts tool + progressive overload / recovery analysis.
- Goal advisor upgrade (#118): extends existing goal advisor to use context builder + function tools + science citations.

**Layer 3 — Proactive engine**
- AINotification Prisma model: type enum (daily_checkin, evening_nudge, weekly_digest, goal_milestone, streak_alert, rest_day_warning, overtraining_alert), title, body, ctaRoute, isRead.
- Scheduler jobs: 10am check-in, 6pm evening nudge, Monday digest, goal milestone triggers (25/50/75%), 3-day streak praise, consecutive-workout rest warning.

**Layer 4 — UI surfaces**
- Bell icon + unread badge in ProfileSummaryBar. Slide-in notification panel.
- Dashboard "Coach says…" card — most recent unread notification with Reply CTA.
- AI Coach tab redesign — 3 tabs (Nutrition / Workouts / Goals) each routing to specialist agent, with auto-injected context starter.
- Inline nudges: NutritionPage remaining macro banner + one-tap food suggestions; WorkoutsPage muscle group gap chip.

### New tasks registered

| # | Title | Category | Pri | Depends on | Status |
|---|-------|----------|-----|------------|--------|
| 114 | User context builder — `buildUserContext(userId)` | Infra/AI | P1 | — | pending |
| 115 | AI function calling tools — live DB access mid-conversation | AI/Tools | P1 | 114 | pending |
| 116 | Nutrition specialist agent | AI/ML | P1 | 114, 115 | pending |
| 117 | Workout specialist agent | AI/ML | P1 | 114, 115 | pending |
| 118 | AINotification Prisma model + CRUD backend | Infra | P1 | 114 | pending |
| 119 | Proactive AI scheduler — daily/weekly analysis jobs | AI/Scheduler | P1 | 114, 115, 118 | pending |
| 120 | Notification center UI — bell icon, badge, slide-in panel | UX | P1 | 118 | pending |
| 121 | Dashboard "Coach insight" card | UX | P1 | 118, 119 | pending |
| 122 | AI Coach page redesign — 3 specialist tabs | UX | P2 | 116, 117 | pending |
| 123 | Inline smart suggestions on Nutrition + Workout pages | UX | P2 | 115, 116, 117 | pending |

### Implementation order

114 → 115 → (116 + 117 in parallel) → 118 → 119 → (120 + 121 in parallel) → 122 → 123


---

## 2026-05-01 — Design review: corrections and new tasks

### Design decisions revised

| Decision | Before | After | Reason |
|----------|--------|-------|--------|
| AI tab selection | User picks Nutrition/Workouts/Goals tab before asking | Silent routing — AI classifies intent, tab just shows which expert answered | Forcing categorisation adds friction when user is confused or struggling |
| RAG / embeddings (#84) | Planned for v1 | Deferred post-v1 | Context injection + function tools + last-20-message memory covers 95% of cases without vector DB |
| Provider abstraction (#124) | Nice-to-have | Hard blocker on function tools (#115) | OpenAI and Anthropic use incompatible tool schemas — writing tools first means a full rewrite when abstraction is added |
| Shared goal components | Build inside modal, duplicate in wizard | Extract ProjectionChart, GoalValidator, ImpactPanel as standalone components first (#126) | #109/#110/#111 and #113 share ~80% of the same logic |
| Dashboard coach card (#121) | Always visible, full-height card | Collapsed to one line by default, expand on tap; fully expanded only when time-sensitive | Prevents burying real dashboard data under AI banner (banner blindness) |
| Food log pagination (#106) | Standard page/offset | Date-cursor (before=DATE) | Page-number splits days across pages with no clean fix at render layer |
| Proactive AI (#119, #125) | On by default | Opt-in per type, all off by default | Unsolicited daily notifications are the fastest way to get an app uninstalled |
| Custom exercise discovery (#127) | Only appears on search no-results | Visible "+ Custom" button as primary entry, no-results remains as shortcut | Feature invisible to users who haven't searched for something obscure |
| Scheduler timezone | Implicit UTC | User timezone stored in profile, all cron times converted to UTC before registration | Railway runs UTC; 6pm nudge fires at 1pm for NYC users without this |

### New tasks registered from design review

| # | Title | Category | Pri | Blocks | Status |
|---|-------|----------|-----|--------|--------|
| 124 | AI provider abstraction (ProviderAdapter interface, OpenAI/Anthropic/DeepSeek impls) | AI/Infra | P1 | #115 | pending |
| 125 | Proactive notification preferences — per-type toggles + timezone in settings | UX/Infra | P1 | #119 | pending |
| 126 | Extract shared goal UI components (ProjectionChart, GoalValidator, ImpactPanel) | Infra/UX | P1 | #109,#110,#111,#113 | pending |
| 127 | Add visible "+ Custom exercise" entry point in WorkoutsPage | UX | P2 | — | pending |

---

## 2026-05-01 — Critical bug: daily reset + calories burned

### Root causes

**Daily data never resetting:**
Every "today" boundary in every controller used UTC midnight (`setHours(0,0,0,0)` / `T00:00:00.000Z`) with no user timezone awareness. For a user in UTC+5:30, "today" on the server started 5.5 hours before their actual midnight. No 4am rollover existed anywhere. Water, food logs, supplements, and calorie totals were all affected.

**Calories burned never shown:**
`caloriesBurned` column existed on the Workout model and was already rendered on workout cards, but was never auto-calculated — only populated if the user manually typed a number into the optional field. In practice, nobody filled it in, so it was always null/hidden.

### Fixes implemented

**`src/utils/dayBounds.ts`** (new file)
- `getDayBounds(tz, rolloverHour=4)` — computes UTC `{ start, end, dateStr }` for the user's current "day" with a 4am local rollover
- Uses `Intl.DateTimeFormat` + timezone offset via the noon-UTC trick (avoids DST edge cases — DST transitions happen at ~2am, not noon)
- If local hour < 4 → effective date = yesterday. Day window = 04:00 local → 03:59:59 next morning.
- `tzFromRequest(headers)` — reads `X-Timezone` header, validates it, falls back to `"UTC"` on invalid IANA string
- Falls back gracefully to UTC if timezone is missing or unrecognisable

**`client/src/api/axios.ts`**
- Added `X-Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone` to every outgoing request via the existing request interceptor

**`src/controllers/dashboardController.ts`**
- Reads `X-Timezone` header via `tzFromRequest()`
- `startOfToday` / `endOfToday` replaced with `getDayBounds(tz)` — feeds all food log, water, and workout queries
- `todayHasWorkout` now compares against `todayStr` (effective date) instead of `now.toISOString().split("T")[0]` (UTC date)
- Added parallel fetch: `prisma.workout.findMany` for today's workouts → sums `caloriesBurned`
- `today.caloriesBurned` added to dashboard response

**`src/controllers/foodController.ts`**
- Reads timezone header; when no `date` param, uses `getDayBounds(tz)` for "today"
- Historical date browsing (explicit `date` param) still uses plain UTC midnight — correct for browsing past days
- `getFoodLogs` now also queries today's workout `caloriesBurned` and returns it: `{ logs, totals, caloriesBurned, date }`

**`src/controllers/waterController.ts`**
- `logWater`: when no `date` in body, uses `getDayBounds(tz).dateStr` as the effective date
- `getToday`: when no `date` query param, uses `getDayBounds(tz)` bounds

**`src/controllers/workoutController.ts`**
- MET lookup table: strength 5.0, cardio 8.0, HIIT 10.0, endurance 7.0, yoga/flexibility 2.5, crossfit 8.5
- `estimateCaloriesBurned(durationMin, weightKg, trainingType)` → `MET × weight × (min/60)`, rounded
- `createWorkout`: if `caloriesBurned` not in request body, fetches user weight and auto-estimates; stored on Workout row
- New export: `getCaloriesBurned(req)` — `GET /api/workouts/calories-burned?date=YYYY-MM-DD`; returns `{ date, totalBurned, workouts[] }`

**`src/routes/workouts.ts`**
- `GET /api/workouts/calories-burned` registered (before `/:id` to avoid param clash)

**`client/src/api/index.ts`**
- `workoutsApi.getCaloriesBurned(date?)` added

**`client/src/pages/nutrition/NutritionPage.tsx`**
- `getEffectiveToday()` helper: if `getHours() < 4` returns yesterday's date string, otherwise today's
- Date state init uses `getEffectiveToday()` instead of raw `new Date().toISOString()`
- `isToday` and date picker `max` also use `getEffectiveToday()`
- `load()` now also calls `workoutsApi.getCaloriesBurned(date)` in the parallel fetch
- `caloriesBurned` state displayed in the Calories card: "-X kcal burned" in orange + "Net: Y kcal" in muted text

### Files modified
| File | Change |
|------|--------|
| `src/utils/dayBounds.ts` | NEW — `getDayBounds()` + `tzFromRequest()` |
| `client/src/api/axios.ts` | `X-Timezone` header on every request |
| `src/controllers/dashboardController.ts` | `getDayBounds()` for all "today" boundaries; `caloriesBurned` in response |
| `src/controllers/foodController.ts` | `getDayBounds()` for default date; returns `caloriesBurned` |
| `src/controllers/waterController.ts` | `getDayBounds()` in logWater + getToday |
| `src/controllers/workoutController.ts` | MET table; auto-estimate on create; `getCaloriesBurned` endpoint |
| `src/routes/workouts.ts` | `GET /calories-burned` registered |
| `client/src/api/index.ts` | `workoutsApi.getCaloriesBurned()` |
| `client/src/pages/nutrition/NutritionPage.tsx` | 4am rollover date default; burned/net display in Calories card |

### TypeScript
- `npx tsc --noEmit` — 0 errors (backend)
- `npx tsc --noEmit` — 0 errors (frontend)

## 2026-05-01 — Session (continued)

| # | Task | Status |
|---|------|--------|
| 131 | Calories burned — prominent display + inline edit in WorkoutsPage | ✅ |
| 130 | i18n — Spanish language support + language picker in Profile | ✅ |
| 133 | Exercise library expansion (Brachialis, extended Glutes/Traps, Push/Pull/Upper/Lower groupings) | ✅ |

**Calories burned UX (#131):**
- `quickEstimateKcal()` auto-fills WorkoutForm calories field live (MET × weight × hours); `caloriesIsAuto` flag, reset link if manually overridden
- WorkoutDetail: orange `🔥 X kcal burned` pill → click → inline number input → save without reopening modal; `kcalValue` state updated immediately
- NutritionPage: burned total is clickable, expands to per-workout breakdown

**i18n (#130):**
- Zero-dependency custom system (npm blocked in sandbox), mirrors react-i18next API
- `Translation` interface typed in `en.ts`; `es.ts` implements same interface
- `I18nProvider` wraps app; `useTranslation()` hook used in Sidebar + BottomNav
- Language picker (🇬🇧/🇪🇸 toggle) in Profile → App Preferences section
- `X-Language` header sent on every axios request; `chatController` reads it and injects into `UserContext.language`; AI system prompt instructs full Spanish response (exercise names stay in English)

**Exercise library (#133):**
- Brachialis: 6 exercises (Hammer Curl primary, Cross-Body Hammer, Reverse Curl, Zottman, Cable + Rope variations)
- Glutes extended: 8 exercises (Abduction Machine, Banded Side Walk, Cable Hip Abduction, Step-Up, Clamshell, Nordic Curl, Reverse Hyper, Lateral Band Walk)
- Traps extended: 4 exercises (Snatch-Grip DL, Trap Bar Shrug, Meadows Row, High Pull)
- `COMPOUND_GROUP_MAP` in exercises.ts: Push/Pull/Upper Body/Lower Body → array of primaryMuscle values
- searchController DB path + custom exercise filter both expanded to use compound map
- All muscle group chip arrays updated in WorkoutsPage (compound chips at top)

**TypeScript:** 0 errors front + back after all changes.

## 2026-05-02 — Session 2

| # | Task | Status |
|---|------|--------|
| — | Offline support (PWA) | ✅ |
| — | NutritionPage toasts + silent refresh | ✅ |
| — | WorkoutsPage toasts | ✅ |
| — | Foods database: 409 → 521 items | ✅ |
| — | Food AI-translation (`?lang=`) | ✅ |
| — | Locale-aware dates (`dateFormat.ts`) | ✅ |
| — | Weight sync + toasts across all pages | ✅ |
| — | Workout template frequency filter | ✅ |
| — | Dashboard FAB fixes + toast | ✅ |

---

### Offline support (PWA)

**`public/sw.js`** — API caching with stale-while-revalidate strategy; GET `/api/*` responses cached in `api-cache-v1`; POST/PUT/DELETE requests queued in IndexedDB when offline.

**`client/src/lib/idb.ts`** — IndexedDB sync queue (`fitai-offline-queue`); `enqueue(req)`, `dequeue()`, `getAll()`, `clear()`, `count()` helpers.

**`client/src/store/offlineStore.ts`** — Zustand store tracking `isOnline`, `pendingCount`, `isSyncing`; `syncPending()` action replays queued requests.

**`client/src/hooks/useOfflineSync.ts`** — Registers `online`/`offline` listeners, auto-syncs on reconnect, updates pending count on interval.

**`client/src/api/index.ts`** — Axios interceptor: when offline, intercepts mutating requests and enqueues them instead of throwing; returns optimistic `{ queued: true }`.

**`client/src/components/OfflineBanner.tsx`** — Shows pending count badge; "Sync now" button triggers `syncPending()`; hides when online + no pending.

---

### NutritionPage toasts + silent refresh

**Problem:** Every post-action `load()` call set `setLoading(true)`, causing the food list to flash a spinner even for in-place updates.

**Fix — `silentLoad`:** Added alongside `load()`; fetches all data but never sets `loading`, so the list stays visible and items appear in-place.

**Toast system:** `useNutritionToast()` + `<NutritionToastBanner>` added above `export default`. All 6 action callbacks (log food, update entry, delete, relog fav, quick relog, meal plan, build dish) show toasts and call `silentLoad()`.

**`fitai:food-logged` event:** Dispatched after every mutation; `silentLoad` listener in `useEffect` keeps the list fresh when other tabs/components mutate food data.

**State capture bug fixed:** `const msg = editItem ? "Entry updated ✓" : "Food logged ✓"` captured before `setEditItem(null)` to avoid stale closure read.

---

### WorkoutsPage toasts

Added `onToast?: (msg: string) => void` prop to `WorkoutDetail`; `saveEdit`, `deleteExercise`, `handleExerciseAdded` call `onToast?.("…")` on success. Call site passes `onToast={toast.show}`.

---

### Foods database: 409 → 521 items

New categories added (IDs f600–f767):
- Fruits: f600–f611 (mango, watermelon, pineapple, grapes, strawberries, blueberries, raspberries, peach, plum, kiwi, papaya, cantaloupe)
- Vegetables: f620–f632 (spinach, kale, broccoli, cauliflower, bell pepper, cucumber, zucchini, tomato, carrot, sweet potato, asparagus, mushrooms, celery)
- Grains: f640–f648 (quinoa, bulgur, farro, barley, amaranth, millet, buckwheat, spelt, oat bran)
- Sauces/Condiments: f660–f678 (olive oil, coconut oil, soy sauce, hot sauce, mustard, ketchup, mayo, BBQ, hummus, guacamole, peanut butter, almond butter, tahini, honey, maple syrup, salsa, ranch, balsamic vinegar, tzatziki)
- Light dairy: f690–f699 (Greek yogurt 0%, cottage cheese 1%, skim milk, ricotta part-skim, kefir, string cheese, provolone, Swiss, gouda, Parmesan)
- Breads: f700–f708 (sourdough, rye, pumpernickel, multigrain, ciabatta, brioche, naan, pita, English muffin)
- Pastas: f710–f723 (spaghetti, penne, fettuccine, rigatoni, farfalle, linguine, orzo, macaroni, rotini, angel hair, lasagna, tortellini, gnocchi, couscous)
- Rice varieties: f730–f733 (brown rice, jasmine rice, basmati rice, wild rice)
- Legumes: f740–f749 (lentils, black beans, kidney beans, chickpeas, navy beans, pinto beans, edamame, split peas, mung beans, adzuki beans)
- Breakfast/snack carbs: f750–f767 (granola, muesli, corn flakes, bran flakes, Cheerios, Special K, shredded wheat, cream of wheat, grits, polenta, rice cakes, popcorn, pretzels, graham crackers, animal crackers, vanilla wafers, saltine crackers, wasa crispbread)

**Bugs fixed:** Orphaned entries outside the array (after `];`) caused TS errors; fixed with Python slice-and-reattach.

---

### Food AI-translation (`?lang=`)

**`src/controllers/searchController.ts`**
- Added `translateQueryToEnglish(query, sourceLang)`: calls AI provider with a minimal system prompt; returns translated string (original on error); Redis-cached 1h.
- Added `translateFoodNames(names[], targetLang)`: batches all result names in one AI call; parses JSON array response; Redis-cached 1h.
- `foodSearch` handler now reads `req.query.lang`; translates query to English before search (cache key stays English so one cache serves all languages); applies `translateFoodNames` on the way out.
- `getProvider()` imported from `ai/providers/index.js`.

**`client/src/api/index.ts`**
- `searchApi.foods(q, limit, tags, lang?)` — appends `&lang=xx` when `lang !== "en"`.

**`client/src/pages/nutrition/NutritionPage.tsx`**
- `FoodSearch`, `CustomFoodForm`, main `NutritionPage` all destructure `i18n` from `useTranslation()`.
- All three `searchApi.foods()` call sites pass `i18n.language`; dependency arrays include `i18n.language`.

---

### Locale-aware dates (`dateFormat.ts`)

**`client/src/lib/dateFormat.ts`** — NEW file. Module-level `_lang` kept in sync by `setDateFormatLang(lang)`. Exports:
- `fmtMonthDay` — "Jan 5"
- `fmtLongMonthDay` — "January 5"
- `fmtMonthDayYear` — "Jan 5, 2025"
- `fmtMonthYear` — "January 2025"
- `fmtWeekdayFullDate` — "Saturday, January 5, 2025"
- `fmtWeekdayLongDate` — "Saturday, January 5"
- `fmtWeekdayShortDate` — "Sat, Jan 5"

**`client/src/i18n/index.tsx`** — `I18nProvider` now calls `setDateFormatLang(l)` on mount and `setDateFormatLang(lang)` in `changeLanguage`.

All `format(…, "MMM…")`, `format(…, "MMMM…")`, `format(…, "EEEE…")` calls replaced across: Dashboard, ProgressPage, NutritionPage, WorkoutsPage, GoalsPage, MealPlannerPage, WeeklyPlanWidget, ProjectionChart.

---

### Weight sync + toasts across all pages

**`fitai:weight-logged` CustomEvent** — dispatched by: Dashboard FAB, NutritionPage FAB, ProgressPage LogWeightForm, SettingsPage profile save (when weight field changed).

**Listeners:** Dashboard (`refreshDash()`), ProgressPage (`load()`).

**Toasts:**
- Dashboard FAB: `"Weight logged: X kg ✓"`
- NutritionPage FAB: `"Weight logged: X kg ✓"`
- SettingsPage: `"Weight updated to X kg ✓"` (only shown when weight value actually changed)

**SettingsPage fix:** `toLocaleDateString("en-US", …)` → `toLocaleDateString(undefined, …)` (uses browser locale); detects weight change by comparing `user?.weight` before and after save.

---

### Workout template frequency filter

**`client/src/pages/workouts/WorkoutsPage.tsx` — `TemplatesTab`**

```tsx
const filteredGrouped = Object.fromEntries(
  Object.entries(grouped).map(([key, tpls]) => {
    const matched = tpls.filter((tp) => tp.frequency === trainingDays);
    return [key, matched.length > 0 ? matched : tpls]; // fallback: show all
  })
);
```

Info chip shown when a frequency match exists: "Showing plans for N×/week — matching your profile setting".

---

### Dashboard FAB fixes + toast

- Empty-state "Log your weight" button in weight trend card now calls `setShowWeightFab(true)` instead of `navigate("/progress")` — eliminates the confusing left-side button.
- `showToast()` + `<ToastBanner>` added to Dashboard component.
- `handleLogWeight` calls `showToast(\`Weight logged: ${w} kg ✓\`)` before dispatching event.
- File truncation bug: Dashboard.tsx was truncated at 44KB during editing; restored from `git show HEAD` + appended correct closing JSX.

### TypeScript
`npx tsc --noEmit` — 0 errors (frontend + backend) after all changes.

### Files modified
| File | Change |
|------|--------|
| `public/sw.js` | API cache + offline queue |
| `client/src/lib/idb.ts` | NEW — IndexedDB sync queue |
| `client/src/store/offlineStore.ts` | NEW — Zustand offline store |
| `client/src/hooks/useOfflineSync.ts` | NEW — sync hook |
| `client/src/lib/dateFormat.ts` | NEW — locale-aware date helpers |
| `client/src/api/index.ts` | Offline interceptor; `searchApi.foods` lang param |
| `client/src/i18n/index.tsx` | `setDateFormatLang` sync on mount + changeLanguage |
| `client/src/components/OfflineBanner.tsx` | Pending count + sync button |
| `client/src/pages/dashboard/Dashboard.tsx` | Toast, FAB fix, locale dates, weight event |
| `client/src/pages/nutrition/NutritionPage.tsx` | silentLoad, toasts, food translation, locale dates |
| `client/src/pages/progress/ProgressPage.tsx` | weight event listener, locale dates |
| `client/src/pages/settings/SettingsPage.tsx` | weight event dispatch, toast, locale date |
| `client/src/pages/workouts/WorkoutsPage.tsx` | toasts, template filter, locale dates |
| `client/src/pages/goals/GoalsPage.tsx` | locale dates |
| `client/src/pages/mealplanner/MealPlannerPage.tsx` | locale dates |
| `client/src/components/WeeklyPlanWidget.tsx` | locale dates |
| `client/src/components/goals/ProjectionChart.tsx` | locale dates |
| `src/data/foods.ts` | 409 → 521 items |
| `src/controllers/searchController.ts` | AI food translation, lang param |
---

## 2026-05-03 - Weight sync overhaul

### Goal
- Make the profile weight, dashboard weight FAB, nutrition weight FAB, and progress weight logs all behave like one shared current-weight source of truth.

### Files modified
- `src/lib/weightSync.ts` - added shared helpers for current-day weight logging, day normalization, duplicate-day lookup, and latest-weight syncing
- `src/controllers/weightController.ts` - same-day weight logs now overwrite the existing entry for that day, and create/update/delete now resync `User.weight`
- `src/controllers/userController.ts` - profile weight changes now log today’s weight instead of only writing the profile field directly
- `client/src/pages/settings/SettingsPage.tsx` - added a confirmation modal before logging a new current weight from profile settings
- `client/src/pages/dashboard/Dashboard.tsx` - emits shared weight sync events after log/edit/delete
- `client/src/pages/progress/ProgressPage.tsx` - emits shared weight sync events after log/edit/delete
- `client/src/pages/nutrition/NutritionPage.tsx` - emits shared weight sync events after logging weight
- `client/src/components/layout/Layout.tsx` - listens for weight sync events and refreshes the auth profile store
- `client/src/lib/appEvents.ts` - made `emitWeightLogged()` usable with or without a weight payload

### Notes
- Weight logging is now treated as a daily overwrite flow instead of a loose profile field edit.
- Same-day logs are collapsed into one entry, and the latest log always becomes the user’s current profile weight.
- Settings now asks for confirmation with: `Are you sure you want to log this as your current weight?`

---

## 2026-05-03 - Dynamic refresh + food localization

### Goal
- Make the core tabs refresh through shared app events and expand the food catalog with more exact single-item staples plus a database-backed localization layer.

### Files modified
- `src/data/foods.ts` - added exact single-item foods and beverage staples; bumped `FOOD_DB_VERSION` to `2026-05-03-staples-v6`
- `src/controllers/searchController.ts` - added locale-aware food name output with DB-backed localized names and AI fallback
- `src/lib/appEvents.ts` - added a shared `dataChanged` event used to fan out refreshes
- `client/src/components/layout/Layout.tsx` - now refreshes the auth profile on shared data changes
- `client/src/components/layout/ProfileSummaryBar.tsx` - now refetches on shared data changes
- `client/src/pages/dashboard/Dashboard.tsx` - now refreshes on shared data changes
- `client/src/pages/progress/ProgressPage.tsx` - now refreshes on shared data changes
- `client/src/pages/settings/SettingsPage.tsx` - weight changes still confirm before logging as current weight

### Notes
- Added exact entries for `Egg (whole, 1)`, `Egg White (1)`, `Apple Juice (1 cup)`, and `Coffee (black)`.
- The food catalog now stores optional localized names so the API can prefer a translated DB string before falling back to AI translation.
- Shared `dataChanged` events reduce the amount of page-specific manual refresh glue.

---

## 2026-05-03 - Latin / Indian staples + branded supermarket foods

### Goal
- Expand the food DB again with the kinds of foods people actually search and type: Latin/Hispanic staples, Indian/South Asian staples, and more branded supermarket-style convenience items like cereal cups, snack packs, and frozen meals.

### Files modified
- `src/data/foods.ts` - added a new cuisine/convenience block; bumped `FOOD_DB_VERSION` to `2026-05-03-staples-v5`
- `client/src/pages/nutrition/NutritionPage.tsx` - added `Latin / Hispanic`, `Indian`, and `South Asian` cuisine filter chips
- `client/src/i18n/locales/en.ts` - added `nutrition.tagLatin`, `nutrition.tagIndian`, `nutrition.tagSouthAsian`
- `client/src/i18n/locales/es.ts` - added the same new tag labels in Spanish

### Notes
- The new foods lean into high-frequency user queries rather than niche items.
- Latin/Hispanic coverage now includes tacos, enchiladas, empanadas, tamales, pupusas, arepas, bowls, and rice/bean staples.
- Indian/South Asian coverage now includes curries, dal, biryani, naan, roti, samosas, paneer dishes, dosa, and idli.
- The branded supermarket pass covers cereal cups, oatmeal cups, yogurt tubes, applesauce pouches, pudding cups, microwave popcorn, snack packs, frozen burritos, and frozen pizza slices.

---

## 2026-05-03 - Food catalog expansion + gluten-free filters + DB version stamp

### Goal
- Expand the food catalog with the kinds of items users actually type, especially convenience foods, packaged grab-and-go snacks, sandwiches, seafood, dairy alternatives, and gluten-free staples. Add a small Nutrition page version stamp so it is obvious when the newest food DB is loaded.

### Files modified
- `src/data/foods.ts` - added a large new block of common staples and convenience foods, plus aliases and more `gluten-free` tags; exported `FOOD_DB_VERSION` and `FOOD_DB_LABEL`
- `client/src/pages/nutrition/NutritionPage.tsx` - added a small food DB version note under the page header; added the `gluten-free` filter chip
- `client/src/i18n/locales/en.ts` - added `nutrition.tagGlutenFree`
- `client/src/i18n/locales/es.ts` - added `nutrition.tagGlutenFree`

### Notes
- This pass focused on everyday foods people actually type: exact single-item names, packaged convenience foods, sandwiches, seafood, dairy, and dairy alternatives.
- The version stamp on Nutrition helps confirm that the newest catalog build is loaded after a deploy or cache refresh.

---

## 2026-05-03 - Adaptive goals, predictions, analytics, and weekly coach review

### Goal
- Turn Goals/Progress/Predictions/Analytics into a plan-vs-reality system that works for everyday users while exposing optional elite-athlete diagnostics as more data is logged.

### Files modified
- `src/controllers/predictionController.ts` - added timezone-aware day bucketing plus `idealPath`, `actualPath`, `smoothedActualPath`, `adaptivePath`, `toleranceBand`, `responseFactor`, `planDeviation`, `etaDrift`, `trendConfidence`, `goalAggressiveness`, `goalChallenge`, `recommendedAdjustment`, and `insights`
- `src/controllers/analyticsController.ts` - added timezone-aware grouping and diagnostic outputs for calorie adherence, protein adherence, workout adherence, logging consistency, weight velocity, and trend confidence
- `src/controllers/weeklyReviewController.ts` and `src/routes/weeklyReview.ts` - added current/history/save/apply weekly review endpoints
- `prisma/schema.prisma` and `src/lib/runMigrations.ts` - added `User.planAdjustmentMode` and `WeeklyReview`
- `client/src/pages/progress/ProgressPage.tsx` - added adaptive forecast line, coach recommendation panel, diagnostic cards, prediction refresh on shared data changes, and weekly coach review card
- `client/src/pages/goals/GoalsPage.tsx` - added goal realism, required pace, current pace, adaptive ETA, and aggressive-date warning
- `client/src/pages/settings/SettingsPage.tsx` - added adaptive adjustment mode setting: `suggest`, `confirm`, `auto`
- `client/src/api/index.ts` and `client/src/types/index.ts` - added weekly review API client, analytics diagnostics type, and `planAdjustmentMode`
- `src/ai/context.ts` and `src/ai/prompts.ts` - included adjustment mode in AI context

### Behavior changes
- The ideal goal model stays separate from the adaptive model so users can see both the original plan and how their body is responding in practice.
- The Predictions tab can now show actual trend, ideal plan, and adaptive forecast as separate lines.
- Confirm mode can apply a calorie adjustment after explicit user action.
- Auto mode can apply bounded calorie/macro adjustments when confidence is high, but it never changes goal dates automatically.
- Goal date postponement is suggestion-only and appears when the adaptive model says the current deadline is too aggressive.
- Weekly coach review is computed mostly from existing daily logs, with optional athlete-level recovery fields supported by the backend.
