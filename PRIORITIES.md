# FitAI Coach - Task Priorities

_Last updated: 2026-05-03_

> Format: **P1** = must-ship · **P2** = high value · **P3** = deferred/nice-to-have

---

## DONE - COMPLETED THIS SESSION / PREVIOUSLY

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| - | Full i18n Spanish translation - all pages, hooks, day labels (Intl), chat starters | i18n | P1 | Done |
| - | Dashboard: macro labels, consumed, chart legend, day-rest, quick actions all dynamic | i18n | P1 | Done |
| - | WeeklyPlanWidget: Intl day abbreviations, edit schedule, sync to calendar | i18n | P1 | Done |
| - | ChatPage: suggested starter prompts dynamic per locale | i18n | P1 | Done |
| C1 | Delete stale `authController_clean.ts` | Security | P1 | Done |
| C2 | Rotate `POSTGRES_PASSWORD` + GitGuardian remediation | Security | P1 | Done |
| C3 | Forgot password / reset flow | Auth | P1 | Done |
| C4 | Email verification | Auth | P1 | Done |
| H2 | Env validation on startup (Zod) | Infra | P1 | Done |
| H5 | 4 controllers bypass Zod - mealPlan, report, template, workout | Backend | P1 | Done |
| H6 | Remove 36 `any` types in backend | Code Quality | P2 | Done |
| H7 | App Store PWA submission (iOS) | Mobile | P2 | Done |
| M3 | Supplement entry editing (Protein Shake editable modal) | Nutrition | P2 | Done |
| M5 | Weekly plan -> workout link on day-complete | Weekly Plan | P2 | Done |
| M6 | Meal plan save as template | Nutrition | P2 | Done |
| M9 | Workout training-type support (Strength/Endurance/Hypertrophy) | Workouts | P2 | Done |
| M10 | Exercise database expansion (Glutes, Traps, Abs) | Data | P2 | Done |
| M11 | Agent write tools - `log_food` + `save_workout_template` | AI/Tools | P2 | Done |
| M15 | Weight trend chart - extend history window + close projection gap | Dashboard | P2 | Done |
| L1 | Quick re-log on Nutrition page (top-5 frequent foods) | Nutrition | P2 | Done |
| - | Offline support - sw.js API caching, IndexedDB sync queue, Zustand offline store, `useOfflineSync` hook, axios interceptor, OfflineBanner with pending count | PWA/Infra | P1 | Done |
| - | NutritionPage: toasts on every food/meal action + `silentLoad` (no spinner flash, immediate in-place refresh) | UX | P1 | Done |
| - | WorkoutsPage: toasts on exercise add / edit / delete | UX | P1 | Done |
| - | Foods database expansion - 714 items total: exact single items, convenience foods, sandwiches, seafood, dairy, dairy alternatives, gluten-free staples, Latin / Hispanic, Indian / South Asian, branded supermarket items | Data | P2 | Done |
| - | Food AI-translation - `?lang=` param on `/api/search/foods`; query translated to English, results translated back via AI provider; Redis-cached per lang | i18n/AI | P2 | Done |
| - | Locale-aware dates - `dateFormat.ts` utility (`Intl.DateTimeFormat`); replaces all `format(...)` date-fns calls across Dashboard, Progress, Nutrition, Workouts, Goals, MealPlanner, WeeklyPlanWidget, ProjectionChart | i18n | P2 | Done |
| - | Weight sync across pages - `fitai:weight-logged` CustomEvent; Dashboard + Progress refresh on any weight log; toasts on Dashboard FAB, Nutrition FAB, Settings profile save, ProgressPage | UX | P1 | Done |
| - | Goals weight trend chart live-updates when weight is logged from any page | Feature | P1 | Done |
| - | Workout templates filtered by `trainingDaysPerWeek` - exact-match filter with all-templates fallback; info chip shown when match found | UX | P2 | Done |
| - | Dashboard weight FAB: empty-state card button now opens FAB (not nav away); toast added; file truncation bug fixed | UX | P2 | Done |
| - | Shared refresh bus - `fitai:data-changed` keeps dashboard, progress, profile summary, and nutrition in sync after logs | UX | P1 | Done |
| - | Profile weight sync - profile/settings weight now logs today's weight, confirms before save, and stays aligned with dashboard/nutrition/progress | UX | P1 | Done |
| - | Food localization layer - `localizedNames` stored in DB; search prefers selected-language names before AI fallback | i18n/AI | P2 | Done |
| - | Meal planner duration support - week/month/multi-month plans now supported end-to-end | Meal Planner | P1 | Done |
| - | Adaptive predictions - separate ideal, actual, smoothed actual, and adaptive forecast paths with response factor, ETA drift, confidence, and recommendations | Analytics/Goals | P1 | Done |
| - | Weekly coach review - computed review endpoints and Progress card using average weight, adherence, training completion, and recommendation | Analytics/UX | P1 | Done |
| - | Plan adjustment modes - Settings support for `suggest`, `confirm`, and `auto`; confirm can apply calorie adjustments, auto never changes goal dates | Goals/UX | P1 | Done |
| - | Goals realism diagnostics - active goal required pace, current pace, adaptive ETA, aggressive-date warning, and suggested postponed date | Goals/Analytics | P1 | Done |
| - | Analytics diagnostic layer - calorie/protein/workout adherence, weight velocity, logging consistency, and trend confidence | Analytics | P1 | Done |
| - | Workout auto-refresh - Workouts tab now listens to shared app events and reloads after workout create/update/delete/template/AI save flows | UX | P1 | Done |
| - | Draggable mobile weight FAB - Dashboard and Nutrition share a long-press draggable weight button position with viewport clamping | UX | P2 | Done |
| - | Nutrition AI meal-plan routing - Nutritionist meal plans from Nutrition now save to Meal Planner instead of logging directly into the food diary | Nutrition/Meal Planner | P1 | Done |
| - | Goals What-if persistence cleanup - Apply preview now persists workout schedule inputs as well as calories/macros/date | Goals/UX | P1 | Done |
| - | Goals forecast localization + sparse-data diagnostics - localized forecast/analytics UI plus visible sparse-data fallback and refresh/debug status | Goals/i18n | P1 | Done |
| - | Food DB localized search cleanup - DB search now parses `localizedNames` and ranks English / alias / localized / AI-translated matches explicitly | Nutrition/i18n | P1 | Done |
| - | Progress mobile tab polish - horizontally scrollable tab strip, renamed embedded Plan tab, Goals deep-link to plan review, and compact month/day target-date display | Progress/Goals UX | P1 | Done |
| - | Nutrition library polish - `Add New Food` CTA moved to the left side of My Foods and protein shake supplements now appear as `Protein Shake` in macro food/meal breakdowns | Nutrition/UX | P1 | Done |
| - | Theme and language preference polish - added `Black + Golden` and `White + Green` theme options and fixed the language-change toast so it appears in the newly selected language | Settings/UX | P1 | Done |

