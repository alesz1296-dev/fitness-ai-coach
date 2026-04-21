/**
 * normalizeExercise.ts
 *
 * Standardises exercise names so that "bench press", "Bench Press",
 * "bench  press", "BP", etc. all collapse to the same canonical string.
 * This keeps progression charts and PR detection reliable.
 */

// ── Alias map ──────────────────────────────────────────────────────────────────
// Keys: lowercase aliases / shorthands
// Values: canonical name (title-cased, no abbreviations)
const ALIASES: Record<string, string> = {
  // Bench
  "bp":                        "Bench Press",
  "flat bench":                "Bench Press",
  "flat bench press":          "Bench Press",
  "chest press":               "Bench Press",
  // Incline bench
  "ibp":                       "Incline Bench Press",
  "incline bp":                "Incline Bench Press",
  // Overhead press
  "ohp":                       "Overhead Press",
  "military press":            "Overhead Press",
  "shoulder press":            "Overhead Press",
  "standing press":            "Overhead Press",
  // Squat variants
  "back squat":                "Barbell Squat",
  "barbell back squat":        "Barbell Squat",
  "sq":                        "Barbell Squat",
  // Deadlift
  "dl":                        "Deadlift",
  "conventional deadlift":     "Deadlift",
  // Romanian deadlift
  "rdl":                       "Romanian Deadlift",
  "stiff leg deadlift":        "Romanian Deadlift",
  "stiff-leg deadlift":        "Romanian Deadlift",
  // Pull-up / chin-up
  "pull up":                   "Pull-Up",
  "pullup":                    "Pull-Up",
  "pull ups":                  "Pull-Up",
  "chin up":                   "Chin-Up",
  "chinup":                    "Chin-Up",
  "chin ups":                  "Chin-Up",
  // Row
  "bent over row":             "Barbell Row",
  "bent-over row":             "Barbell Row",
  "bb row":                    "Barbell Row",
  "barbell bent over row":     "Barbell Row",
  "cable row":                 "Seated Cable Row",
  "seated row":                "Seated Cable Row",
  // Curl
  "bb curl":                   "Barbell Curl",
  "barbell bicep curl":        "Barbell Curl",
  "db curl":                   "Dumbbell Curl",
  "dumbbell bicep curl":       "Dumbbell Curl",
  "hammer curl":               "Hammer Curl",
  // Triceps
  "skull crusher":             "Skull Crusher",
  "skullcrusher":              "Skull Crusher",
  "ez bar skull crusher":      "Skull Crusher",
  "tricep pushdown":           "Tricep Pushdown",
  "triceps pushdown":          "Tricep Pushdown",
  "cable pushdown":            "Tricep Pushdown",
  "rope pushdown":             "Tricep Pushdown",
  "overhead tricep extension": "Overhead Tricep Extension",
  // Lateral raise
  "lat raise":                 "Lateral Raise",
  "lateral raises":            "Lateral Raise",
  "side raise":                "Lateral Raise",
  // Leg exercises
  "leg ext":                   "Leg Extension",
  "leg curl":                  "Leg Curl",
  "lying leg curl":            "Leg Curl",
  "seated leg curl":           "Leg Curl",
  "hip thrust":                "Hip Thrust",
  "glute bridge":              "Glute Bridge",
  "calf raise":                "Calf Raise",
  "standing calf raise":       "Calf Raise",
  // Abs
  "ab crunch":                 "Crunch",
  "crunches":                  "Crunch",
  "sit up":                    "Sit-Up",
  "situp":                     "Sit-Up",
  "sit ups":                   "Sit-Up",
  "plank hold":                "Plank",
  // Cardio / bodyweight
  "push up":                   "Push-Up",
  "pushup":                    "Push-Up",
  "push ups":                  "Push-Up",
  "dip":                       "Dips",
  "chest dip":                 "Dips",
  "tricep dip":                "Dips",
};

// ── Title-case helper ──────────────────────────────────────────────────────────
// Capitalises first letter of each word, lowercase the rest.
// Preserves hyphens: "pull-up" → "Pull-Up"
function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join("-")
    )
    .join(" ");
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Normalise an exercise name to its canonical form.
 *
 * Steps:
 * 1. Trim whitespace & collapse internal spaces
 * 2. Look up in alias map
 * 3. Fall back to title-case of the cleaned input
 *
 * @example
 *   normalizeExerciseName("  bench  press ") → "Bench Press"
 *   normalizeExerciseName("ohp")             → "Overhead Press"
 *   normalizeExerciseName("Incline DB Press")→ "Incline Db Press"  // unknown → title-cased
 */
export function normalizeExerciseName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ").toLowerCase();
  return ALIASES[cleaned] ?? toTitleCase(cleaned);
}
