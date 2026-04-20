/**
 * Research-based recommended workout splits.
 * Sources: NSCA guidelines, Jeff Nippard, Mike Israetel (RP Strength),
 *          Eric Helms (MASS), Greg Nuckols (Stronger by Science).
 *
 * Each entry represents ONE training day within a split.
 * They are grouped logically by splitType + frequency + objective.
 */

export interface SeedExercise {
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  order: number;
}

export interface SeedTemplate {
  name: string;
  description: string;
  splitType: string;
  objective: string;
  frequency: number;
  dayLabel: string;
  muscleGroups: string[];
  exercises: SeedExercise[];
}

export const recommendedSplits: SeedTemplate[] = [

  // ════════════════════════════════════════════════
  // 3 DAYS/WEEK — FULL BODY (hypertrophy / general)
  // ════════════════════════════════════════════════
  {
    name: "Full Body 3x — Day A",
    description: "3-day full body split. Day A focuses on squat pattern and horizontal push/pull. Ideal for beginners to intermediates or busy schedules.",
    splitType: "Full_Body", objective: "hypertrophy", frequency: 3, dayLabel: "Day A",
    muscleGroups: ["quads", "chest", "back", "shoulders", "biceps", "triceps"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 4, reps: "6-8", restSeconds: 180, notes: "Focus on depth and bracing", order: 1 },
      { exerciseName: "Barbell Bench Press", sets: 4, reps: "6-8", restSeconds: 180, order: 2 },
      { exerciseName: "Barbell Bent-Over Row", sets: 3, reps: "8-10", restSeconds: 120, order: 3 },
      { exerciseName: "Dumbbell Lateral Raise", sets: 3, reps: "12-15", restSeconds: 60, order: 4 },
      { exerciseName: "EZ-Bar Curl", sets: 3, reps: "10-12", restSeconds: 60, order: 5 },
      { exerciseName: "Cable Tricep Pushdown", sets: 3, reps: "10-12", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "Full Body 3x — Day B",
    description: "3-day full body split. Day B focuses on hip hinge pattern and vertical push/pull.",
    splitType: "Full_Body", objective: "hypertrophy", frequency: 3, dayLabel: "Day B",
    muscleGroups: ["hamstrings", "glutes", "back", "shoulders", "biceps", "triceps"],
    exercises: [
      { exerciseName: "Romanian Deadlift", sets: 4, reps: "8-10", restSeconds: 180, notes: "Feel the hamstring stretch", order: 1 },
      { exerciseName: "Overhead Press", sets: 4, reps: "6-8", restSeconds: 180, order: 2 },
      { exerciseName: "Lat Pulldown", sets: 3, reps: "10-12", restSeconds: 120, order: 3 },
      { exerciseName: "Incline Dumbbell Press", sets: 3, reps: "10-12", restSeconds: 90, order: 4 },
      { exerciseName: "Face Pulls", sets: 3, reps: "15-20", restSeconds: 60, notes: "Rear delt health", order: 5 },
      { exerciseName: "Leg Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "Full Body 3x — Day C",
    description: "3-day full body split. Day C uses slightly different movement patterns to ensure complete muscle coverage across the week.",
    splitType: "Full_Body", objective: "hypertrophy", frequency: 3, dayLabel: "Day C",
    muscleGroups: ["quads", "chest", "back", "glutes", "core"],
    exercises: [
      { exerciseName: "Leg Press", sets: 4, reps: "10-12", restSeconds: 120, order: 1 },
      { exerciseName: "Dumbbell Bench Press", sets: 3, reps: "10-12", restSeconds: 90, order: 2 },
      { exerciseName: "Cable Row", sets: 3, reps: "10-12", restSeconds: 90, order: 3 },
      { exerciseName: "Hip Thrust", sets: 3, reps: "12-15", restSeconds: 90, order: 4 },
      { exerciseName: "Dumbbell Shoulder Press", sets: 3, reps: "10-12", restSeconds: 90, order: 5 },
      { exerciseName: "Plank", sets: 3, reps: "30-60s", restSeconds: 60, notes: "Core stability", order: 6 },
    ],
  },

  // ════════════════════════════════════════════════
  // 3 DAYS/WEEK — FULL BODY (strength)
  // ════════════════════════════════════════════════
  {
    name: "Strength 3x — Day A",
    description: "3-day linear progression strength program inspired by Starting Strength / StrongLifts methodology. Heavy compound lifts, low rep ranges.",
    splitType: "Full_Body", objective: "strength", frequency: 3, dayLabel: "Day A",
    muscleGroups: ["quads", "chest", "back"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 5, reps: "5", restSeconds: 240, notes: "Add 2.5kg each session", order: 1 },
      { exerciseName: "Barbell Bench Press", sets: 5, reps: "5", restSeconds: 240, order: 2 },
      { exerciseName: "Barbell Row", sets: 5, reps: "5", restSeconds: 180, order: 3 },
    ],
  },
  {
    name: "Strength 3x — Day B",
    description: "3-day linear progression — alternates with Day A (Squat/OHP/Deadlift).",
    splitType: "Full_Body", objective: "strength", frequency: 3, dayLabel: "Day B",
    muscleGroups: ["quads", "hamstrings", "shoulders"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 5, reps: "5", restSeconds: 240, notes: "Same weight as Day A", order: 1 },
      { exerciseName: "Overhead Press", sets: 5, reps: "5", restSeconds: 240, order: 2 },
      { exerciseName: "Conventional Deadlift", sets: 1, reps: "5", restSeconds: 300, notes: "1 heavy top set", order: 3 },
    ],
  },

  // ════════════════════════════════════════════════
  // 4 DAYS/WEEK — UPPER / LOWER (hypertrophy)
  // ════════════════════════════════════════════════
  {
    name: "Upper/Lower 4x — Upper A (Strength Focus)",
    description: "4-day Upper/Lower split by Eric Helms. Upper A is strength-focused with heavier loads. Pair with Upper B (volume), Lower A (quad), Lower B (hip hinge).",
    splitType: "Upper_Lower", objective: "hypertrophy", frequency: 4, dayLabel: "Upper A",
    muscleGroups: ["chest", "back", "shoulders", "biceps", "triceps"],
    exercises: [
      { exerciseName: "Barbell Bench Press", sets: 4, reps: "3-5", restSeconds: 240, order: 1 },
      { exerciseName: "Barbell Row", sets: 4, reps: "3-5", restSeconds: 240, order: 2 },
      { exerciseName: "Incline Dumbbell Press", sets: 3, reps: "10-12", restSeconds: 90, order: 3 },
      { exerciseName: "Cable Row", sets: 3, reps: "10-12", restSeconds: 90, order: 4 },
      { exerciseName: "Lateral Raise", sets: 3, reps: "15-20", restSeconds: 60, order: 5 },
      { exerciseName: "Tricep Pushdown", sets: 3, reps: "10-15", restSeconds: 60, order: 6 },
      { exerciseName: "Dumbbell Curl", sets: 3, reps: "10-15", restSeconds: 60, order: 7 },
    ],
  },
  {
    name: "Upper/Lower 4x — Upper B (Volume Focus)",
    description: "4-day Upper/Lower — Upper B uses higher rep volume for hypertrophy.",
    splitType: "Upper_Lower", objective: "hypertrophy", frequency: 4, dayLabel: "Upper B",
    muscleGroups: ["chest", "back", "shoulders", "biceps", "triceps"],
    exercises: [
      { exerciseName: "Overhead Press", sets: 4, reps: "8-10", restSeconds: 120, order: 1 },
      { exerciseName: "Lat Pulldown", sets: 4, reps: "8-10", restSeconds: 120, order: 2 },
      { exerciseName: "Cable Chest Fly", sets: 3, reps: "12-15", restSeconds: 60, order: 3 },
      { exerciseName: "Face Pulls", sets: 3, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Hammer Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
      { exerciseName: "Skull Crushers", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "Upper/Lower 4x — Lower A (Quad Dominant)",
    description: "4-day Upper/Lower — Lower A is squat-pattern focused for quad development.",
    splitType: "Upper_Lower", objective: "hypertrophy", frequency: 4, dayLabel: "Lower A",
    muscleGroups: ["quads", "glutes", "calves", "core"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 4, reps: "6-8", restSeconds: 240, order: 1 },
      { exerciseName: "Leg Press", sets: 3, reps: "10-12", restSeconds: 120, order: 2 },
      { exerciseName: "Leg Extension", sets: 3, reps: "12-15", restSeconds: 60, order: 3 },
      { exerciseName: "Hip Thrust", sets: 3, reps: "10-12", restSeconds: 90, order: 4 },
      { exerciseName: "Standing Calf Raise", sets: 4, reps: "12-15", restSeconds: 60, order: 5 },
      { exerciseName: "Hanging Leg Raise", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "Upper/Lower 4x — Lower B (Hip Hinge / Posterior Chain)",
    description: "4-day Upper/Lower — Lower B focuses on the posterior chain via hip hinge patterns.",
    splitType: "Upper_Lower", objective: "hypertrophy", frequency: 4, dayLabel: "Lower B",
    muscleGroups: ["hamstrings", "glutes", "lower_back", "calves"],
    exercises: [
      { exerciseName: "Romanian Deadlift", sets: 4, reps: "8-10", restSeconds: 180, order: 1 },
      { exerciseName: "Leg Curl", sets: 4, reps: "10-12", restSeconds: 90, order: 2 },
      { exerciseName: "Bulgarian Split Squat", sets: 3, reps: "10-12", restSeconds: 90, notes: "Each leg", order: 3 },
      { exerciseName: "Good Morning", sets: 3, reps: "10-12", restSeconds: 90, order: 4 },
      { exerciseName: "Seated Calf Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 5 },
    ],
  },

  // ════════════════════════════════════════════════
  // 5 DAYS/WEEK — BRO SPLIT (hypertrophy)
  // The classic bodybuilder split: one muscle group per day
  // ════════════════════════════════════════════════
  {
    name: "Bro Split 5x — Day 1: Chest",
    description: "Classic 5-day bro split. Monday = Chest day. High volume, multiple angles.",
    splitType: "Bro_Split", objective: "hypertrophy", frequency: 5, dayLabel: "Day 1 – Chest",
    muscleGroups: ["chest", "triceps"],
    exercises: [
      { exerciseName: "Barbell Bench Press", sets: 4, reps: "6-10", restSeconds: 180, order: 1 },
      { exerciseName: "Incline Dumbbell Press", sets: 4, reps: "8-12", restSeconds: 120, order: 2 },
      { exerciseName: "Cable Chest Fly", sets: 3, reps: "12-15", restSeconds: 60, order: 3 },
      { exerciseName: "Decline Bench Press", sets: 3, reps: "8-12", restSeconds: 120, order: 4 },
      { exerciseName: "Dumbbell Chest Fly", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
      { exerciseName: "Push-Up", sets: 2, reps: "15-20", restSeconds: 60, notes: "Burnout set", order: 6 },
    ],
  },
  {
    name: "Bro Split 5x — Day 2: Back",
    description: "Classic 5-day bro split. Tuesday = Back day. Width and thickness.",
    splitType: "Bro_Split", objective: "hypertrophy", frequency: 5, dayLabel: "Day 2 – Back",
    muscleGroups: ["back", "biceps", "rear_delts"],
    exercises: [
      { exerciseName: "Conventional Deadlift", sets: 4, reps: "4-6", restSeconds: 240, order: 1 },
      { exerciseName: "Barbell Row", sets: 4, reps: "6-10", restSeconds: 180, order: 2 },
      { exerciseName: "Pull-Up / Weighted Pull-Up", sets: 4, reps: "6-10", restSeconds: 180, order: 3 },
      { exerciseName: "Lat Pulldown", sets: 3, reps: "10-12", restSeconds: 90, order: 4 },
      { exerciseName: "Cable Row", sets: 3, reps: "10-12", restSeconds: 90, order: 5 },
      { exerciseName: "Face Pulls", sets: 3, reps: "15-20", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "Bro Split 5x — Day 3: Shoulders",
    description: "Classic 5-day bro split. Wednesday = Shoulder day. All three heads.",
    splitType: "Bro_Split", objective: "hypertrophy", frequency: 5, dayLabel: "Day 3 – Shoulders",
    muscleGroups: ["shoulders", "traps"],
    exercises: [
      { exerciseName: "Overhead Press", sets: 4, reps: "6-10", restSeconds: 180, order: 1 },
      { exerciseName: "Dumbbell Lateral Raise", sets: 4, reps: "12-15", restSeconds: 60, order: 2 },
      { exerciseName: "Arnold Press", sets: 3, reps: "10-12", restSeconds: 90, order: 3 },
      { exerciseName: "Cable Lateral Raise", sets: 3, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Reverse Pec Deck", sets: 3, reps: "15-20", restSeconds: 60, notes: "Rear delt", order: 5 },
      { exerciseName: "Barbell Shrug", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "Bro Split 5x — Day 4: Arms",
    description: "Classic 5-day bro split. Thursday = Arms day (Biceps + Triceps).",
    splitType: "Bro_Split", objective: "hypertrophy", frequency: 5, dayLabel: "Day 4 – Arms",
    muscleGroups: ["biceps", "triceps", "forearms"],
    exercises: [
      { exerciseName: "EZ-Bar Curl", sets: 4, reps: "8-12", restSeconds: 90, order: 1 },
      { exerciseName: "Close-Grip Bench Press", sets: 4, reps: "8-12", restSeconds: 120, order: 2 },
      { exerciseName: "Incline Dumbbell Curl", sets: 3, reps: "10-12", restSeconds: 60, order: 3 },
      { exerciseName: "Skull Crushers", sets: 3, reps: "10-12", restSeconds: 90, order: 4 },
      { exerciseName: "Hammer Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
      { exerciseName: "Cable Tricep Pushdown", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
      { exerciseName: "Wrist Curl", sets: 2, reps: "15-20", restSeconds: 45, notes: "Forearms", order: 7 },
    ],
  },
  {
    name: "Bro Split 5x — Day 5: Legs",
    description: "Classic 5-day bro split. Friday = Leg day. Quads, hamstrings, glutes, calves.",
    splitType: "Bro_Split", objective: "hypertrophy", frequency: 5, dayLabel: "Day 5 – Legs",
    muscleGroups: ["quads", "hamstrings", "glutes", "calves"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 4, reps: "6-10", restSeconds: 240, order: 1 },
      { exerciseName: "Romanian Deadlift", sets: 4, reps: "8-10", restSeconds: 180, order: 2 },
      { exerciseName: "Leg Press", sets: 3, reps: "10-15", restSeconds: 120, order: 3 },
      { exerciseName: "Leg Curl", sets: 3, reps: "12-15", restSeconds: 90, order: 4 },
      { exerciseName: "Leg Extension", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
      { exerciseName: "Standing Calf Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 6 },
      { exerciseName: "Hip Thrust", sets: 3, reps: "12-15", restSeconds: 90, order: 7 },
    ],
  },

  // ════════════════════════════════════════════════
  // 6 DAYS/WEEK — PUSH / PULL / LEGS x2 (hypertrophy)
  // Most popular high-frequency split per RP Strength
  // ════════════════════════════════════════════════
  {
    name: "PPL 6x — Push A (Strength)",
    description: "6-day PPL split run twice per week. Push A is heavier/strength focused. Recommended for intermediates.",
    splitType: "PPL", objective: "hypertrophy", frequency: 6, dayLabel: "Push A",
    muscleGroups: ["chest", "shoulders", "triceps"],
    exercises: [
      { exerciseName: "Barbell Bench Press", sets: 4, reps: "4-6", restSeconds: 240, order: 1 },
      { exerciseName: "Overhead Press", sets: 4, reps: "6-8", restSeconds: 180, order: 2 },
      { exerciseName: "Incline Dumbbell Press", sets: 3, reps: "8-12", restSeconds: 120, order: 3 },
      { exerciseName: "Lateral Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Tricep Pushdown", sets: 3, reps: "10-15", restSeconds: 60, order: 5 },
      { exerciseName: "Overhead Dumbbell Tricep Extension", sets: 3, reps: "10-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "PPL 6x — Push B (Volume)",
    description: "6-day PPL — Push B is higher rep volume. Runs Day 4 of the week.",
    splitType: "PPL", objective: "hypertrophy", frequency: 6, dayLabel: "Push B",
    muscleGroups: ["chest", "shoulders", "triceps"],
    exercises: [
      { exerciseName: "Incline Barbell Press", sets: 4, reps: "8-10", restSeconds: 120, order: 1 },
      { exerciseName: "Dumbbell Shoulder Press", sets: 4, reps: "10-12", restSeconds: 90, order: 2 },
      { exerciseName: "Cable Chest Fly", sets: 3, reps: "12-15", restSeconds: 60, order: 3 },
      { exerciseName: "Lateral Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Cable Fly", sets: 3, reps: "15-20", restSeconds: 60, order: 5 },
      { exerciseName: "Skull Crushers", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "PPL 6x — Pull A (Strength)",
    description: "6-day PPL — Pull A focuses on heavy horizontal and vertical pulling.",
    splitType: "PPL", objective: "hypertrophy", frequency: 6, dayLabel: "Pull A",
    muscleGroups: ["back", "biceps", "rear_delts"],
    exercises: [
      { exerciseName: "Conventional Deadlift", sets: 3, reps: "4-6", restSeconds: 300, order: 1 },
      { exerciseName: "Barbell Row", sets: 4, reps: "6-8", restSeconds: 180, order: 2 },
      { exerciseName: "Pull-Up", sets: 4, reps: "6-10", restSeconds: 180, order: 3 },
      { exerciseName: "Face Pulls", sets: 3, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Barbell Curl", sets: 4, reps: "8-10", restSeconds: 90, order: 5 },
      { exerciseName: "Hammer Curl", sets: 3, reps: "10-12", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "PPL 6x — Pull B (Volume)",
    description: "6-day PPL — Pull B uses higher rep ranges and cable/machine work.",
    splitType: "PPL", objective: "hypertrophy", frequency: 6, dayLabel: "Pull B",
    muscleGroups: ["back", "biceps", "rear_delts"],
    exercises: [
      { exerciseName: "Lat Pulldown", sets: 4, reps: "10-12", restSeconds: 90, order: 1 },
      { exerciseName: "Cable Row", sets: 4, reps: "10-12", restSeconds: 90, order: 2 },
      { exerciseName: "Chest-Supported Row", sets: 3, reps: "10-12", restSeconds: 90, order: 3 },
      { exerciseName: "Reverse Pec Deck", sets: 3, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Incline Dumbbell Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
      { exerciseName: "Cable Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "PPL 6x — Legs A (Quad Dominant)",
    description: "6-day PPL — Legs A is squat-pattern / quad-dominant day.",
    splitType: "PPL", objective: "hypertrophy", frequency: 6, dayLabel: "Legs A",
    muscleGroups: ["quads", "glutes", "calves"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 4, reps: "6-8", restSeconds: 240, order: 1 },
      { exerciseName: "Leg Press", sets: 4, reps: "10-12", restSeconds: 120, order: 2 },
      { exerciseName: "Leg Extension", sets: 3, reps: "12-15", restSeconds: 60, order: 3 },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: "10-12", restSeconds: 120, order: 4 },
      { exerciseName: "Standing Calf Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 5 },
    ],
  },
  {
    name: "PPL 6x — Legs B (Posterior Chain)",
    description: "6-day PPL — Legs B focuses on hamstrings and glutes.",
    splitType: "PPL", objective: "hypertrophy", frequency: 6, dayLabel: "Legs B",
    muscleGroups: ["hamstrings", "glutes", "calves"],
    exercises: [
      { exerciseName: "Romanian Deadlift", sets: 4, reps: "8-10", restSeconds: 180, order: 1 },
      { exerciseName: "Hip Thrust", sets: 4, reps: "10-12", restSeconds: 120, order: 2 },
      { exerciseName: "Leg Curl", sets: 4, reps: "10-15", restSeconds: 90, order: 3 },
      { exerciseName: "Bulgarian Split Squat", sets: 3, reps: "10-12", restSeconds: 90, notes: "Each leg", order: 4 },
      { exerciseName: "Seated Calf Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 5 },
    ],
  },

  // ════════════════════════════════════════════════
  // 4 DAYS/WEEK — PPL VARIANT (hypertrophy, 4 days)
  // Push / Pull / Legs / Full Body accessory
  // ════════════════════════════════════════════════
  {
    name: "PPL 4x — Push Day",
    description: "4-day PPL variant. 3 dedicated days + 1 full-body accessory day.",
    splitType: "PPL", objective: "hypertrophy", frequency: 4, dayLabel: "Push",
    muscleGroups: ["chest", "shoulders", "triceps"],
    exercises: [
      { exerciseName: "Barbell Bench Press", sets: 4, reps: "6-8", restSeconds: 180, order: 1 },
      { exerciseName: "Overhead Press", sets: 3, reps: "8-10", restSeconds: 120, order: 2 },
      { exerciseName: "Incline Dumbbell Press", sets: 3, reps: "10-12", restSeconds: 90, order: 3 },
      { exerciseName: "Lateral Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Tricep Pushdown", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
    ],
  },
  {
    name: "PPL 4x — Pull Day",
    description: "4-day PPL variant — Pull day.",
    splitType: "PPL", objective: "hypertrophy", frequency: 4, dayLabel: "Pull",
    muscleGroups: ["back", "biceps", "rear_delts"],
    exercises: [
      { exerciseName: "Barbell Row", sets: 4, reps: "6-8", restSeconds: 180, order: 1 },
      { exerciseName: "Pull-Up", sets: 4, reps: "8-12", restSeconds: 180, order: 2 },
      { exerciseName: "Lat Pulldown", sets: 3, reps: "10-12", restSeconds: 90, order: 3 },
      { exerciseName: "Face Pulls", sets: 3, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "EZ-Bar Curl", sets: 3, reps: "10-12", restSeconds: 60, order: 5 },
      { exerciseName: "Hammer Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "PPL 4x — Legs Day",
    description: "4-day PPL variant — Legs day covering full lower body.",
    splitType: "PPL", objective: "hypertrophy", frequency: 4, dayLabel: "Legs",
    muscleGroups: ["quads", "hamstrings", "glutes", "calves"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 4, reps: "6-10", restSeconds: 240, order: 1 },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: "8-10", restSeconds: 180, order: 2 },
      { exerciseName: "Leg Press", sets: 3, reps: "12-15", restSeconds: 120, order: 3 },
      { exerciseName: "Leg Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 4 },
      { exerciseName: "Hip Thrust", sets: 3, reps: "12-15", restSeconds: 90, order: 5 },
      { exerciseName: "Standing Calf Raise", sets: 4, reps: "15-20", restSeconds: 60, order: 6 },
    ],
  },
  {
    name: "PPL 4x — Full Body Accessory Day",
    description: "4-day PPL variant — Day 4 is a lighter full-body day hitting weak points.",
    splitType: "PPL", objective: "hypertrophy", frequency: 4, dayLabel: "Full Body Accessory",
    muscleGroups: ["chest", "back", "shoulders", "quads", "hamstrings"],
    exercises: [
      { exerciseName: "Incline Dumbbell Press", sets: 3, reps: "12-15", restSeconds: 90, order: 1 },
      { exerciseName: "Cable Row", sets: 3, reps: "12-15", restSeconds: 90, order: 2 },
      { exerciseName: "Bulgarian Split Squat", sets: 3, reps: "10-12", restSeconds: 90, order: 3 },
      { exerciseName: "Lateral Raise", sets: 3, reps: "15-20", restSeconds: 60, order: 4 },
      { exerciseName: "Leg Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
      { exerciseName: "Cable Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 6 },
    ],
  },

  // ════════════════════════════════════════════════
  // FAT LOSS — 4x/week circuit-style
  // ════════════════════════════════════════════════
  {
    name: "Fat Loss 4x — Upper Body Circuit",
    description: "4-day fat loss program. Higher rep ranges, shorter rest, compound movements to maximize calorie burn while preserving muscle.",
    splitType: "Upper_Lower", objective: "fat_loss", frequency: 4, dayLabel: "Upper A",
    muscleGroups: ["chest", "back", "shoulders", "arms"],
    exercises: [
      { exerciseName: "Dumbbell Bench Press", sets: 3, reps: "12-15", restSeconds: 60, order: 1 },
      { exerciseName: "Dumbbell Row", sets: 3, reps: "12-15", restSeconds: 60, order: 2 },
      { exerciseName: "Dumbbell Shoulder Press", sets: 3, reps: "12-15", restSeconds: 60, order: 3 },
      { exerciseName: "Lat Pulldown", sets: 3, reps: "12-15", restSeconds: 60, order: 4 },
      { exerciseName: "Dumbbell Curl", sets: 2, reps: "15", restSeconds: 45, order: 5 },
      { exerciseName: "Tricep Pushdown", sets: 2, reps: "15", restSeconds: 45, order: 6 },
    ],
  },
  {
    name: "Fat Loss 4x — Lower Body Circuit",
    description: "4-day fat loss program — lower body day emphasizing metabolic stress.",
    splitType: "Upper_Lower", objective: "fat_loss", frequency: 4, dayLabel: "Lower A",
    muscleGroups: ["quads", "hamstrings", "glutes", "calves"],
    exercises: [
      { exerciseName: "Goblet Squat", sets: 3, reps: "15", restSeconds: 60, order: 1 },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: "12-15", restSeconds: 60, order: 2 },
      { exerciseName: "Walking Lunge", sets: 3, reps: "12 each", restSeconds: 60, order: 3 },
      { exerciseName: "Leg Curl", sets: 3, reps: "15", restSeconds: 60, order: 4 },
      { exerciseName: "Hip Thrust", sets: 3, reps: "15", restSeconds: 60, order: 5 },
      { exerciseName: "Jump Squat", sets: 2, reps: "15", restSeconds: 45, notes: "Cardio finisher", order: 6 },
    ],
  },
];
