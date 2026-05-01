/**
 * GoalValidator — real-time evidence-based warnings for goal parameters.
 * Renders nothing when all parameters are within safe ranges.
 *
 * Evidence sources:
 * - ISSN Position Stand on dieting: 0.5–1.0% BW/week fat loss max
 * - WHO minimum calorie intake: 1200 kcal/day
 * - Hypertrophy research (Schoenfeld): >0.5 kg/week bulk → fat gain likely
 * - Duration: <4 weeks insufficient for measurable body comp change
 */
import type { GoalCalculation } from "./goalCalc";
import {
  MAX_SAFE_LOSS_KG_PER_WEEK,
  AGGRESSIVE_LOSS_KG_PER_WEEK,
  MAX_LEAN_BULK_KG_PER_WEEK,
  MIN_CALORIES,
  MIN_DURATION_WEEKS,
} from "./goalCalc";

export interface GoalValidatorProps {
  calculation:   GoalCalculation;
  durationWeeks: number;
  currentWeight: number;
  /** If true, show a compact single-line warning instead of full panel */
  compact?: boolean;
}

interface Warning {
  level:   "error" | "warn" | "info";
  message: string;
  cite?:   string; // short citation
}

export function buildWarnings(
  calc: GoalCalculation,
  durationWeeks: number,
  currentWeight: number,
): Warning[] {
  const ws: Warning[] = [];
  const weeklyLoss = calc.weeklyChange; // negative = loss

  // Server-side feasibility flag
  if (!calc.feasible && calc.warning) {
    ws.push({ level: "error", message: calc.warning });
  }

  // Rate of loss
  if (weeklyLoss < -MAX_SAFE_LOSS_KG_PER_WEEK) {
    ws.push({
      level: "error",
      message: `Loss rate of ${Math.abs(weeklyLoss).toFixed(2)} kg/week exceeds the safe maximum of 1.0 kg/week. Severe muscle loss and hormonal disruption likely.`,
      cite: "ISSN Position Stand 2014",
    });
  } else if (weeklyLoss < -AGGRESSIVE_LOSS_KG_PER_WEEK) {
    ws.push({
      level: "warn",
      message: `Loss rate of ${Math.abs(weeklyLoss).toFixed(2)} kg/week is aggressive. Consider adding a deload week every 6–8 weeks and monitoring performance.`,
      cite: "ISSN guidelines",
    });
  }

  // Rate of gain
  if (weeklyLoss > MAX_LEAN_BULK_KG_PER_WEEK) {
    ws.push({
      level: "warn",
      message: `Gain rate of ${weeklyLoss.toFixed(2)} kg/week exceeds the lean-bulk threshold. Expect significant fat gain alongside muscle. Consider a slower approach.`,
      cite: "Schoenfeld & Grgic 2018",
    });
  }

  // Minimum calories
  if (calc.dailyCalories < MIN_CALORIES) {
    ws.push({
      level: "error",
      message: `Daily calories of ${Math.round(calc.dailyCalories)} kcal fall below the safe minimum of ${MIN_CALORIES} kcal. Micronutrient deficiencies and metabolic adaptation are likely.`,
      cite: "WHO/FAO/UNU 2004",
    });
  } else if (calc.dailyCalories < 1500 && weeklyLoss < 0) {
    ws.push({
      level: "info",
      message: `${Math.round(calc.dailyCalories)} kcal/day is quite low. Track hunger and energy carefully and consider a diet break if performance declines.`,
    });
  }

  // Duration
  if (durationWeeks < MIN_DURATION_WEEKS) {
    ws.push({
      level: "warn",
      message: `${durationWeeks} week${durationWeeks === 1 ? "" : "s"} is too short for measurable body composition change. Aim for at least 4–6 weeks.`,
    });
  }

  // Protein adequacy check (1.6–2.2 g/kg bodyweight is evidence-based range)
  const proteinPerKg = calc.proteinGrams / currentWeight;
  if (proteinPerKg < 1.4) {
    ws.push({
      level: "warn",
      message: `Protein target (${calc.proteinGrams.toFixed(0)}g = ${proteinPerKg.toFixed(1)}g/kg) is below the recommended 1.6 g/kg for body recomposition. Consider increasing protein.`,
      cite: "Morton et al. 2018 meta-analysis",
    });
  }

  return ws;
}

const LEVEL_STYLES: Record<Warning["level"], string> = {
  error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300",
  warn:  "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300",
  info:  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300",
};

const LEVEL_ICONS: Record<Warning["level"], string> = {
  error: "🚫",
  warn:  "⚠️",
  info:  "ℹ️",
};

export function GoalValidator({ calculation, durationWeeks, currentWeight, compact = false }: GoalValidatorProps) {
  const warnings = buildWarnings(calculation, durationWeeks, currentWeight);
  if (warnings.length === 0) return null;

  if (compact) {
    // Single most-severe warning only
    const top = warnings.sort((a, b) => {
      const rank = { error: 0, warn: 1, info: 2 };
      return rank[a.level] - rank[b.level];
    })[0];
    return (
      <p className={`text-xs rounded-lg px-2.5 py-1.5 border ${LEVEL_STYLES[top.level]}`}>
        {LEVEL_ICONS[top.level]} {top.message}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div key={i} className={`rounded-xl border px-3 py-2.5 ${LEVEL_STYLES[w.level]}`}>
          <p className="text-sm font-medium">{LEVEL_ICONS[w.level]} {w.message}</p>
          {w.cite && (
            <p className="text-xs opacity-70 mt-0.5">Source: {w.cite}</p>
          )}
        </div>
      ))}
    </div>
  );
}
