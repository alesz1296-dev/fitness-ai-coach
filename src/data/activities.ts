/**
 * Activity MET values and calorie-burn helpers.
 *
 * MET (Metabolic Equivalent of Task) = ratio of task energy cost to resting energy cost.
 * Formula: kcal/hour = MET × weight_kg
 * Reference: Compendium of Physical Activities (Ainsworth et al.)
 */

export interface Activity {
  id: string;
  name: string;
  category: "weights" | "cardio" | "sports" | "daily";
  icon: string;
  /** MET value at the listed intensity */
  met: number;
  /** Short intensity label */
  intensity: string;
  /** Optional steps/distance context */
  notes?: string;
}

export const ACTIVITIES: Activity[] = [
  // ── Resistance / Weights ─────────────────────────────────────────────────
  { id: "weights_general",   name: "Weight training (general)",    category: "weights", icon: "🏋️",  met: 3.5,  intensity: "moderate" },
  { id: "weights_vigorous",  name: "Weight training (vigorous)",   category: "weights", icon: "🏋️",  met: 6.0,  intensity: "vigorous" },
  { id: "circuit_training",  name: "Circuit training",             category: "weights", icon: "🔄",  met: 8.0,  intensity: "high"     },
  { id: "powerlifting",      name: "Powerlifting",                 category: "weights", icon: "💪",  met: 6.0,  intensity: "vigorous" },
  { id: "crossfit",          name: "CrossFit / HIIT weights",      category: "weights", icon: "⚡",  met: 8.0,  intensity: "very high" },
  { id: "bodyweight",        name: "Calisthenics / bodyweight",    category: "weights", icon: "🤸",  met: 3.8,  intensity: "moderate" },

  // ── Cardio – Running ──────────────────────────────────────────────────────
  { id: "running_slow",      name: "Running (slow, ~8 km/h)",      category: "cardio", icon: "🏃",  met: 8.0,  intensity: "moderate", notes: "~8 km/h / 5 mph" },
  { id: "running_moderate",  name: "Running (moderate, ~10 km/h)", category: "cardio", icon: "🏃",  met: 10.0, intensity: "vigorous", notes: "~10 km/h / 6 mph" },
  { id: "running_fast",      name: "Running (fast, ~12 km/h)",     category: "cardio", icon: "🏃",  met: 11.5, intensity: "high",     notes: "~12 km/h / 7.5 mph" },
  { id: "jogging",           name: "Jogging (easy)",               category: "cardio", icon: "🏃",  met: 7.0,  intensity: "moderate", notes: "~6–7 km/h" },
  { id: "treadmill",         name: "Treadmill (walking, incline)", category: "cardio", icon: "🏃",  met: 5.0,  intensity: "moderate" },

  // ── Cardio – Walking / Steps ──────────────────────────────────────────────
  { id: "walking_slow",      name: "Walking (slow, ~3 km/h)",      category: "cardio", icon: "🚶",  met: 2.8,  intensity: "light",    notes: "~3–4 km/h" },
  { id: "walking_moderate",  name: "Walking (brisk, ~5 km/h)",     category: "cardio", icon: "🚶",  met: 3.5,  intensity: "moderate", notes: "~5 km/h / 3 mph" },
  { id: "walking_fast",      name: "Walking (fast, ~6.5 km/h)",    category: "cardio", icon: "🚶",  met: 4.3,  intensity: "moderate", notes: "~6.5 km/h / 4 mph" },
  { id: "walking_steps",     name: "Steps / commuting on foot",    category: "daily",  icon: "👟",  met: 3.0,  intensity: "light",    notes: "everyday step count" },
  { id: "hiking",            name: "Hiking (trail)",               category: "cardio", icon: "🥾",  met: 6.0,  intensity: "moderate" },
  { id: "stair_climbing",    name: "Stair climbing",               category: "cardio", icon: "🪜",  met: 8.0,  intensity: "vigorous" },

  // ── Cardio – Cycling ──────────────────────────────────────────────────────
  { id: "cycling_leisure",   name: "Cycling (leisure, <16 km/h)", category: "cardio", icon: "🚴",  met: 4.0,  intensity: "light",    notes: "<16 km/h" },
  { id: "cycling_moderate",  name: "Cycling (moderate, 19–22 km/h)", category: "cardio", icon: "🚴", met: 8.0, intensity: "moderate", notes: "19–22 km/h" },
  { id: "cycling_vigorous",  name: "Cycling (fast, >24 km/h)",   category: "cardio", icon: "🚴",  met: 10.0, intensity: "vigorous", notes: ">24 km/h" },
  { id: "stationary_bike",   name: "Stationary bike (moderate)", category: "cardio", icon: "🚴",  met: 6.8,  intensity: "moderate" },
  { id: "spinning",          name: "Indoor cycling / spinning",   category: "cardio", icon: "🚴",  met: 8.5,  intensity: "vigorous" },

  // ── Cardio – Swimming ─────────────────────────────────────────────────────
  { id: "swimming_leisure",  name: "Swimming (leisurely)",        category: "cardio", icon: "🏊",  met: 6.0,  intensity: "moderate" },
  { id: "swimming_laps",     name: "Swimming (laps, moderate)",   category: "cardio", icon: "🏊",  met: 7.0,  intensity: "moderate" },
  { id: "swimming_vigorous", name: "Swimming (vigorous effort)",  category: "cardio", icon: "🏊",  met: 9.8,  intensity: "vigorous" },
  { id: "water_polo",        name: "Water polo",                  category: "sports", icon: "🏊",  met: 10.0, intensity: "vigorous" },

  // ── Cardio – Rowing / Other ───────────────────────────────────────────────
  { id: "rowing_moderate",   name: "Rowing ergometer (moderate)", category: "cardio", icon: "🚣",  met: 7.0,  intensity: "moderate" },
  { id: "rowing_vigorous",   name: "Rowing ergometer (vigorous)", category: "cardio", icon: "🚣",  met: 8.5,  intensity: "vigorous" },
  { id: "jump_rope",         name: "Jump rope / skipping",        category: "cardio", icon: "⏭️",  met: 11.8, intensity: "vigorous" },
  { id: "elliptical",        name: "Elliptical trainer",          category: "cardio", icon: "🔄",  met: 5.0,  intensity: "moderate" },
  { id: "hiit",              name: "HIIT (general)",              category: "cardio", icon: "⚡",  met: 9.0,  intensity: "very high" },
  { id: "boxing",            name: "Boxing / kickboxing",         category: "cardio", icon: "🥊",  met: 9.0,  intensity: "vigorous" },

  // ── Sports ────────────────────────────────────────────────────────────────
  { id: "basketball",        name: "Basketball",                  category: "sports", icon: "🏀",  met: 6.5,  intensity: "moderate" },
  { id: "soccer",            name: "Football / soccer",           category: "sports", icon: "⚽",  met: 7.0,  intensity: "moderate" },
  { id: "tennis",            name: "Tennis (singles)",            category: "sports", icon: "🎾",  met: 7.3,  intensity: "moderate" },
  { id: "volleyball",        name: "Volleyball",                  category: "sports", icon: "🏐",  met: 3.0,  intensity: "light"    },
  { id: "yoga",              name: "Yoga / stretching",           category: "daily",  icon: "🧘",  met: 2.5,  intensity: "light"    },
  { id: "pilates",           name: "Pilates",                     category: "daily",  icon: "🧘",  met: 3.0,  intensity: "light"    },
  { id: "dancing",           name: "Dancing (aerobic)",           category: "cardio", icon: "💃",  met: 5.5,  intensity: "moderate" },
  { id: "martial_arts",      name: "Martial arts / judo / karate",category: "sports", icon: "🥋",  met: 10.5, intensity: "vigorous" },
];

