/**
 * Prediction Engine — body composition & weight trajectory forecasting.
 *
 * Uses two independent models and compares them:
 *  1. LINEAR REGRESSION  — fits a line through all weight data to find the
 *     real-world rate of change (kg/week). Requires ≥ 5 weight readings.
 *  2. CALORIE BALANCE    — uses avg calorie intake, estimated TDEE, and avg
 *     exercise calories to derive the *theoretical* weight change that the
 *     mathematics predicts. Requires ≥ 7 days of food logs.
 *
 * Both models are projected 12 weeks forward. The gap between them is the
 * "adherence vs ideal" insight that coaches care about most.
 *
 * Body composition layer:
 *  - Lean-mass rate estimated from training frequency + protein adherence
 *  - Fat mass = total weight change − lean mass change
 *  - Projected body-fat % if a recent BF% estimate is available
 *
 * Minimum data required: 7 days (returned as hasEnoughData = false before that)
 * Updates: every time the endpoint is hit — always computed from latest data.
 */

import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { calculateTDEE } from "../lib/calorieCalculator.js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeeklySnapshot {
  weekNum: number;
  weekStart: string;
  weekEnd: string;
  avgWeight: number | null;
  weightChange: number | null; // kg vs previous week (null for first)
  avgCalories: number | null;
  avgProtein: number | null;
  totalWorkouts: number;
  avgExerciseCals: number;
  netBalance: number | null;   // kcal: intake − TDEE
}

interface TrendResult {
  slopePerWeek: number;  // kg/week (negative = losing weight)
  r2: number;            // goodness-of-fit 0→1
  intercept: number;     // kg at day-0 of regression window
  confidence: "insufficient" | "low" | "medium" | "high";
}

interface CalorieModelResult {
  avgDailyIntake: number;
  estimatedTDEE: number;
  avgExerciseCals: number;
  avgNetBalance: number;              // kcal/day (intake − TDEE + exercise)
  theoreticalWeeklyChange: number;    // kg/week
}

interface ProjectionPoint {
  week: number;
  date: string;
  // Weight forecasts
  trendWeight: number | null;   // from linear regression
  idealWeight: number | null;   // from calorie balance model
  // Confidence band around trend (±1 SE from regression)
  trendLow: number | null;
  trendHigh: number | null;
  // Body composition (estimated)
  bodyFatPct: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/** Simple linear regression: y = slope*x + intercept, returns slope, intercept, r² */
function linearRegression(points: { x: number; y: number }[]): {
  slope: number; intercept: number; r2: number; se: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0, se: 0 };

  const xBar = points.reduce((s, p) => s + p.x, 0) / n;
  const yBar = points.reduce((s, p) => s + p.y, 0) / n;

  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (const p of points) {
    ssXY += (p.x - xBar) * (p.y - yBar);
    ssXX += (p.x - xBar) ** 2;
    ssYY += (p.y - yBar) ** 2;
  }

  const slope     = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = yBar - slope * xBar;
  const r2        = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY);

  // Standard error of residuals
  const residuals = points.map((p) => p.y - (slope * p.x + intercept));
  const sse       = residuals.reduce((s, r) => s + r * r, 0);
  const se        = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;

  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)), se };
}

/** Round to N decimal places */
function round(v: number, dp = 2): number {
  return Math.round(v * 10 ** dp) / 10 ** dp;
}

function timezoneFromHeaders(req: AuthRequest): string {
  const raw = req.headers["x-timezone"];
  const tz = Array.isArray(raw) ? raw[0] : raw;
  return typeof tz === "string" && /^[A-Za-z0-9_+\-./]+$/.test(tz)
    ? tz
    : "UTC";
}

function dayKey(date: Date | string, timezone: string): string {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Return local date string for Date offset by N days */
function offsetDate(base: Date, days: number, timezone = "UTC"): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return dayKey(d, timezone);
}

/** Classify a day string into week bucket (0-indexed from the earliest day) */
function weekIndex(dateStr: string, minDateStr: string): number {
  const ms = new Date(dateStr).getTime() - new Date(minDateStr).getTime();
  return Math.floor(ms / (7 * 86400000));
}

// ── Lean-mass gain estimation ─────────────────────────────────────────────────
/**
 * Estimate weekly lean-mass gain in kg based on training stimulus and diet.
 * Conservative values from natural training research.
 */
