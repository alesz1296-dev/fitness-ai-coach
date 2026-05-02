import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { getDayBounds, tzFromRequest } from "../utils/dayBounds.js";

const db = prisma as any;

/**
 * Compute workout streak: how many consecutive calendar days (ending today or yesterday)
 * the user has logged at least one workout.
 */
async function computeWorkoutStreak(userId: number, now: Date): Promise<{ current: number; longest: number }> {
  // Fetch all distinct workout dates for the last 365 days
  const since = new Date(now);
  since.setDate(since.getDate() - 364);
  since.setHours(0, 0, 0, 0);

  const workouts = await prisma.workout.findMany({
    where: { userId, date: { gte: since } },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  // Build set of ISO date strings (YYYY-MM-DD) that have workouts
  const workoutDays = new Set<string>(
    workouts.map((w) => new Date(w.date).toISOString().split("T")[0])
  );

  // Current streak: count backwards from today (or yesterday if today has no workout)
  const todayStr = now.toISOString().split("T")[0];
  let current = 0;
  const cursor = new Date(now);

  // Start from today; if today has no workout yet, that's okay (streak still continues)
  // We count today if it has a workout; streak breaks only on days without workout
  let startedCounting = false;

  for (let i = 0; i < 365; i++) {
    const dayStr = cursor.toISOString().split("T")[0];
    if (workoutDays.has(dayStr)) {
      current++;
      startedCounting = true;
    } else if (startedCounting) {
      // Gap found — if it's today and we haven't counted anything yet, it's OK (rest today)
      if (dayStr === todayStr && current === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    } else if (dayStr === todayStr) {
      // Today has no workout yet — skip and check yesterday
    } else {
      break; // No workout and not today — streak is 0
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak: sliding window over all workout days
  const allDays = Array.from(workoutDays).sort();
  let longest = 0;
  let runLen = 0;
  let prevDate: Date | null = null;

  for (const dayStr of allDays) {
    const d = new Date(dayStr);
    if (prevDate) {
      const diff = Math.round((d.getTime() - prevDate.getTime()) / 86400000);
      if (diff === 1) {
        runLen++;
      } else {
        runLen = 1;
      }
    } else {
      runLen = 1;
    }
    if (runLen > longest) longest = runLen;
    prevDate = d;
  }

  return { current, longest };
}

/**
 * Compute nutrition streak: consecutive days user logged at least 1 food entry
 * AND was within ±20% of their calorie target.
 */
async function computeNutritionStreak(
  userId: number,
  now: Date,
  calorieTarget: number | null,
): Promise<number> {
  const since = new Date(now);
  since.setDate(since.getDate() - 89);
  since.setHours(0, 0, 0, 0);

  const logs = await prisma.foodLog.findMany({
    where: { userId, date: { gte: since } },
    select: { date: true, calories: true },
    orderBy: { date: "desc" },
  });

  // Group by date
  const byDate: Record<string, number> = {};
  for (const l of logs) {
    const d = new Date(l.date).toISOString().split("T")[0];
    byDate[d] = (byDate[d] ?? 0) + l.calories;
  }

  const todayStr = now.toISOString().split("T")[0];
  let streak = 0;
  const cursor = new Date(now);

  for (let i = 0; i < 90; i++) {
    const dayStr = cursor.toISOString().split("T")[0];
    const logged = byDate[dayStr];

    if (!logged) {
      // Today with no logs yet is OK
      if (dayStr === todayStr) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }

    // If we have a target, check adherence (within 20%)
    if (calorieTarget && calorieTarget > 0) {
      const lower = calorieTarget * 0.80;
      const upper = calorieTarget * 1.20;
      if (logged < lower || logged > upper) {
        if (dayStr === todayStr) {
          // Today may still be in progress — don't break, just skip
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
    }

    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/**
 * GET /api/dashboard
 */
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const now    = new Date();
    const tz     = tzFromRequest(req.headers as Record<string, string | string[] | undefined>);

    // ── Date helpers (timezone-aware, 4am rollover) ──────────────────────────
    const { start: startOfToday, end: endOfToday, dateStr: todayStr } = getDayBounds(tz);

    const startOf90Days = new Date(startOfToday);
    startOf90Days.setDate(startOfToday.getDate() - 90);

    // Start of the current week (Monday) relative to user's effective today
    const startOfWeek = new Date(startOfToday);
    const dayOfWeek   = (startOfToday.getDay() + 6) % 7;
    startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);

    // Start of this week for cheat meal count
    const startOfWeekForCheats = new Date(startOfWeek);

    // ── Parallel fetches ────────────────────────────────────────────────────
    const [
      user,
      todayFoodLogs,
      weightLogs,
      recentWorkouts,
      weeklyWorkoutCount,
      activeGoal,
      waterToday,
      cheatMealsThisWeek,
      todayBurnedWorkouts,
    ] = await Promise.all([
      (prisma.user as any).findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, username: true,
          firstName: true, lastName: true,
          age: true, weight: true, height: true,
          sex: true, activityLevel: true,
          fitnessLevel: true, goal: true,
          waterTargetMl: true,
          injuries: true,
          periodStart: true,
          cycleLength: true,
        },
      }),

      prisma.foodLog.findMany({
        where: { userId, date: { gte: startOfToday, lte: endOfToday } },
        orderBy: { date: "asc" },
      }),

      prisma.weightLog.findMany({
        where: { userId, date: { gte: startOf90Days } },
        orderBy: { date: "asc" },
      }),

      prisma.workout.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: { exercises: { orderBy: { order: "asc" } } },
      }),

      prisma.workout.count({
        where: { userId, date: { gte: startOfWeek } },
      }),

      (prisma.calorieGoal as any).findFirst({
        where: { userId, active: true },
        orderBy: { createdAt: "desc" },
      }),

      // Water today
      db.waterLog.findMany({
        where: {
          userId,
          date: { gte: startOfToday.toISOString(), lte: endOfToday.toISOString() },
        },
      }),

      // Cheat meals this week
      (prisma.foodLog as any).count({
        where: {
          userId,
          isCheatMeal: true,
          date: { gte: startOfWeekForCheats },
        },
      }),

      // Calories burned from workouts today
      prisma.workout.findMany({
        where: { userId, date: { gte: startOfToday, lte: endOfToday } },
        select: { caloriesBurned: true },
      }),
    ]);

    // ── Aggregate food totals ────────────────────────────────────────────────
    const foodTotals = (todayFoodLogs as any[]).reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein:  acc.protein  + (log.protein || 0),
        carbs:    acc.carbs    + (log.carbs   || 0),
        fats:     acc.fats     + (log.fats    || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // Parse user injuries
    const userOut = user ? {
      ...user,
      injuries: user.injuries ? JSON.parse(user.injuries) : [],
    } : null;

    // Calories burned today
    const caloriesBurnedToday = (todayBurnedWorkouts as any[]).reduce(
      (sum: number, w: any) => sum + (w.caloriesBurned ?? 0),
      0,
    );

    // Water summary
    const waterTotalMl = (waterToday as any[]).reduce((s: number, w: any) => s + w.amount, 0);
    const waterTargetMl = user?.waterTargetMl ?? 2000;

    // Determine calorie target (macro cycling aware)
    const todayHasWorkout = (recentWorkouts as any[]).some((w: any) => {
      const d = new Date(w.date).toISOString().split("T")[0];
      return d === todayStr;
    });

    let effectiveCalorieTarget = (activeGoal as any)?.dailyCalories ?? null;
    if (activeGoal && (activeGoal as any).macrosCycling) {
      effectiveCalorieTarget = todayHasWorkout
        ? ((activeGoal as any).trainDayCalories ?? effectiveCalorieTarget)
        : ((activeGoal as any).restDayCalories  ?? effectiveCalorieTarget);
    }

    // ── Streaks ──────────────────────────────────────────────────────────────
    const [workoutStreak, nutritionStreak] = await Promise.all([
      computeWorkoutStreak(userId, now),
      computeNutritionStreak(userId, now, effectiveCalorieTarget),
    ]);

    // Days since last workout (rest days)
    const lastWorkout = recentWorkouts[0] as any;
    const restDays = lastWorkout
      ? Math.floor((now.getTime() - new Date(lastWorkout.date).getTime()) / 86400000)
      : null;

    res.json({
      user: userOut,
      today: {
        logs:   todayFoodLogs,
        totals: foodTotals,
        date:   todayStr,
        hasWorkout: todayHasWorkout,
        caloriesBurned: caloriesBurnedToday,
      },
      weightLogs,
      recentWorkouts,
      weeklyWorkoutCount,
      activeGoal: activeGoal ?? null,
      effectiveCalorieTarget,
      water: {
        totalMl: waterTotalMl,
        targetMl: waterTargetMl,
        logs: waterToday,
      },
      streaks: {
        workout:   workoutStreak.current,
        workoutBest: workoutStreak.longest,
        nutrition: nutritionStreak,
        restDays,
        cheatMealsThisWeek,
      },
    });
  } catch (error) {
    next(error);
  }
};
