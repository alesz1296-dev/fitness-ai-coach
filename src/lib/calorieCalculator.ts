/**
 * Calorie & macro calculation utilities.
 * Based on Mifflin-St Jeor TDEE formula + evidence-based macro splits.
 */

export type GoalType = "cut" | "bulk" | "maintain";

export interface CalcInput {
  currentWeight: number;  // kg
  targetWeight: number;   // kg
  targetDate: Date;
  age?: number | null;
  height?: number | null; // cm
  activityLevel?: string | null;
  sex?: string | null;    // male | female (defaults to male if unknown)
}

export interface CalcResult {
  type: GoalType;
  tdee: number;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  weeklyChange: number;   // kg/week projected
  weeksToGoal: number;
  feasible: boolean;      // false if change rate is too aggressive
  warning?: string;
}

// TDEE activity multipliers
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,  // desk job, no exercise
  light:       1.375, // 1-3 days/week
  moderate:    1.55,  // 3-5 days/week
  active:      1.725, // 6-7 days/week
  very_active: 1.9,   // physical job + training
};

export const calculateTDEE = (
  weight: number,
  height: number | null | undefined,
  age: number | null | undefined,
  activityLevel: string | null | undefined,
  sex = "male"
): number => {
  // Mifflin-St Jeor BMR
  const h = height || 175;
  const a = age || 25;
  const bmr = sex === "female"
    ? 10 * weight + 6.25 * h - 5 * a - 161
    : 10 * weight + 6.25 * h - 5 * a + 5;

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel || "moderate"] || 1.55;
  return Math.round(bmr * multiplier);
};

export const calculateCalorieGoal = (input: CalcInput): CalcResult => {
  const { currentWeight, targetWeight, targetDate, age, height, activityLevel } = input;

  const tdee = calculateTDEE(currentWeight, height, age, activityLevel);
  const weightDiff = targetWeight - currentWeight;
  const today = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksToGoal = Math.max(1, Math.round((targetDate.getTime() - today.getTime()) / msPerWeek));

  const type: GoalType = weightDiff < -0.5 ? "cut" : weightDiff > 0.5 ? "bulk" : "maintain";

  let weeklyChange = 0;
  let dailyCalories = tdee;
  let feasible = true;
  let warning: string | undefined;

  if (type === "maintain") {
    dailyCalories = tdee;
    weeklyChange = 0;
  } else {
    // 1 kg of fat ≈ 7700 kcal
    weeklyChange = weightDiff / weeksToGoal;
    const dailyAdjustment = (weeklyChange * 7700) / 7;
    dailyCalories = Math.round(tdee + dailyAdjustment);

    // Safety checks
    if (type === "cut" && weeklyChange < -1.0) {
      feasible = false;
      warning = `Projected loss of ${Math.abs(weeklyChange).toFixed(2)}kg/week is aggressive. 0.5–0.75kg/week is optimal for muscle retention.`;
      // Cap at -1kg/week
      weeklyChange = -1.0;
      dailyCalories = Math.round(tdee - (1.0 * 7700) / 7);
    }
    if (type === "bulk" && weeklyChange > 0.5) {
      feasible = false;
      warning = `Projected gain of ${weeklyChange.toFixed(2)}kg/week risks excess fat gain. 0.25–0.5kg/week is optimal.`;
      weeklyChange = 0.5;
      dailyCalories = Math.round(tdee + (0.5 * 7700) / 7);
    }
    if (dailyCalories < 1200) {
      dailyCalories = 1200;
      warning = "Daily calories floored at 1200kcal minimum for safety.";
    }
  }

  // Macro split (priority: protein first)
  // Protein: 2.0g per kg bodyweight (muscle preservation on cut, growth on bulk)
  const proteinGrams = Math.round(currentWeight * 2.0);
  const proteinCals = proteinGrams * 4;

  // Fats: 25% of total calories (minimum for hormonal health)
  const fatsCals = Math.round(dailyCalories * 0.25);
  const fatsGrams = Math.round(fatsCals / 9);

  // Carbs: remainder
  const carbsCals = dailyCalories - proteinCals - fatsCals;
  const carbsGrams = Math.max(0, Math.round(carbsCals / 4));

  return {
    type,
    tdee,
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatsGrams,
    weeklyChange: Math.round(weeklyChange * 100) / 100,
    weeksToGoal,
    feasible,
    ...(warning && { warning }),
  };
};

/**
 * Generate weekly projected weight data points for a chart.
 */
export const generateProjection = (
  currentWeight: number,
  weeklyChange: number,
  weeks: number
): Array<{ week: number; date: string; projectedWeight: number }> => {
  const points = [];
  const today = new Date();

  for (let i = 0; i <= weeks; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i * 7);
    points.push({
      week: i,
      date: date.toISOString().split("T")[0],
      projectedWeight: Math.round((currentWeight + weeklyChange * i) * 10) / 10,
    });
  }
  return points;
};
