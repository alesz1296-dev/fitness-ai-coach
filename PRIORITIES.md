# FitAI Coach — Task Priorities

_Last updated: 2026-05-02 (session 2)_

> Format: **P1** = must-ship · **P2** = high value · **P3** = deferred/nice-to-have

---

## DONE — COMPLETED THIS SESSION / PREVIOUSLY

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| — | Full i18n Spanish translation — all pages, hooks, day labels (Intl), chat starters | i18n | P1 | ✅ Done |
| — | Dashboard: macro labels, consumed, chart legend, day-rest, quick actions all dynamic | i18n | P1 | ✅ Done |
| — | WeeklyPlanWidget: Intl day abbreviations, edit schedule, sync to calendar | i18n | P1 | ✅ Done |
| — | ChatPage: suggested starter prompts dynamic per locale | i18n | P1 | ✅ Done |
| C1 | Delete stale `authController_clean.ts` | Security | P1 | ✅ Done |
| C2 | Rotate `POSTGRES_PASSWORD` + GitGuardian remediation | Security | P1 | ✅ Done |
| C3 | Forgot password / reset flow | Auth | P1 | ✅ Done |
| C4 | Email verification | Auth | P1 | ✅ Done |
| H2 | Env validation on startup (Zod) | Infra | P1 | ✅ Done |
| H5 | 4 controllers bypass Zod — mealPlan, report, template, workout | Backend | P1 | ✅ Done |
| H6 | Remove 36 `any` types in backend | Code Quality | P2 | ✅ Done |
| H7 | App Store PWA submission (iOS) | Mobile | P2 | ✅ Done |
| M3 | Supplement entry editing (Protein Shake editable modal) | Nutrition | P2 | ✅ Done |
| M5 | Weekly plan → workout link on day-complete | Weekly Plan | P2 | ✅ Done |
| M6 | Meal plan save as template | Nutrition | P2 | ✅ Done |
| M9 | Workout training-type support (Strength/Endurance/Hypertrophy) | Workouts | P2 | ✅ Done |
| M10 | Exercise database expansion (Glutes, Traps, Abs) | Data | P2 | ✅ Done |
| M11 | Agent write tools — `log_food` + `save_workout_template` | AI/Tools | P2 | ✅ Done |
| M15 | Weight trend chart — extend history window + close projection gap | Dashboard | P2 | ✅ Done |
| L1 | Quick re-log on Nutrition page (top-5 frequent foods) | Nutrition | P2 | ✅ Done |
| — | Offline support — sw.js API caching, IndexedDB sync queue, Zustand offline store, `useOfflineSync` hook, axios interceptor, OfflineBanner with pending count | PWA/Infra | P1 | ✅ Done |
| — | NutritionPage: toasts on every food/meal action + `silentLoad` (no spinner flash, immediate in-place refresh) | UX | P1 | ✅ Done |
| — | WorkoutsPage: toasts on exercise add / edit / delete | UX | P1 | ✅ Done |
| — | Foods database expansion — 521 items total: eggs, breads, pastas, rice varieties, beans/legumes, fruits, veg, sauces, light dairy, breakfast carbs | Data | P2 | ✅ Done |
| — | Food AI-translation — `?lang=` param on `/api/search/foods`; query translated to English, results translated back via AI provider; Redis-cached per lang | i18n/AI | P2 | ✅ Done |
| — | Locale-aware dates — `dateFormat.ts` utility (`Intl.DateTimeFormat`); replaces all `format(…,"MMM…")` date-fns calls across Dashboard, Progress, Nutrition, Workouts, Goals, MealPlanner, WeeklyPlanWidget, ProjectionChart | i18n | P2 | ✅ Done |
| — | Weight sync across pages — `fitai:weight-logged` CustomEvent; Dashboard + Progress refresh on any weight log; toasts on Dashboard FAB, Nutrition FAB, Settings profile save, ProgressPage | UX | P1 | ✅ Done |
| — | Goals weight trend chart live-updates when weight is logged from any page | Feature | P1 | ✅ Done |
| — | Workout templates filtered by `trainingDaysPerWeek` — exact-match filter with all-templates fallback; info chip shown when match found | UX | P2 | ✅ Done |
| — | Dashboard weight FAB: empty-state card button now opens FAB (not nav away); toast added; file truncation bug fixed | UX | P2 | ✅ Done |

---

## PENDING — FOUNDATION (BUILD FIRST)