---

## ROADMAP NOTES

Foundation work is complete. The roadmap below only shows live dependencies and remaining work.

---

## PENDING - GOALS OVERHAUL

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 108 | Goals page visual overhaul - progress ring, days countdown, gradient cards, empty state CTA | UX | P1 | Pending |
| 109 | Goals - EditGoalModal comparison chart (old plan vs proposed plan, debounced) | Feature | P1 | Pending |
| 110 | Goals - realistic goal validator with inline warnings (below BMR, >1%/wk loss, >1000 kcal deficit) | Feature/Safety | P1 | Pending |
| 111 | Goals - calorie & macro impact panel: current vs new plan, color-coded diffs, live-updating | Feature | P1 | Pending |
| 113 | Goals - multi-step creation wizard: body stats -> goal type -> target + live chart -> macro split -> save | Feature | P1 | Pending |
| 112 | Goals - AI goal advisor with scientific sources (ACSM, WHO, PubMed) + mandatory medical disclaimer | AI/ML | P2 | Pending |

---

## PENDING - AI AGENTS

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 116 | Nutrition specialist agent - dietetics system prompt, context injection, `suggest_foods` tool calls | AI/ML | P1 | Pending |
| 117 | Workout specialist agent - exercise science prompt, `get_recent_workouts` tool, overload + recovery analysis | AI/ML | P1 | Pending |
| 122 | AI Coach page - 3 specialist tabs, silent query routing, remove general chat, per-tab conversation history | UX | P1 | Pending |
| 123 | Inline smart suggestions - Nutrition remaining macro banner + one-tap foods; Workout muscle gap chip | UX | P2 | Pending |

