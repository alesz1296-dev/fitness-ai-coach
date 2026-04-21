import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";

/**
 * GET /api/dashboard
 *
 * Returns everything the Dashboard page needs in a single round-trip:
 *   - today's food totals
 *   - last 14 weight logs
 *   - 5 most recent workouts
 *   - workouts this week count
 *   - active calorie goal
 *   - user profile (for greeting / sex / activityLevel)
 */
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const now    = new Date();

    // ── Date helpers ────────────────────────────────────────────────────────
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOf14Days = new Date(now);
    startOf14Days.setDate(now.getDate() - 14);
    startOf14Days.setHours(0, 0, 0, 0);

    // Start of the current week (Monday)
    const startOfWeek = new Date(now);
    const dayOfWeek   = (now.getDay() + 6) % 7; // 0 = Mon
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // ── Parallel fetches ────────────────────────────────────────────────────
    const [
      user,
      todayFoodLogs,
      weightLogs,
      recentWorkouts,
      weeklyWorkoutCount,
      activeGoal,
    ] = await Promise.all([
      // User profile
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, username: true,
          firstName: true, lastName: true,
          age: true, weight: true, height: true,
          sex: true, activityLevel: true,
          fitnessLevel: true, goal: true,
        },
      }),

      // Today's food
      prisma.foodLog.findMany({
        where: { userId, date: { gte: startOfToday, lte: endOfToday } },
        orderBy: { date: "asc" },
      }),

      // Last 14 weight logs
      prisma.weightLog.findMany({
        where: { userId, date: { gte: startOf14Days } },
        orderBy: { date: "asc" },
        take: 14,
      }),

      // 5 most recent workouts
      prisma.workout.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: { exercises: { orderBy: { order: "asc" } } },
      }),

      // Workouts this calendar week
      prisma.workout.count({
        where: { userId, date: { gte: startOfWeek } },
      }),

      // Active calorie goal
      prisma.calorieGoal.findFirst({
        where: { userId, active: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // ── Aggregate food totals ────────────────────────────────────────────────
    const foodTotals = todayFoodLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein:  acc.protein  + (log.protein || 0),
        carbs:    acc.carbs    + (log.carbs   || 0),
        fats:     acc.fats     + (log.fats    || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    res.json({
      user,
      today: {
        logs:   todayFoodLogs,
        totals: foodTotals,
        date:   now.toISOString().split("T")[0],
      },
      weightLogs,
      recentWorkouts,
      weeklyWorkoutCount,
      activeGoal: activeGoal ?? null,
    });
  } catch (error) {
    next(error);
  }
};