_These block the AI Agents, Proactive Engine, and Goals Overhaul sections below._

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 124 | AI provider abstraction — ProviderAdapter interface, OpenAI / DeepSeek impls. | AI/Infra | P1 | ✅ Done |
| 114 | User context builder — `buildUserContext(userId)` + AgentMessage conversation memory (last 20 msgs per agent thread). ⚠️ Run `prisma migrate deploy && prisma generate` | AI/Infra | P1 | ✅ Done |
| 115 | AI function calling tools — `get_today_nutrition`, `get_weight_trend`, `get_recent_workouts`, `get_goal_progress`, `suggest_foods`. Write tools un-stubbed. | AI/Tools | P1 | ✅ Done |
| 126 | Extract shared goal UI components — ProjectionChart, GoalValidator, ImpactPanel (reused by modal + wizard). | Infra/UX | P1 | ✅ Done |

---

## PENDING — GOALS OVERHAUL

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 108 | Goals page visual overhaul — progress ring, days countdown, weekly pace, gradient cards, empty state CTA | UX | P1 | ⏳ Pending |
| 109 | Goals — real-time projection chart in EditGoalModal (actual trend vs old plan vs new plan, debounced). _Requires #126_ | Feature | P1 | ⏳ Pending |
| 110 | Goals — realistic goal validator with inline warnings (below BMR, >1%/wk loss, >1000 kcal deficit). _Requires #126_ | Feature/Safety | P1 | ⏳ Pending |
| 111 | Goals — calorie & macro impact panel: current vs new plan, color-coded diffs, live-updating. _Requires #126_ | Feature | P1 | ⏳ Pending |
| 113 | Goals — multi-step creation wizard: body stats → goal type → target + live chart → macro split → save. _Requires #126_ | Feature | P1 | ⏳ Pending |
| 112 | Goals — AI goal advisor with scientific sources (ACSM, WHO, PubMed) + mandatory medical disclaimer. _Requires #114, #115_ | AI/ML | P2 | ⏳ Pending |

---

## PENDING — AI AGENTS

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 116 | Nutrition specialist agent — dietetics system prompt, context injection, `suggest_foods` tool calls. _Requires #114, #115_ | AI/ML | P1 | ⏳ Pending |
| 117 | Workout specialist agent — exercise science prompt, `get_recent_workouts` tool, overload + recovery analysis. _Requires #114, #115_ | AI/ML | P1 | ⏳ Pending |
| 122 | AI Coach page — 3 specialist tabs, silent query routing, remove general chat, per-tab conversation history. _Requires #116, #117_ | UX | P1 | ⏳ Pending |
| 123 | Inline smart suggestions — Nutrition remaining macro banner + one-tap foods; Workout muscle gap chip. _Requires #115, #116, #117_ | UX | P2 | ⏳ Pending |

---

## PENDING — PROACTIVE ENGINE

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 118 | AINotification Prisma model + CRUD backend (list, markRead, markAllRead, dismiss). _Requires #114_ | Infra | P1 | ⏳ Pending |
| 125 | Proactive notification preferences — per-type toggles + user timezone in Settings (all off by default). _Blocks #119 (scheduler)_ | UX/Infra | P1 | ⏳ Pending |
| 119 | Proactive AI scheduler — opt-in, per-type, timezone-aware: morning check-in, evening nudge, weekly digest, milestones, streaks. _Requires #114, #115, #118, #125_ | AI/Scheduler | P1 | ⏳ Pending |
| 120 | Notification center UI — bell icon + unread badge in top nav, slide-in panel, mark read, dismiss. _Requires #118_ | UX | P1 | ⏳ Pending |
| 121 | Dashboard "Coach insight" card — collapsed single line by default, expand on tap, auto-expanded only when time-sensitive. _Requires #118, #119_ | UX | P1 | ⏳ Pending |

---