/**
 * Estimate calories burned.
 * @param activityId - Activity.id from ACTIVITIES list
 * @param durationMin - Duration in minutes
 * @param weightKg - User body weight in kg (default 75 if unknown)
 */
export function estimateCaloriesBurned(
  activityId: string,
  durationMin: number,
  weightKg = 75,
): number {
  const act = ACTIVITIES.find((a) => a.id === activityId);
  if (!act || durationMin <= 0) return 0;
  // kcal = MET × weight_kg × hours
  return Math.round(act.met * weightKg * (durationMin / 60));
}

// ── Cardio + Weights Combo Suggestions ───────────────────────────────────────

export interface CardioSuggestion {
  title: string;
  cardioActivity: string;   // activity id
  cardioDurationMin: number;
  weightsDurationMin: number;
  rationale: string;
}

/**
 * Return goal-appropriate cardio + weights combo suggestions.
 * @param goal - user goal string (e.g. "lose_fat", "build_muscle", "improve endurance")
 * @param activityLevel - user activity level
 * @param likedActivities - activity ids the user has logged (for personalisation)
 */
export function getCardioWeightsSuggestions(
  goal?: string | null,
  activityLevel?: string | null,
  likedActivities: string[] = [],
): CardioSuggestion[] {
  const g = goal?.toLowerCase() ?? "";

  const prefersLowImpact = likedActivities.some((id) =>
    ["swimming_laps", "swimming_leisure", "cycling_leisure", "stationary_bike", "walking_moderate", "walking_steps"].includes(id)
  );
  const prefersRunning = likedActivities.some((id) =>
    ["jogging", "running_slow", "running_moderate", "running_fast"].includes(id)
  );
  const prefersWalking = likedActivities.some((id) =>
    ["walking_moderate", "walking_fast", "walking_steps", "hiking"].includes(id)
  );

  // Fat loss / weight loss
  if (g.includes("lose") || g.includes("fat")) {
    const suggestions: CardioSuggestion[] = [
      {
        title: "Compound + Steady-State Cardio",
        cardioActivity: prefersRunning ? "running_slow" : prefersWalking ? "walking_fast" : "jogging",
        cardioDurationMin: 30,
        weightsDurationMin: 40,
        rationale: "40 min compound lifts first depletes glycogen so the 30 min cardio burns more fat. 3–4×/week.",
      },
      {
        title: "Weights + HIIT Finisher",
        cardioActivity: "hiit",
        cardioDurationMin: 15,
        weightsDurationMin: 45,
        rationale: "45 min weights followed by a 15 min HIIT finisher elevates EPOC for hours. 2–3×/week.",
      },
    ];
    if (prefersWalking || activityLevel === "sedentary" || activityLevel === "light") {
      suggestions.push({
        title: "Weights + Daily Step Goal",
        cardioActivity: "walking_steps",
        cardioDurationMin: 45,
        weightsDurationMin: 45,
        rationale: "Aim for 8,000–10,000 steps/day through regular walking (commute, lunch break). Add 3 lifting sessions per week.",
      });
    }
    if (prefersLowImpact) {
      suggestions.push({
        title: "Weights + Low-Impact Cardio",
        cardioActivity: "swimming_laps",
        cardioDurationMin: 30,
        weightsDurationMin: 40,
        rationale: "Great for joint-friendly fat burning. Swim for 30 min on rest days; lift 3×/week.",
      });
    }
    return suggestions;
  }

  // Muscle building / hypertrophy
  if (g.includes("muscle") || g.includes("recomp") || g.includes("bulk") || g.includes("strength")) {
    const suggestions: CardioSuggestion[] = [
      {
        title: "Minimal Cardio (Recovery Focus)",
        cardioActivity: prefersWalking ? "walking_moderate" : "cycling_leisure",
        cardioDurationMin: 20,
        weightsDurationMin: 60,
        rationale: "Keep cardio short (≤20 min, low intensity) so it aids recovery without interfering with muscle protein synthesis. Lift heavy 4–5×/week.",
      },
      {
        title: "Zone 2 Cardio for Conditioning",
        cardioActivity: prefersRunning ? "jogging" : "stationary_bike",
        cardioDurationMin: 25,
        weightsDurationMin: 55,
        rationale: "Zone 2 (conversational pace) improves cardiovascular health and insulin sensitivity without significant muscle loss. 2×/week on non-lifting days.",
      },
    ];
    if (prefersLowImpact) {
      suggestions.push({
        title: "Strength + Swimming Active Recovery",
        cardioActivity: "swimming_leisure",
        cardioDurationMin: 30,
        weightsDurationMin: 60,
        rationale: "Swimming on rest days reduces DOMS and keeps conditioning up without loading the joints.",
      });
    }
    return suggestions;
  }

  // Endurance
  if (g.includes("endurance") || g.includes("performance") || g.includes("run")) {
    return [
      {
        title: "Endurance Base + Auxiliary Strength",
        cardioActivity: prefersRunning ? "running_moderate" : "cycling_moderate",
        cardioDurationMin: 45,
        weightsDurationMin: 30,
        rationale: "Run/cycle 45 min for aerobic base; 30 min weights (lower body + core) to prevent injury. 3 cardio + 2 strength sessions/week.",
      },
      {
        title: "Long Run + Mobility / Strength",
        cardioActivity: "running_slow",
        cardioDurationMin: 60,
        weightsDurationMin: 20,
        rationale: "One longer easy run/week for endurance; follow with 20 min mobility work and light strength. Avoid heavy lifting the day after long runs.",
      },
    ];
  }

  // General / maintain
  return [
    {
      title: "Balanced 3+2 Split",
      cardioActivity: prefersWalking ? "walking_fast" : prefersRunning ? "jogging" : "cycling_moderate",
      cardioDurationMin: 30,
      weightsDurationMin: 45,
      rationale: "3 lifting sessions + 2 cardio sessions per week. Keeps you healthy, fit, and metabolically active.",
    },
    {
      title: "Active Daily Lifestyle",
      cardioActivity: "walking_steps",
      cardioDurationMin: 60,
      weightsDurationMin: 45,
      rationale: "Walking to work/school counts! Aim for 8,000 steps/day plus 2–3 lifting sessions. No gym cardio required.",
    },
  ];
}