---

## PENDING - PROACTIVE ENGINE

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 118 | AINotification Prisma model + CRUD backend (list, markRead, markAllRead, dismiss) | Infra | P1 | Pending |
| 125 | Proactive notification preferences - per-type toggles + user timezone in Settings (all off by default) | UX/Infra | P1 | Pending |
| 119 | Proactive AI scheduler - opt-in, per-type, timezone-aware: morning check-in, evening nudge, weekly digest, milestones, streaks | AI/Scheduler | P1 | Pending |
| 120 | Notification center UI - bell icon + unread badge in top nav, slide-in panel, mark read, dismiss | UX | P1 | Pending |
| 121 | Dashboard "Coach insight" card - collapsed single line by default, expand on tap, auto-expanded only when time-sensitive | UX | P1 | Pending |

---

## PENDING - INFRASTRUCTURE & UX FIXES

| # | Task | Category | Pri | Status |
|---|------|----------|-----|--------|
| 71 | Add dynamic editable controls to Progress prediction graph (scenario sliders / manual what-if editing) | Feature | P2 | Pending |
| 106 | Pagination - food log history, date-cursor based (before=DATE, keeps day groups intact) | Infra/UX | P2 | Pending |
| 107 | Pagination - workout history, standard offset (page + limit on History tab) | Infra/UX | P2 | Pending |
| 127 | Add visible "+ Custom exercise" button as primary entry point in WorkoutsPage (not just no-results state) | UX | P2 | Pending |
| - | Coaching mode - coaches can share workout or nutrition plans via link for clients to import | Platform | P2 | Pending |
| - | Developer/Admin mode - privileged support, ops, and content-management surface | Internal | P2 | Pending |
| - | Advanced workout structures - stretching, warm-up, circuits, and supersets across builder/templates/logging | Workouts | P2 | Pending |
| - | Stretching & Mobility + Warm-up as dedicated workout categories (filter, builder, rest timer skip) | Feature | P2 | Pending |
| - | CI/CD pipeline - GitHub Actions: lint -> `tsc --noEmit` -> `prisma validate` -> build | DevOps | P2 | Pending |
| - | DB indexes - `@@index` on `FoodLog(userId,date)`, `Workout(userId,date)`, `WeightEntry(userId,date)` | Backend | P2 | Pending |
| - | Request timeout middleware - 503 after 30 s (OpenAI calls can hang) | Backend | P2 | Pending |
| - | OpenAI extended error handling - context length, model not found, 503, timeout | Backend | P2 | Pending |
| - | SSE streaming chat responses (cuts perceived latency from 3-8 s to instant) | AI/UX | P2 | Pending |
| - | Optimistic UI - toggle rest day, tick set: instant update + rollback on error | Frontend | P2 | Pending |
| - | Store suggested JSON in Conversation row (`suggestedWorkoutJson` etc.) | Backend | P2 | Pending |
| - | Connection pooling - PgBouncer or Prisma Accelerate before public load | Infra | P2 | Pending |
| - | Admin dashboard - role-gated `/admin`: active users, workouts/day, AI usage, error rates | Internal | P3 | Pending |
| - | Push notifications / streak reminders (PWA push or email) | Engagement | P3 | Pending |
| 84 | AI: embeddings + RAG for long-term memory - deferred post-v1 | AI/ML | P3 | Deferred |

---

## PENDING - BIG FEATURES (Plan separately)

