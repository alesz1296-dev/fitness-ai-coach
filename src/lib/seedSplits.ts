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

  // ════════════════════════════════════════════════
  // STRENGTH — POWERLIFTING / 5x5 PROGRAMS
  // ════════════════════════════════════════════════
  {
    name: "5/3/1 Strength — Press Day",
    description: "Jim Wendler's 5/3/1 program. Overhead press is the main lift. Assistance work follows the 'Boring But Big' template (5×10 at 50-60% 1RM).",
    splitType: "Full_Body", objective: "strength", frequency: 4, dayLabel: "Press Day",
    muscleGroups: ["shoulders", "triceps", "chest"],
    exercises: [
      { exerciseName: "Overhead Press", sets: 3, reps: "5/3/1", restSeconds: 300, notes: "Working up to top set. Use 5/3/1 percentages each wave.", order: 1 },
      { exerciseName: "Overhead Press", sets: 5, reps: "10", restSeconds: 90, notes: "BBB: 5×10 @ 50–60% 1RM", order: 2 },
      { exerciseName: "Dumbbell Row", sets: 5, reps: "10", restSeconds: 90, order: 3 },
      { exerciseName: "Face Pulls", sets: 3, reps: "15-20", restSeconds: 60, notes: "Shoulder health / rear delts", order: 4 },
      { exerciseName: "Tricep Pushdown", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
    ],
  },
  {
    name: "5/3/1 Strength — Deadlift Day",
    description: "Jim Wendler's 5/3/1 — Deadlift main lift + BBB assistance. Heavy pulling day.",
    splitType: "Full_Body", objective: "strength", frequency: 4, dayLabel: "Deadlift Day",
    muscleGroups: ["hamstrings", "back", "glutes", "traps"],
    exercises: [
      { exerciseName: "Conventional Deadlift", sets: 3, reps: "5/3/1", restSeconds: 360, notes: "Working up to top set. No BBB on deadlift — it's taxing enough.", order: 1 },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: "10", restSeconds: 120, notes: "Accessory hamstring work", order: 2 },
      { exerciseName: "Leg Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 3 },
      { exerciseName: "Barbell Row", sets: 5, reps: "10", restSeconds: 90, notes: "BBB assistance", order: 4 },
      { exerciseName: "Plank", sets: 3, reps: "30-60s", restSeconds: 60, notes: "Core stability", order: 5 },
    ],
  },
  {
    name: "5/3/1 Strength — Bench Day",
    description: "Jim Wendler's 5/3/1 — Bench press main lift + BBB assistance.",
    splitType: "Full_Body", objective: "strength", frequency: 4, dayLabel: "Bench Day",
    muscleGroups: ["chest", "triceps", "shoulders"],
    exercises: [
      { exerciseName: "Barbell Bench Press", sets: 3, reps: "5/3/1", restSeconds: 300, notes: "Working up to top set", order: 1 },
      { exerciseName: "Barbell Bench Press", sets: 5, reps: "10", restSeconds: 90, notes: "BBB: 5×10 @ 50–60% 1RM", order: 2 },
      { exerciseName: "Dumbbell Row", sets: 5, reps: "10", restSeconds: 90, order: 3 },
      { exerciseName: "Cable Chest Fly", sets: 3, reps: "12-15", restSeconds: 60, order: 4 },
      { exerciseName: "EZ-Bar Curl", sets: 3, reps: "12", restSeconds: 60, order: 5 },
    ],
  },
  {
    name: "5/3/1 Strength — Squat Day",
    description: "Jim Wendler's 5/3/1 — Squat main lift + BBB assistance. Heaviest lower body day.",
    splitType: "Full_Body", objective: "strength", frequency: 4, dayLabel: "Squat Day",
    muscleGroups: ["quads", "glutes", "hamstrings"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 3, reps: "5/3/1", restSeconds: 360, notes: "Working up to top set. Aim for AMRAP on final set.", order: 1 },
      { exerciseName: "Barbell Back Squat", sets: 5, reps: "10", restSeconds: 120, notes: "BBB: 5×10 @ 50–60% 1RM", order: 2 },
      { exerciseName: "Leg Press", sets: 3, reps: "10-12", restSeconds: 90, notes: "Accessory quad volume", order: 3 },
      { exerciseName: "Leg Curl", sets: 3, reps: "12-15", restSeconds: 60, order: 4 },
      { exerciseName: "Calf Raises", sets: 3, reps: "15-20", restSeconds: 45, order: 5 },
    ],
  },
  {
    name: "Powerlifting Peak — SBD Day A",
    description: "Competition-focused powerlifting peaking block. Day A: Squat heavy + Bench medium + accessory. Designed for intermediate/advanced lifters 6-8 weeks out from a meet.",
    splitType: "Full_Body", objective: "strength", frequency: 4, dayLabel: "SBD Day A",
    muscleGroups: ["quads", "chest", "back", "glutes"],
    exercises: [
      { exerciseName: "Barbell Back Squat", sets: 5, reps: "3", restSeconds: 360, notes: "85-90% 1RM. Perfect technique, no grinding.", order: 1 },
      { exerciseName: "Competition Pause Bench Press", sets: 4, reps: "4", restSeconds: 240, notes: "80-85% 1RM. Pause 1s on chest.", order: 2 },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: "6-8", restSeconds: 120, notes: "Accessory hamstring work", order: 3 },
      { exerciseName: "Lat Pulldown", sets: 3, reps: "10", restSeconds: 90, order: 4 },
      { exerciseName: "Tricep Pushdown", sets: 3, reps: "12-15", restSeconds: 60, order: 5 },
    ],
  },
  {
    name: "Powerlifting Peak — SBD Day B",
    description: "Competition peaking — Day B: Deadlift heavy + Overhead press + accessory.",
    splitType: "Full_Body", objective: "strength", frequency: 4, dayLabel: "SBD Day B",
    muscleGroups: ["hamstrings", "back", "shoulders", "glutes"],
    exercises: [
      { exerciseName: "Conventional Deadlift", sets: 4, reps: "3", restSeconds: 420, notes: "87-92% 1RM. Belt + chalk.", order: 1 },
      { exerciseName: "Close-Grip Bench Press", sets: 4, reps: "5", restSeconds: 180, notes: "Bench accessory / tricep strength", order: 2 },
      { exerciseName: "Overhead Press", sets: 3, reps: "5-6", restSeconds: 180, order: 3 },
      { exerciseName: "Cable Row", sets: 3, reps: "10", restSeconds: 90, order: 4 },
      { exerciseName: "Leg Press", sets: 3, reps: "10-12", restSeconds: 90, notes: "Accessory quad volume", order: 5 },
    ],
  },

  // ════════════════════════════════════════════════
  // ENDURANCE — RUNNING / CARDIO PROGRAMS
  // ════════════════════════════════════════════════
  {
    name: "Running Base — Easy Run Day",
    description: "5K-to-10K base building program. Easy run days build aerobic base at conversational pace (Zone 2). Do NOT go faster — aerobic base is built at low intensity.",
    splitType: "Custom", objective: "endurance", frequency: 4, dayLabel: "Easy Run",
    muscleGroups: ["cardio", "calves", "quads"],
    exercises: [
      { exerciseName: "Easy Run", sets: 1, reps: "30-45 min", restSeconds: 0, notes: "Zone 2 — can hold a conversation. 65-75% max HR.", order: 1 },
      { exerciseName: "Hip Flexor Stretch", sets: 2, reps: "30s each", restSeconds: 30, notes: "Post-run mobility", order: 2 },
      { exerciseName: "Hamstring Stretch", sets: 2, reps: "30s each", restSeconds: 30, order: 3 },
      { exerciseName: "Calf Raises", sets: 2, reps: "15-20", restSeconds: 45, notes: "Injury prevention", order: 4 },
    ],
  },
  {
    name: "Running Base — Interval Day",
    description: "Running program — interval day. Short fast intervals improve VO2max and running economy. Warm up 10 min easy, then run intervals at 85-95% max HR.",
    splitType: "Custom", objective: "endurance", frequency: 4, dayLabel: "Intervals",
    muscleGroups: ["cardio", "calves", "quads", "glutes"],
    exercises: [
      { exerciseName: "Easy Warm-Up Run", sets: 1, reps: "10 min", restSeconds: 0, notes: "Very easy pace to prepare legs", order: 1 },
      { exerciseName: "400m Run Interval", sets: 6, reps: "400m fast", restSeconds: 90, notes: "85-90% max effort. Goal pace = target 5K pace or faster.", order: 2 },
      { exerciseName: "Easy Cool-Down Run", sets: 1, reps: "10 min", restSeconds: 0, notes: "Very easy — bring heart rate down", order: 3 },
      { exerciseName: "Hip Flexor Stretch", sets: 2, reps: "30s each", restSeconds: 30, order: 4 },
    ],
  },
  {
    name: "Running Base — Tempo Run Day",
    description: "Running program — tempo run day. Sustained effort at lactate threshold pace (comfortably hard — can speak 3-4 word sentences). Builds race-pace fitness.",
    splitType: "Custom", objective: "endurance", frequency: 4, dayLabel: "Tempo Run",
    muscleGroups: ["cardio", "quads", "calves"],
    exercises: [
      { exerciseName: "Easy Warm-Up Run", sets: 1, reps: "10 min", restSeconds: 0, notes: "Easy jogging", order: 1 },
      { exerciseName: "Tempo Run", sets: 1, reps: "20-30 min", restSeconds: 0, notes: "Lactate threshold pace — comfortably hard. 80-87% max HR.", order: 2 },
      { exerciseName: "Easy Cool-Down Run", sets: 1, reps: "5-10 min", restSeconds: 0, order: 3 },
      { exerciseName: "Thoracic Rotation", sets: 2, reps: "10 each", restSeconds: 30, notes: "Upper back mobility", order: 4 },
    ],
  },
  {
    name: "Running Base — Long Run Day",
    description: "Running program — long run day. Slow, long run to build aerobic endurance. The cornerstone of any running program. Easy pace throughout.",
    splitType: "Custom", objective: "endurance", frequency: 4, dayLabel: "Long Run",
    muscleGroups: ["cardio", "quads", "hamstrings", "calves"],
    exercises: [
      { exerciseName: "Long Run", sets: 1, reps: "60-90 min", restSeconds: 0, notes: "Zone 2 entirely. 60-70% max HR. Increase distance by max 10% per week.", order: 1 },
      { exerciseName: "Hip Flexor Stretch", sets: 2, reps: "45s each", restSeconds: 30, order: 2 },
      { exerciseName: "Pigeon Pose", sets: 2, reps: "45s each", restSeconds: 30, order: 3 },
      { exerciseName: "Hamstring Stretch", sets: 2, reps: "45s each", restSeconds: 30, order: 4 },
    ],
  },
  {
    name: "HIIT Circuit — Full Body",
    description: "High-Intensity Interval Training. 40s on / 20s off circuit format. Burns maximum calories in minimum time. No equipment needed for most exercises.",
    splitType: "Custom", objective: "endurance", frequency: 3, dayLabel: "HIIT Circuit",
    muscleGroups: ["cardio", "quads", "chest", "shoulders", "core"],
    exercises: [
      { exerciseName: "Burpees", sets: 4, reps: "40s on / 20s off", restSeconds: 20, notes: "Full ROM — chest to floor, jump at top", order: 1 },
      { exerciseName: "Jump Squat", sets: 4, reps: "40s on / 20s off", restSeconds: 20, notes: "Land softly — absorb with knees", order: 2 },
      { exerciseName: "Mountain Climbers", sets: 4, reps: "40s on / 20s off", restSeconds: 20, notes: "Core tight throughout", order: 3 },
      { exerciseName: "Push-Up", sets: 4, reps: "40s on / 20s off", restSeconds: 20, order: 4 },
      { exerciseName: "High Knees", sets: 4, reps: "40s on / 20s off", restSeconds: 20, notes: "Drive arms, stay on balls of feet", order: 5 },
      { exerciseName: "Plank", sets: 2, reps: "60s", restSeconds: 60, notes: "Cool-down core hold", order: 6 },
    ],
  },
  {
    name: "Triathlon Prep — Swim/Bike/Run Conditioning",
    description: "3-sport conditioning for beginner triathletes. Each session covers one discipline plus dryland strength. 3 days/week leaves recovery days for actual swim/bike/run sessions.",
    splitType: "Custom", objective: "endurance", frequency: 3, dayLabel: "S/B/R Conditioning",
    muscleGroups: ["cardio", "back", "shoulders", "quads", "core"],
    exercises: [
      { exerciseName: "Easy Run", sets: 1, reps: "20 min", restSeconds: 0, notes: "Brick run — simulate post-bike fatigue", order: 1 },
      { exerciseName: "Lat Pulldown", sets: 3, reps: "12", restSeconds: 60, notes: "Swim strength — mimic pull pattern", order: 2 },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: "10", restSeconds: 90, notes: "Bike power — posterior chain", order: 3 },
      { exerciseName: "Hip Flexor Stretch", sets: 2, reps: "45s each", restSeconds: 30, notes: "Combat cycling hip tightness", order: 4 },
      { exerciseName: "Plank", sets: 3, reps: "45s", restSeconds: 45, notes: "Core stability for all 3 disciplines", order: 5 },
      { exerciseName: "Calf Raises", sets: 3, reps: "20", restSeconds: 45, notes: "Running/cycling ankle stability", order: 6 },
    ],
  },
  {
    name: "Cardio Conditioning — Rowing + Strength",
    description: "Rowing machine sessions combined with strength work for total-body conditioning. Great low-impact alternative for people with running injuries.",
    splitType: "Custom", objective: "endurance", frequency: 3, dayLabel: "Row + Strength",
    muscleGroups: ["cardio", "back", "quads", "core"],
    exercises: [
      { exerciseName: "Rowing Machine", sets: 1, reps: "2000m", restSeconds: 0, notes: "Focus on drive ratio: 1:2 pull:recover. Keep stroke rate 22-26 spm.", order: 1 },
      { exerciseName: "Barbell Row", sets: 3, reps: "8-10", restSeconds: 90, notes: "Reinforce the rowing pattern", order: 2 },
      { exerciseName: "Goblet Squat", sets: 3, reps: "12", restSeconds: 60, order: 3 },
      { exerciseName: "Plank", sets: 3, reps: "45s", restSeconds: 45, order: 4 },
      { exerciseName: "Rowing Machine", sets: 4, reps: "500m fast", restSeconds: 120, notes: "Interval finisher — max effort 500m pieces", order: 5 },
    ],
  },
];
