/**
 * goalCalc.ts — shared goal calculation constants and utilities.
 * Single source of truth for both GoalForm (create) and EditGoalModal (edit).
 */

// ── Preset templates ──────────────────────────────────────────────────────────
export interface GoalPreset {
  key:       string;
  icon:      string;
  label:     string;
  desc:      string;
  color:     string; // Tailwind active-state classes
  weightPct: number; // target = currentWeight × (1 + weightPct/100)
  weeks:     number;
  goalName:  string;
}

export const GOAL_PRESETS: GoalPreset[] = [
  {
    key: "cut_moderate", icon: "🔥", label: "Fat Loss",
    desc: "−8% body weight · 16 weeks · ~500 kcal deficit",
    color: "border-orange-300 bg-orange-50 text-orange-800",
    weightPct: -8, weeks: 16, goalName: "Fat Loss Plan",
  },
  {
    key: "cut_aggressive", icon: "⚡", label: "Aggressive Cut",
    desc: "−12% body weight · 12 weeks · ~750 kcal deficit",
    color: "border-red-300 bg-red-50 text-red-800",
    weightPct: -12, weeks: 12, goalName: "Aggressive Cut",
  },
  {
    key: "lean_bulk", icon: "💪", label: "Lean Bulk",
    desc: "+4% body weight · 16 weeks · ~300 kcal surplus",
    color: "border-blue-300 bg-blue-50 text-blue-800",
    weightPct: 4, weeks: 16, goalName: "Lean Bulk",
  },
  {
    key: "muscle_build", icon: "🏋️", label: "Muscle Building",
    desc: "+7% body weight · 20 weeks · ~500 kcal surplus",
    color: "border-purple-300 bg-purple-50 text-purple-800",
    weightPct: 7, weeks: 20, goalName: "Muscle Building",
  },
  {
    key: "maintain", icon: "⚖️", label: "Maintenance",
    desc: "Eat at TDEE · stay at current weight",
    color: "border-green-300 bg-green-50 text-green-800",
    weightPct: 0, weeks: 12, goalName: "Maintenance",
  },
  {
    key: "recomp", icon: "🔄", label: "Body Recomposition",
    desc: "TDEE calories · gain muscle, hold weight · 20 weeks",
    color: "border-cyan-300 bg-cyan-50 text-cyan-800",
    weightPct: 0, weeks: 20, goalName: "Body Recomposition",
  },
];

// ── Evidence-based validation thresholds ─────────────────────────────────────
/** Maximum recommended fat-loss rate (ISSN guidelines: ~0.5–1% BW/week) */
export const MAX_SAFE_LOSS_KG_PER_WEEK = 1.0;
/** Above this loss rate: aggressive — muscle loss risk */
export const AGGRESSIVE_LOSS_KG_PER_WEEK = 0.75;
/** Maximum recommended lean-bulk rate to minimise fat gain */
export const MAX_LEAN_BULK_KG_PER_WEEK = 0.5;
/** Absolute minimum calorie floor (WHO minimum for micronutrient adequacy) */
export const MIN_CALORIES = 1200;
/** Minimum recommended duration for any meaningful body-composition goal */
export const MIN_DURATION_WEEKS = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────
export function addWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

export function computeGoalType(
  currentWeight: number,
  targetWeight: number,
): "cut" | "bulk" | "maintain" {
  if (targetWeight < currentWeight - 0.5) return "cut";
  if (targetWeight > currentWeight + 0.5) return "bulk";
  return "maintain";
}

export function weeksUntil(targetDate: string): number {
  const now  = new Date();
  const then = new Date(targetDate);
  return Math.max(0, Math.round((then.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

// ── Preview API response types (mirrors backend) ──────────────────────────────
export interface GoalCalculation {
  dailyCalories:  number;
  proteinGrams:   number;
  carbsGrams:     number;
  fatsGrams:      number;
  weeklyChange:   number; // kg/week (negative = loss)
  tdee:           number;
  feasible:       boolean;
  warning?:       string;
}

export interface CyclingSplit {
  trainDayCalories: number;
  restDayCalories:  number;
}

export interface ProjectionPoint {
  date:            string; // YYYY-MM-DD
  projectedWeight: number;
  actual?:         number | null;
}

export interface GoalPreviewResponse {
  calculation:   GoalCalculation;
  cyclingSplit?: CyclingSplit;
  projection:    ProjectionPoint[];
}
