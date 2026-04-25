# FitAI Coach — Change Log

Most recent session first.

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
