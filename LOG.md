# FitAI Coach — Change Log

Most recent session first.

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