function estimateLeanMassGainPerWeek(params: {
  weeklyWorkouts: number;
  proteinAdequate: boolean; // avg protein ≥ 1.6g/kg/day
  goalType: "cut" | "bulk" | "maintain" | "unknown";
  trainingDaysPerWeek?: number | null;
}): number {
  const { weeklyWorkouts, proteinAdequate, goalType } = params;
  const sessions = Math.max(weeklyWorkouts, params.trainingDaysPerWeek ?? 0);

  if (sessions === 0) return 0;

  // Base monthly gain rates (kg/month) by phase — from meta-analyses
  let monthlyGain = 0;
  if (goalType === "bulk") {
    monthlyGain = sessions >= 4 ? 0.8 : sessions >= 2 ? 0.5 : 0.3;
  } else if (goalType === "cut") {
    monthlyGain = proteinAdequate ? 0.0 : -0.15; // preserve or slight loss
  } else {
    monthlyGain = sessions >= 4 ? 0.4 : sessions >= 2 ? 0.25 : 0.1;
  }

  if (!proteinAdequate) monthlyGain *= 0.6; // penalty for low protein

  return round(monthlyGain / 4.33, 3); // convert to per-week
}

// ── Main controller ───────────────────────────────────────────────────────────

// GET /api/predictions
export const getPredictions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const timezone = timezoneFromHeaders(req);

    // ── 1. Fetch all data ────────────────────────────────────────────────────

    const [user, weightLogs, workouts, activeGoal] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          weight: true, height: true, age: true, sex: true,
          activityLevel: true, goal: true, proteinMultiplier: true,
          trainingDaysPerWeek: true, trainingHoursPerDay: true,
          planAdjustmentMode: true,
        },
      }),
      prisma.weightLog.findMany({
        where:   { userId },
        orderBy: { date: "asc" },
        select:  { weight: true, date: true },
      }),
      prisma.workout.findMany({
        where:   { userId },
        orderBy: { date: "asc" },
        select:  { date: true, caloriesBurned: true, duration: true },
      }),
      prisma.calorieGoal.findFirst({
        where:   { userId, active: true },
        orderBy: { createdAt: "desc" },
        select:  {
          id: true, type: true, targetWeight: true, targetDate: true,
          dailyCalories: true, tdee: true, proteinGrams: true, weeklyChange: true,
          carbsGrams: true, fatsGrams: true,
        },
      }),
    ]);

    // Food logs: daily aggregates
    const foodAggs = await prisma.$queryRawUnsafe<
      { day: string; totalCal: number; totalProtein: number; entries: number }[]
    >(
      `SELECT
         ("date" AT TIME ZONE '${timezone}')::date AS day,
         SUM(calories) AS "totalCal",
         SUM(COALESCE(protein, 0)) AS "totalProtein",
         COUNT(*) AS entries
       FROM "FoodLog"
       WHERE "userId" = ${userId}
       GROUP BY "date"::date
       ORDER BY day ASC`
    );
    for (const row of foodAggs as Array<{ day: string | Date }>) {
      row.day = row.day instanceof Date ? dayKey(row.day, timezone) : String(row.day).slice(0, 10);
    }

    // ── 2. Early-exit if insufficient data ──────────────────────────────────

    const totalDaysWithData = Math.max(
      weightLogs.length > 0
        ? Math.round(
            (new Date(weightLogs[weightLogs.length - 1].date).getTime() -
              new Date(weightLogs[0].date).getTime()) /
              86400000
          ) + 1
        : 0,
      foodAggs.length
    );

    if (totalDaysWithData < 7) {
      res.json({
        hasEnoughData: false,
        daysLogged: totalDaysWithData,
        weeksOfData: 0,
        message: `Keep logging! Predictions unlock after 7 days of data (${7 - totalDaysWithData} day${7 - totalDaysWithData !== 1 ? "s" : ""} to go).`,
      });
      return;
    }

    // ── 3. Compute TDEE estimate ─────────────────────────────────────────────

    const currentWeight =
      (weightLogs.length > 0
        ? weightLogs[weightLogs.length - 1].weight
        : user?.weight) ?? 75;

    const estimatedTDEE =
      activeGoal?.tdee ??
      (user
        ? calculateTDEE(
            currentWeight,
            user.height,
            user.age,
            user.activityLevel,
            user.sex ?? "male",
            user.trainingDaysPerWeek,
            user.trainingHoursPerDay
          )
        : 2000);

    // ── 4. Build weekly snapshots ────────────────────────────────────────────

    const allDates = [
      ...weightLogs.map((w) => dayKey(w.date, timezone)),
      ...foodAggs.map((f) => f.day),
      ...workouts.map((w) => dayKey(w.date, timezone)),
    ].sort();
    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];
    const totalWeeks = weekIndex(maxDate, minDate) + 1;

    // Index food by day
    const foodByDay = new Map(foodAggs.map((f) => [f.day, f]));

    // Index weight by day (if multiple readings same day, use last)
    const weightByDay = new Map<string, number>();
    for (const w of weightLogs) {
      weightByDay.set(dayKey(w.date, timezone), w.weight);
    }

    // Index workouts by day
    const workoutsByDay = new Map<string, { count: number; cals: number }>();
    for (const w of workouts) {
      const d = dayKey(w.date, timezone);
      const existing = workoutsByDay.get(d) ?? { count: 0, cals: 0 };
      workoutsByDay.set(d, {
        count: existing.count + 1,
        cals: existing.cals + (w.caloriesBurned ?? 0),
      });
    }

    const weeklySnapshots: WeeklySnapshot[] = [];
    let prevWeekAvgWeight: number | null = null;

    for (let w = 0; w < totalWeeks; w++) {
      const weekStartDate = new Date(minDate);
      weekStartDate.setDate(weekStartDate.getDate() + w * 7);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      // Collect daily data for this week
      const weights: number[] = [];
      const calories: number[] = [];
      const proteins: number[] = [];
      let totalWorkoutsInWeek = 0;
      let totalExerciseCals = 0;

      for (let d = 0; d < 7; d++) {
        const dayStr = offsetDate(weekStartDate, d, timezone);
        if (dayStr > maxDate) break;

        const wt = weightByDay.get(dayStr);
        if (wt != null) weights.push(wt);

        const fd = foodByDay.get(dayStr);
        if (fd) {
          calories.push(Number(fd.totalCal));
          proteins.push(Number(fd.totalProtein));
        }

        const wo = workoutsByDay.get(dayStr);
        if (wo) {
          totalWorkoutsInWeek += wo.count;
          totalExerciseCals += wo.cals;
        }
      }

      const avgWeight     = weights.length > 0 ? round(weights.reduce((s, x) => s + x, 0) / weights.length, 1) : null;
      const avgCalories   = calories.length > 0 ? round(calories.reduce((s, x) => s + x, 0) / calories.length, 0) : null;
      const avgProtein    = proteins.length > 0 ? round(proteins.reduce((s, x) => s + x, 0) / proteins.length, 1) : null;
      const avgExerciseCals = totalWorkoutsInWeek > 0 ? round(totalExerciseCals / 7, 0) : 0;
      const netBalance    = avgCalories != null ? round(avgCalories - estimatedTDEE + avgExerciseCals, 0) : null;
      const weightChange  = avgWeight != null && prevWeekAvgWeight != null
        ? round(avgWeight - prevWeekAvgWeight, 2)
        : null;

      weeklySnapshots.push({
        weekNum:  w + 1,
        weekStart: dayKey(weekStartDate, timezone),
        weekEnd:   dayKey(weekEndDate, timezone),
        avgWeight,
        weightChange,
        avgCalories,
        avgProtein,
        totalWorkouts: totalWorkoutsInWeek,
        avgExerciseCals,
        netBalance,
      });

      if (avgWeight != null) prevWeekAvgWeight = avgWeight;
    }

    // ── 5. Linear regression on weight data ─────────────────────────────────

    const regressionPoints = weightLogs.map((w) => ({
      x: (w.date.getTime() - new Date(minDate).getTime()) / 86400000, // days from start
      y: w.weight,
    }));

    const reg = linearRegression(regressionPoints);
    const slopePerDay = reg.slope;
    const slopePerWeek = round(slopePerDay * 7, 3);

    let confidence: TrendResult["confidence"] = "insufficient";
    if (weightLogs.length >= 5  && reg.r2 >= 0.5) confidence = "medium";
    if (weightLogs.length >= 10 && reg.r2 >= 0.7) confidence = "high";
    if (weightLogs.length >= 3  && reg.r2 < 0.5)  confidence = "low";
    if (weightLogs.length >= 5  && reg.r2 < 0.3)  confidence = "low";
    if (weightLogs.length < 3) confidence = "insufficient";

    const realTrend: TrendResult = {
      slopePerWeek,
      r2: round(reg.r2, 3),
      intercept: round(reg.intercept, 2),
      confidence,
    };

    // ── 6. Calorie balance model ─────────────────────────────────────────────

    const daysWithFood   = foodAggs.length;
    const avgDailyIntake = daysWithFood > 0
      ? round(foodAggs.reduce((s, f) => s + Number(f.totalCal), 0) / daysWithFood, 0)
      : 0;
    const avgExerciseCals = workouts.length > 0
      ? round(
          workouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0) /
          (totalDaysWithData || 1),
          0
        )
      : 0;
    const avgNetBalance         = round(avgDailyIntake - estimatedTDEE + avgExerciseCals, 0);
    const theoreticalWeeklyChange = round((avgNetBalance * 7) / 7700, 3);

    const calorieModel: CalorieModelResult = {
      avgDailyIntake,
      estimatedTDEE,
      avgExerciseCals,
      avgNetBalance,
      theoreticalWeeklyChange,
    };

    // ── 7. Body composition setup ────────────────────────────────────────────

    // Determine goal phase
    const goalType: "cut" | "bulk" | "maintain" | "unknown" =
      activeGoal?.type === "cut" ? "cut" :
      activeGoal?.type === "bulk" ? "bulk" :
      activeGoal?.type === "maintain" ? "maintain" :
      slopePerWeek < -0.1 ? "cut" :
      slopePerWeek > 0.1  ? "bulk" : "maintain";

    // Protein adequacy: ≥ 1.6g/kg/day is minimum for muscle retention
    const proteinTarget = currentWeight * 1.6;
    const avgProteinAll = foodAggs.length > 0
      ? foodAggs.reduce((s, f) => s + Number(f.totalProtein), 0) / foodAggs.length
      : 0;
    const proteinAdequate = avgProteinAll >= proteinTarget;

    // Avg weekly workouts
    const weeklyWorkoutsAvg = totalWeeks > 0
      ? round(workouts.length / totalWeeks, 1)
      : 0;

    const leanGainPerWeek = estimateLeanMassGainPerWeek({
      weeklyWorkouts: weeklyWorkoutsAvg,
      proteinAdequate,
      goalType,
      trainingDaysPerWeek: user?.trainingDaysPerWeek,
    });

    // Estimate starting body fat% from BMI (Deurenberg formula if no explicit reading)
    const h = (user?.height ?? 175) / 100;
    const bmi = currentWeight / (h * h);
    const ageVal = user?.age ?? 30;
    const isFemale = user?.sex === "female";
    const startBodyFatPct = round(
      1.20 * bmi + 0.23 * ageVal - 10.8 * (isFemale ? 0 : 1) - 5.4,
      1
    );
    const startFatMassKg   = round(currentWeight * startBodyFatPct / 100, 1);
    const startLeanMassKg  = round(currentWeight - startFatMassKg, 1);

    // ── 8. Build 12-week projection ──────────────────────────────────────────

    const today = new Date();
    const todayStr = dayKey(today, timezone);
    const projections: ProjectionPoint[] = [];

    // Regression x-value for today (days since first weight log)
    const todayX = weightLogs.length > 0
      ? (today.getTime() - new Date(weightLogs[0].date).getTime()) / 86400000
      : 0;

    // Trend weight at t=0 (today) from regression
    const trendWeightToday = reg.slope * todayX + reg.intercept;

    // Ideal weight at t=0 (use the most recent actual weight)
    const idealWeightToday = currentWeight;

    let cumulativeLeanChange = 0;
    let cumulativeFatChange  = 0;

    for (let w = 0; w <= 12; w++) {
      const projDate = offsetDate(today, w * 7, timezone);

      // Trend projection (linear regression extrapolated)
      const trendWeight = confidence !== "insufficient"
        ? round(trendWeightToday + slopePerWeek * w, 1)
        : null;

      // ±1 standard-error band widening over time
      const seBand = confidence !== "insufficient"
        ? round(reg.se * Math.sqrt(1 + w * 0.15), 1)
        : null;

      // Ideal (calorie model) projection
      const idealWeight = daysWithFood >= 7
        ? round(idealWeightToday + theoreticalWeeklyChange * w, 1)
        : null;

      // Body composition: accumulate weekly changes
      if (w > 0) {
        const weeklyWeightChange = trendWeight != null
          ? (trendWeightToday + slopePerWeek * w) - (trendWeightToday + slopePerWeek * (w - 1))
          : theoreticalWeeklyChange;

        cumulativeLeanChange += leanGainPerWeek;
        // Fat change = total weight change - lean change
        cumulativeFatChange  += weeklyWeightChange - leanGainPerWeek;
      }

      const projLean    = round(startLeanMassKg + cumulativeLeanChange, 1);
      const projFat     = round(startFatMassKg  + cumulativeFatChange,  1);
      const projWeight  = trendWeight ?? idealWeight ?? round(currentWeight + (slopePerWeek || theoreticalWeeklyChange) * w, 1);
      const projBFPct   = projWeight > 0
        ? round((projFat / projWeight) * 100, 1)
        : startBodyFatPct;

      projections.push({
        week: w,
        date: projDate,
        trendWeight,
        idealWeight,
        trendLow:  trendWeight != null && seBand != null ? round(trendWeight - seBand, 1) : null,
        trendHigh: trendWeight != null && seBand != null ? round(trendWeight + seBand, 1) : null,
        bodyFatPct: projBFPct,
        leanMassKg: projLean,
        fatMassKg:  Math.max(0, projFat),
      });
    }

    // ── 9. Goal date prediction ──────────────────────────────────────────────

    let estimatedGoalDate: string | null = null;
    let idealGoalDate:     string | null = null;
    const targetWeight = activeGoal?.targetWeight ?? null;

    if (targetWeight != null && currentWeight !== targetWeight) {
      const weightGap = targetWeight - currentWeight;

      if (slopePerWeek !== 0 && confidence !== "insufficient") {
        const weeksNeeded = weightGap / slopePerWeek;
        if (weeksNeeded > 0 && weeksNeeded < 260) { // <5 years
          estimatedGoalDate = offsetDate(today, Math.round(weeksNeeded * 7), timezone);
        }
      }

      if (theoreticalWeeklyChange !== 0) {
        const weeksNeeded = weightGap / theoreticalWeeklyChange;
        if (weeksNeeded > 0 && weeksNeeded < 260) {
          idealGoalDate = offsetDate(today, Math.round(weeksNeeded * 7), timezone);
        }
      }
    }

    // ── 10. Adherence & consistency scores ───────────────────────────────────

    const daysSinceStart = Math.max(1, Math.round(
      (today.getTime() - new Date(minDate).getTime()) / 86400000
    ) + 1);
    const foodAdherence    = Math.min(100, Math.round((foodAggs.length / daysSinceStart) * 100));
    const weightAdherence  = Math.min(100, Math.round((weightLogs.length / Math.max(1, totalWeeks)) * 10) * 10); // logs per week * 10
    const workoutAdherence = user?.trainingDaysPerWeek
      ? Math.min(100, Math.round((weeklyWorkoutsAvg / user.trainingDaysPerWeek) * 100))
      : null;

    const adherenceScore = Math.round(
      (foodAdherence * 0.5) +
      (Math.min(100, weightAdherence) * 0.3) +
      ((workoutAdherence ?? 70) * 0.2)
    );

    const requiredWeeklyChange = activeGoal?.weeklyChange ?? theoreticalWeeklyChange;
    const canCompareModels =
      confidence !== "insufficient" &&
      Math.abs(theoreticalWeeklyChange) >= 0.05;
    const rawResponseFactor = canCompareModels
      ? slopePerWeek / theoreticalWeeklyChange
      : null;
    const responseFactor = rawResponseFactor == null
      ? null
      : round(Math.max(-2, Math.min(2, rawResponseFactor)), 2);
    const adaptiveWeeklyChange = responseFactor != null
      ? round(theoreticalWeeklyChange * responseFactor, 3)
      : slopePerWeek;

    const actualPath = weightLogs.map((w) => ({
      date: dayKey(w.date, timezone),
      weight: w.weight,
    }));
    const smoothedActualPath = actualPath.map((point, i, arr) => {
      const window = arr.slice(Math.max(0, i - 6), i + 1);
      const avg = window.reduce((s, p) => s + p.weight, 0) / window.length;
      return { ...point, weight: round(avg, 1) };
    });
    const idealPath = projections.map((p) => ({
      week: p.week,
      date: p.date,
      weight: p.idealWeight,
    }));
    const adaptivePath = projections.map((p) => ({
      week: p.week,
      date: p.date,
      weight: round(currentWeight + adaptiveWeeklyChange * p.week, 1),
    }));
    const toleranceBand = idealPath.map((p) => {
      const idealWeight = p.weight ?? currentWeight;
      const tolerance = Math.max(0.4, currentWeight * 0.005);
      return {
        week: p.week,
        date: p.date,
        low: round(idealWeight - tolerance, 1),
        high: round(idealWeight + tolerance, 1),
      };
    });

    const safeWeeklyPct =
      goalType === "cut" ? { min: -1.0, max: -0.25 } :
      goalType === "bulk" ? { min: 0.1, max: 0.5 } :
      { min: -0.25, max: 0.25 };
    const requiredWeeklyPct = currentWeight
      ? round((requiredWeeklyChange / currentWeight) * 100, 2)
      : 0;
    const currentWeeklyPct = currentWeight
      ? round((slopePerWeek / currentWeight) * 100, 2)
      : 0;
    const goalAggressiveness =
      requiredWeeklyPct < safeWeeklyPct.min || requiredWeeklyPct > safeWeeklyPct.max
        ? "aggressive"
        : Math.abs(requiredWeeklyPct) < 0.1
          ? "conservative"
          : "reasonable";

    const planDeviation = round(slopePerWeek - requiredWeeklyChange, 3);
    const isBehind =
      goalType === "cut"
        ? slopePerWeek > requiredWeeklyChange + 0.1
        : goalType === "bulk"
          ? slopePerWeek < requiredWeeklyChange - 0.1
          : Math.abs(slopePerWeek) > 0.15;
    const isTooAggressive =
      goalAggressiveness === "aggressive" ||
      (goalType === "cut" && slopePerWeek < -currentWeight * 0.0125) ||
      (goalType === "bulk" && slopePerWeek > currentWeight * 0.0075);
    const planStatus =
      confidence === "insufficient" ? "needs_more_data" :
      isTooAggressive ? "too_aggressive" :
      isBehind ? "behind" :
      Math.abs(planDeviation) <= 0.1 ? "on_track" :
      "ahead";

    const adaptiveGoalDate = (() => {
      if (!targetWeight || adaptiveWeeklyChange === 0) return null;
      const weeksNeeded = (targetWeight - currentWeight) / adaptiveWeeklyChange;
      return weeksNeeded > 0 && weeksNeeded < 260
        ? offsetDate(today, Math.round(weeksNeeded * 7), timezone)
        : null;
    })();
    const etaDrift =
      activeGoal?.targetDate && adaptiveGoalDate
        ? Math.round(
            (new Date(adaptiveGoalDate).getTime() -
              new Date(activeGoal.targetDate).getTime()) / 86400000
          )
        : null;
    const suggestedPostponedDate =
      etaDrift != null && etaDrift > 7 ? adaptiveGoalDate : null;

    const calorieNudge =
      planStatus === "behind"
        ? goalType === "cut" ? -150 : goalType === "bulk" ? 150 : 0
        : planStatus === "too_aggressive"
          ? goalType === "cut" ? 150 : goalType === "bulk" ? -100 : 0
          : 0;
    const adjustmentMode = (user as any)?.planAdjustmentMode ?? "suggest";
    const recommendedAdjustment = {
      mode: adjustmentMode,
      targetGoalId: activeGoal?.id ?? null,
      action:
        confidence === "insufficient" ? "improve_logging" :
        calorieNudge !== 0 ? "adjust_calories" :
        suggestedPostponedDate ? "suggest_date_change" :
        "hold",
      calorieDelta: calorieNudge,
      nextDailyCalories: activeGoal?.dailyCalories && calorieNudge !== 0
        ? Math.max(1200, Math.round(activeGoal.dailyCalories + calorieNudge))
        : null,
      suggestedTargetDate: suggestedPostponedDate,
      reason:
        confidence === "insufficient"
          ? "More consistent weight and food logs are needed before changing the plan."
          : planStatus === "behind"
            ? "Your adaptive trend is behind the ideal plan."
            : planStatus === "too_aggressive"
              ? "The current pace may be too aggressive for performance or adherence."
              : "Your trend is close enough to the plan to hold steady.",
      canAutoApply:
        adjustmentMode === "auto" &&
        confidence === "high" &&
        calorieNudge !== 0,
    };

    const insights = [
      `Current trend: ${slopePerWeek >= 0 ? "+" : ""}${slopePerWeek} kg/week (${currentWeeklyPct >= 0 ? "+" : ""}${currentWeeklyPct}% BW/week).`,
      `Plan requires: ${requiredWeeklyChange >= 0 ? "+" : ""}${round(requiredWeeklyChange, 2)} kg/week (${requiredWeeklyPct >= 0 ? "+" : ""}${requiredWeeklyPct}% BW/week).`,
      `Trend confidence is ${confidence}.`,
      proteinAdequate
        ? "Protein is adequate for preserving or gaining lean mass."
        : "Average protein is below the 1.6 g/kg minimum often used for muscle retention.",
      workoutAdherence == null
        ? "Set planned training days to improve workout adherence diagnostics."
        : `Workout adherence is ${workoutAdherence}%.`,
    ];

    // ── 11. Respond ──────────────────────────────────────────────────────────

    res.json({
      hasEnoughData: true,
      daysLogged:    daysSinceStart,
      weeksOfData:   totalWeeks,
      currentWeight,
      targetWeight,
      goalType,
      startBodyFatPct,
      startLeanMassKg,

      realTrend,
      calorieModel,

      weeklyHistory: weeklySnapshots,
      projections,
      idealPath,
      actualPath,
      smoothedActualPath,
      adaptivePath,
      toleranceBand,
      responseFactor,
      planDeviation,
      etaDrift,
      trendConfidence: confidence,
      goalAggressiveness,
      goalChallenge: {
        status: planStatus,
        safeWeeklyPct,
        requiredWeeklyPct,
        currentWeeklyPct,
        suggestedPostponedDate,
      },
      recommendedAdjustment,
      insights,

      estimatedGoalDate,
      idealGoalDate,
      adaptiveGoalDate,
      scheduledGoalDate: activeGoal?.targetDate
        ? dayKey(activeGoal.targetDate, timezone)
        : null,

      adherenceScore,
      foodAdherence,
      weightAdherence: Math.min(100, weightAdherence),
      workoutAdherence,
      weeklyWorkoutsAvg,
      avgProteinAll:   round(avgProteinAll, 0),
      proteinAdequate,
      leanGainPerWeek,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/predictions/preview
// Returns a temporary "what if" forecast without saving the active goal.
export const previewPrediction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const timezone = timezoneFromHeaders(req);
    const body = req.body ?? {};

    const [user, weightLogs, activeGoal] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          weight: true, height: true, age: true, sex: true,
          activityLevel: true, trainingDaysPerWeek: true, trainingHoursPerDay: true,
          planAdjustmentMode: true,
        },
      }),
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        select: { weight: true, date: true },
      }),
      prisma.calorieGoal.findFirst({
        where: { userId, active: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, type: true, targetWeight: true, targetDate: true,
          dailyCalories: true, tdee: true, proteinGrams: true,
          carbsGrams: true, fatsGrams: true, weeklyChange: true,
        },
      }),
    ]);

    if (!activeGoal) {
      res.status(400).json({ error: "Create an active goal before previewing changes." });
      return;
    }

    const today = new Date();
    const currentWeight = (weightLogs.at(-1)?.weight ?? user?.weight ?? activeGoal.targetWeight) || 75;
    const targetWeight = Number(body.targetWeight ?? activeGoal.targetWeight);
    const targetDateInput = String(body.targetDate ?? dayKey(activeGoal.targetDate, timezone));
    const targetDate = Number.isNaN(new Date(`${targetDateInput}T12:00:00`).getTime())
      ? dayKey(activeGoal.targetDate, timezone)
      : targetDateInput;
    const dailyCalories = Number(body.dailyCalories ?? activeGoal.dailyCalories);
    const proteinGrams = Number(body.proteinGrams ?? activeGoal.proteinGrams);
    const carbsGrams = Number(body.carbsGrams ?? activeGoal.carbsGrams);
    const fatsGrams = Number(body.fatsGrams ?? activeGoal.fatsGrams);
    const caloriesBurned = Number(body.caloriesBurned ?? 0);
    const workoutDaysPerWeek = Number(body.workoutDaysPerWeek ?? user?.trainingDaysPerWeek ?? 0);
    const workoutMinutesPerWeek = Number(
      body.workoutMinutesPerWeek ??
      ((user?.trainingHoursPerDay ?? 0) * 60 * Math.max(1, workoutDaysPerWeek))
    );

    const estimatedTDEE =
      activeGoal.tdee ??
      (user
        ? calculateTDEE(
            currentWeight,
            user.height,
            user.age,
            user.activityLevel,
            user.sex ?? "male",
            workoutDaysPerWeek || user.trainingDaysPerWeek,
            workoutMinutesPerWeek
              ? workoutMinutesPerWeek / 60 / Math.max(1, workoutDaysPerWeek)
              : user.trainingHoursPerDay,
          )
        : 2000);

    const foodLogs = await prisma.foodLog.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      select: { date: true, calories: true, protein: true, carbs: true, fats: true },
    });
    const foodDays = new Set(foodLogs.map((f) => dayKey(f.date, timezone))).size || 1;
    const avgLoggedCalories = foodLogs.reduce((s, f) => s + f.calories, 0) / foodDays;
    const avgLoggedProtein = foodLogs.reduce((s, f) => s + (f.protein ?? 0), 0) / foodDays;
    const avgLoggedCarbs = foodLogs.reduce((s, f) => s + (f.carbs ?? 0), 0) / foodDays;
    const avgLoggedFats = foodLogs.reduce((s, f) => s + (f.fats ?? 0), 0) / foodDays;

    const regressionPoints = weightLogs.map((w) => ({
      x: weightLogs.length > 0 ? (w.date.getTime() - weightLogs[0].date.getTime()) / 86400000 : 0,
      y: w.weight,
    }));
    const reg = linearRegression(regressionPoints);
    const slopePerWeek = round(reg.slope * 7, 3);
    const confidence: TrendResult["confidence"] =
      weightLogs.length >= 10 && reg.r2 >= 0.7 ? "high" :
      weightLogs.length >= 5 && reg.r2 >= 0.5 ? "medium" :
      weightLogs.length >= 3 ? "low" :
      "insufficient";

    const baselineWeeklyChange =
      activeGoal.weeklyChange ||
      round(((activeGoal.dailyCalories - estimatedTDEE) * 7) / 7700, 3);
    const rawResponseFactor =
      confidence === "insufficient" || Math.abs(baselineWeeklyChange) < 0.05
        ? null
        : slopePerWeek / baselineWeeklyChange;
    const responseFactor = rawResponseFactor == null
      ? null
      : round(Math.max(-2, Math.min(2, rawResponseFactor)), 2);

    const previewNetBalance = dailyCalories - estimatedTDEE + caloriesBurned;
    const idealWeeklyChange = round((previewNetBalance * 7) / 7700, 3);
    const adaptiveWeeklyChange = round(idealWeeklyChange * (responseFactor ?? 1), 3);
    const weeksToTargetDate = Math.max(
      1,
      Math.round((new Date(`${targetDate}T12:00:00`).getTime() - today.getTime()) / (7 * 86400000)),
    );
    const requiredWeeklyChange = round((targetWeight - currentWeight) / weeksToTargetDate, 3);
    const requiredWeeklyPct = round((requiredWeeklyChange / currentWeight) * 100, 2);
    const currentWeeklyPct = round((adaptiveWeeklyChange / currentWeight) * 100, 2);
    const goalType =
      targetWeight < currentWeight - 0.2 ? "cut" :
      targetWeight > currentWeight + 0.2 ? "bulk" :
      "maintain";
    const safeWeeklyPct =
      goalType === "cut" ? { min: -1.0, max: -0.25 } :
      goalType === "bulk" ? { min: 0.1, max: 0.5 } :
      { min: -0.25, max: 0.25 };
    const goalAggressiveness =
      requiredWeeklyPct < safeWeeklyPct.min || requiredWeeklyPct > safeWeeklyPct.max
        ? "aggressive"
        : Math.abs(requiredWeeklyPct) < 0.1
          ? "conservative"
          : "reasonable";

    const previewPath = Array.from({ length: 13 }, (_, week) => ({
      week,
      date: offsetDate(today, week * 7, timezone),
      weight: round(currentWeight + adaptiveWeeklyChange * week, 1),
    }));
    const idealPath = Array.from({ length: 13 }, (_, week) => ({
      week,
      date: offsetDate(today, week * 7, timezone),
      weight: round(currentWeight + idealWeeklyChange * week, 1),
    }));

    const adaptiveGoalDate = (() => {
      if (!targetWeight || adaptiveWeeklyChange === 0) return null;
      const weeksNeeded = (targetWeight - currentWeight) / adaptiveWeeklyChange;
      return weeksNeeded > 0 && weeksNeeded < 260
        ? offsetDate(today, Math.round(weeksNeeded * 7), timezone)
        : null;
    })();
    const etaDrift = adaptiveGoalDate
      ? Math.round((new Date(adaptiveGoalDate).getTime() - new Date(`${targetDate}T12:00:00`).getTime()) / 86400000)
      : null;
    const suggestedPostponedDate = etaDrift != null && etaDrift > 7 ? adaptiveGoalDate : null;
    const planStatus =
      confidence === "insufficient" ? "needs_more_data" :
      goalAggressiveness === "aggressive" ? "too_aggressive" :
      Math.abs(adaptiveWeeklyChange - requiredWeeklyChange) <= 0.1 ? "on_track" :
      goalType === "cut"
        ? adaptiveWeeklyChange > requiredWeeklyChange ? "behind" : "ahead"
        : adaptiveWeeklyChange < requiredWeeklyChange ? "behind" : "ahead";

    const calorieDelta = Math.round(dailyCalories - activeGoal.dailyCalories);
    const macroDelta = {
      protein: Math.round(proteinGrams - activeGoal.proteinGrams),
      carbs: Math.round(carbsGrams - activeGoal.carbsGrams),
      fats: Math.round(fatsGrams - activeGoal.fatsGrams),
    };

    res.json({
      previewOnly: true,
      currentWeight,
      targetWeight,
      targetDate,
      previewPath,
      idealPath,
      adaptiveGoalDate,
      etaDrift,
      responseFactor,
      trendConfidence: confidence,
      goalAggressiveness,
      goalChallenge: {
        status: planStatus,
        safeWeeklyPct,
        requiredWeeklyPct,
        currentWeeklyPct,
        suggestedPostponedDate,
      },
      recommendation: {
        action:
          confidence === "insufficient" ? "improve_logging" :
          suggestedPostponedDate ? "suggest_date_change" :
          calorieDelta !== 0 || macroDelta.protein !== 0 || macroDelta.carbs !== 0 || macroDelta.fats !== 0
            ? "preview_adjustment"
            : "hold",
        reason:
          confidence === "insufficient"
            ? "The preview is available, but more consistent weight and food logs are needed before trusting a plan change."
            : suggestedPostponedDate
              ? "This version predicts the target after the selected date; consider postponing or changing calories/training."
              : "This version keeps the adaptive trend close enough to the plan to compare before applying.",
        calorieDelta,
        macroDelta,
        suggestedTargetDate: suggestedPostponedDate,
      },
      diagnostics: {
        avgLoggedCalories: Math.round(avgLoggedCalories),
        avgLoggedProtein: Math.round(avgLoggedProtein),
        avgLoggedCarbs: Math.round(avgLoggedCarbs),
        avgLoggedFats: Math.round(avgLoggedFats),
        estimatedTDEE: Math.round(estimatedTDEE),
        previewNetBalance: Math.round(previewNetBalance),
        workoutDaysPerWeek,
        workoutMinutesPerWeek,
      },
    });
  } catch (err) {
    next(err);
  }
};