| # | Task | Category | Pri | Status | Notes |
|---|------|----------|-----|--------|-------|
| B1 | Apple Health / HealthKit integration - steps, HR, active calories, sleep | Health Platform | P2 | Deferred | Requires Capacitor plugin or RN rewrite |
| B2 | Apple Watch companion app - log sets in-session from wrist | Wearable | P2 | Pending | High-priority wearable follow-up once core roadmap work stabilises |
| B3 | Samsung Health integration - Android equivalent of B1 | Health Platform | P2 | Pending | Samsung Health SDK + Capacitor plugin |
| B4 | Barcode scanner for food - camera -> Open Food Facts API -> auto-fill macros | Nutrition | P3 | Deferred | Lowest-priority nutrition convenience feature after core roadmap work |
| B5 | Larger food database - wire up external API (Open Food Facts primary, USDA FoodData Central fallback). Backend proxy endpoint + Redis cache + graceful fallback to internal seed. Replaces/supplements current seed | Nutrition | P2 | Pending | Recommended: Open Food Facts (free, 3M+ items, barcode support) + USDA FoodData Central (free, 600K+) as fallback. Nutritionix is paid but has restaurant data. |
| B6 | AI image -> food macro analysis - photo of meal -> GPT-4o Vision estimates macros | Nutrition/AI | P3 | Deferred | Lowest-priority food-detection feature after scanner, coaching, and wearable work |
| B7 | Android APK build - React Native / Expo EAS build for Samsung Galaxy Store + Play Store | Mobile | P2 | In Progress | iOS/PWA on Railway. APK via `eas build --platform android`. Expo scaffold already in `/mobile` |
| B8 | External exercise database API - Wger REST API (free, self-hostable) or ExerciseDB via RapidAPI (1300+ exercises with GIFs, muscle diagrams). Supplements current seed | Workouts | P2 | Pending | Recommended: Wger as primary (free, no rate limit if self-hosted, Apache 2.0). ExerciseDB for GIFs/images. |

---

## Dependency graph (key blockers)

```
#116 + #117 -> #122 (AI Coach page tabs)
#116 + #117 -> #123 (inline smart suggestions)

#118 -> #120 (notification UI)
#118 + #125 -> #119 (proactive scheduler)
#118 + #119 -> #121 (coach insight card)
```

Completed prerequisites already done: `#124`, `#114`, `#115`, `#126`.

---

## Suggested sprint order

| Sprint | Items | Goal |
|--------|-------|------|
| 1 | #108, #109, #110, #111, #113, #112 | Finish goals overhaul now that shared goal UI is already complete |
| 2 | #116, #117, #122, #123 | Ship specialist AI agents and split the coach UI into clear tabs |
| 3 | #118, #125, #119, #120, #121 | Finish proactive notifications end to end |
| 4 | #71, #85, #106, #107, #127, request timeout, OpenAI error handling, SSE streaming, optimistic UI, suggested JSON persistence, DB indexes, connection pooling, coaching mode, developer/admin mode, advanced workout structures | Close the remaining infra, UX, and coaching-platform gaps |
| 5 | #B2, #B3, #B5, #B7, #B8 | Tackle the next wave of wearable, platform, and integration work |
| 6 | #B4, #B6 | Leave scanner and AI food-photo detection as the final nutrition-convenience wave |

---

## What to do next

- Start with Goals Overhaul: `#108` plus the chart/validator/panel/wizard items now that their shared UI foundation is done.
- Then move to AI agents and the AI Coach split, since those depend on the agent/tool work that is already complete.
- After that, finish the proactive engine so notifications, preferences, and the notification center can land together.
- Keep infra polish as the next hardening lane: pagination, timeouts, OpenAI error handling, SSE, optimistic UI, suggested JSON persistence, DB indexes, pooling, and CI/CD.
- Once the core loops are stable, move the next high-priority expansion lane to coaching mode, developer/admin tooling, advanced workout structures, and Apple Watch support.
- Leave barcode scanning and AI food-photo detection as the final nutrition-convenience wave.