## PENDING — INFRASTRUCTURE & UX FIXES

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 71 | Add dynamic editable weight prediction graph to ProgressPage | Feature | P2 | ⏳ Pending |
| 85 | Backend: startup env validation (Zod) — env.ts already exists, verify completeness | Infra | P2 | ⏳ Pending |
| 106 | Pagination — food log history, date-cursor based (before=DATE, keeps day groups intact) | Infra/UX | P2 | ⏳ Pending |
| 107 | Pagination — workout history, standard offset (page + limit on History tab) | Infra/UX | P2 | ⏳ Pending |
| 127 | Add visible "+ Custom exercise" button as primary entry point in WorkoutsPage (not just no-results state) | UX | P2 | ⏳ Pending |
| — | Stretching & Mobility + Warm-up as dedicated workout categories (filter, builder, rest timer skip) | Feature | P2 | ⏳ Pending |
| — | CI/CD pipeline — GitHub Actions: lint → `tsc --noEmit` → `prisma validate` → build | DevOps | P2 | ⏳ Pending |
| — | DB indexes — `@@index` on `FoodLog(userId,date)`, `Workout(userId,date)`, `WeightEntry(userId,date)` | Backend | P2 | ⏳ Pending |
| — | Request timeout middleware — 503 after 30 s (OpenAI calls can hang) | Backend | P2 | ⏳ Pending |
| — | OpenAI extended error handling — context length, model not found, 503, timeout | Backend | P2 | ⏳ Pending |
| — | SSE streaming chat responses (cuts perceived latency from 3–8 s to instant) | AI/UX | P2 | ⏳ Pending |
| — | Optimistic UI — toggle rest day, tick set: instant update + rollback on error | Frontend | P2 | ⏳ Pending |
| — | Store suggested JSON in Conversation row (`suggestedWorkoutJson` etc.) | Backend | P2 | ⏳ Pending |
| — | Connection pooling — PgBouncer or Prisma Accelerate before public load | Infra | P2 | ⏳ Pending |
| — | Admin dashboard — role-gated `/admin`: active users, workouts/day, AI usage, error rates | Internal | P3 | ⏳ Pending |
| — | Push notifications / streak reminders (PWA push or email) | Engagement | P3 | ⏳ Pending |
| 84 | AI: embeddings + RAG for long-term memory — deferred post-v1 | AI/ML | P3 | 🗂️ Deferred |

---

## PENDING — BIG FEATURES (Plan separately)

| # | Task | Category | Pri | Status | Notes |
|---|------|----------|-----|--------|-------|
| B1 | Apple Health / HealthKit integration — steps, HR, active calories, sleep | Health Platform | P2 | 🗂️ Deferred | Requires Capacitor plugin or RN rewrite |
| B2 | Apple Watch companion app — log sets in-session from wrist | Wearable | P3 | 🗂️ Deferred | Requires native WatchKit + Capacitor or full RN rewrite |
| B3 | Samsung Health integration — Android equivalent of B1 | Health Platform | P2 | ⏳ Pending | Samsung Health SDK + Capacitor plugin |
| B4 | Barcode scanner for food — camera → Open Food Facts API → auto-fill macros | Nutrition | P2 | ⏳ Pending | Low priority since manual search works |
| B5 | Larger food database — wire up external API (Open Food Facts primary, USDA FoodData Central fallback). Backend proxy endpoint + Redis cache + graceful fallback to internal seed. _Replaces/supplements current 257-item seed_ | Nutrition | P2 | ⏳ Pending | **Recommended:** Open Food Facts (free, 3M+ items, barcode support) + USDA FoodData Central (free, 600K+) as fallback. Nutritionix = paid but has restaurant data. See CONTEXT.md for full architecture. |
| B6 | AI image → food macro analysis — photo of meal → GPT-4o Vision estimates macros | Nutrition/AI | P2 | ⏳ Pending | New endpoint + camera UI in Nutrition page |
| B7 | Android APK build — React Native / Expo EAS build for Samsung Galaxy Store + Play Store | Mobile | P2 | 🔄 In Progress | iOS/PWA on Railway. APK via `eas build --platform android`. Expo scaffold already in `/mobile` |
| B8 | External exercise database API — Wger REST API (free, self-hostable) or ExerciseDB via RapidAPI (1300+ exercises with GIFs, muscle diagrams). _Supplements current ~170-item seed_ | Workouts | P2 | ⏳ Pending | **Recommended:** Wger as primary (free, no rate limit if self-hosted, Apache 2.0). ExerciseDB for GIFs/images. See CONTEXT.md for full architecture. |

---

## Dependency graph (key blockers)

```
#124 (AI provider) ──┐
                     ▼
#114 (user context) ──► #115 (function tools) ──► #116 (nutrition agent)
                                               ├──► #117 (workout agent)
                                               ├──► #119 (proactive scheduler)
                                               └──► #112 (AI goal advisor)

#116 + #117 ──► #122 (AI Coach page tabs)
             └──► #123 (inline smart suggestions)

#118 (notification model) ──► #120 (notification UI)
                           └──► #121 (coach insight card)

#126 (shared goal components) ──► #109 #110 #111 #113 (goals overhaul)
```

---

## Suggested sprint order

| Sprint | Items | Goal |
|--------|-------|------|
| 1 | #124 → #114 → #