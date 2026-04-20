import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { chat } from "../ai/agent.js";
import logger from "../lib/logger.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getMonthBounds = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

// ── GET /api/reports ──────────────────────────────────────────────────────────
export const getReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reports = await prisma.monthlyReport.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json({ reports });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/reports/:year/:month ─────────────────────────────────────────────
export const getReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const year  = Number(req.params.year);
    const month = Number(req.params.month);

    const report = await prisma.monthlyReport.findUnique({
      where: { userId_month_year: { userId: req.user!.id, month, year } },
    });

    if (!report) return next(createError("Report not found. Generate it first.", 404));
    res.json({ report });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/reports/generate ────────────────────────────────────────────────
// Computes stats for a given month and optionally generates an AI summary.
// Defaults to the current month.
export const generateReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now   = new Date();
    const year  = Number(req.body.year  || now.getFullYear());
    const month = Number(req.body.month || (now.getMonth() + 1));
    const generateAiSummary = req.body.aiSummary !== false; // default true

    const { start, end } = getMonthBounds(year, month);
    const userId = req.user!.id;

    // ── Gather raw data ───────────────────────────────────────────────────────

    const [workouts, foodLogs, weightLogs, user, activeGoal] = await Promise.all([
      prisma.workout.findMany({
        where: { userId, date: { gte: start, lte: end } },
        include: { exercises: true },
      }),
      prisma.foodLog.findMany({
        where: { userId, date: { gte: start, lte: end } },
      }),
      prisma.weightLog.findMany({
        where: { userId, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, weight: true, fitnessLevel: true, goal: true },
      }),
      prisma.calorieGoal.findFirst({
        where: { userId, active: true },
      }),
    ]);

    // ── Compute stats ─────────────────────────────────────────────────────────

    const workoutsCompleted = workouts.length;

    // Total volume = sum of (sets * reps * weight) for all exercises
    let totalVolumeKg = 0;
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (ex.weight) totalVolumeKg += ex.sets * ex.reps * ex.weight;
      }
    }

    // Average daily calories (only on days with logs)
    const calsByDay: Record<string, number> = {};
    for (const log of foodLogs) {
      const day = log.date.toISOString().split("T")[0];
      calsByDay[day] = (calsByDay[day] || 0) + log.calories;
    }
    const daysWithFood = Object.values(calsByDay);
    const avgDailyCalories = daysWithFood.length
      ? Math.round(daysWithFood.reduce((a, b) => a + b, 0) / daysWithFood.length)
      : null;

    const proteinByDay: Record<string, number> = {};
    for (const log of foodLogs) {
      const day = log.date.toISOString().split("T")[0];
      proteinByDay[day] = (proteinByDay[day] || 0) + (log.protein || 0);
    }
    const daysWithProtein = Object.values(proteinByDay);
    const avgDailyProtein = daysWithProtein.length
      ? Math.round(daysWithProtein.reduce((a, b) => a + b, 0) / daysWithProtein.length)
      : null;

    const weightStart = weightLogs[0]?.weight ?? null;
    const weightEnd   = weightLogs.at(-1)?.weight ?? null;
    const weightChange = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 100) / 100 : null;

    // PRs = exercises where the weight in this month exceeded any previous log
    let prsHit = 0;
    const exercisesThisMonth = new Set<string>();
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (ex.weight) exercisesThisMonth.add(ex.exerciseName);
      }
    }

    for (const exName of exercisesThisMonth) {
      const allTimeBest = await prisma.workoutExercise.aggregate({
        where: { exerciseName: exName, workout: { userId, date: { lt: start } } },
        _max: { weight: true },
      });
      const thisMonthBest = await prisma.workoutExercise.aggregate({
        where: { exerciseName: exName, workout: { userId, date: { gte: start, lte: end } } },
        _max: { weight: true },
      });
      if (thisMonthBest._max.weight && (thisMonthBest._max.weight > (allTimeBest._max.weight || 0))) {
        prsHit++;
      }
    }

    // Goal progress %
    let goalProgress: number | null = null;
    if (activeGoal) {
      const totalChange = activeGoal.targetWeight - activeGoal.currentWeight;
      const actualChange = (weightEnd ?? activeGoal.currentWeight) - activeGoal.currentWeight;
      if (totalChange !== 0) {
        goalProgress = Math.round(Math.min(100, Math.abs(actualChange / totalChange) * 100));
      }
    }

    // ── AI Summary ────────────────────────────────────────────────────────────
    let aiSummaryText: string | null = null;
    if (generateAiSummary && user) {
      const prompt = `Generate a motivating, concise monthly fitness progress report (3-4 sentences) for ${user.username}.
Month: ${new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })}
Stats:
- Workouts completed: ${workoutsCompleted}
- Total volume lifted: ${Math.round(totalVolumeKg).toLocaleString()}kg
- Avg daily calories: ${avgDailyCalories ?? "not tracked"}kcal${activeGoal ? ` (target: ${activeGoal.dailyCalories}kcal)` : ""}
- Avg daily protein: ${avgDailyProtein ?? "not tracked"}g${activeGoal ? ` (target: ${activeGoal.proteinGrams}g)` : ""}
- Weight: ${weightStart ?? "?"}kg → ${weightEnd ?? "?"}kg (${weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange}kg` : "not tracked"})
- Personal records hit: ${prsHit}
- Goal progress: ${goalProgress !== null ? `${goalProgress}%` : "N/A"}
User goal: ${user.goal || "general fitness"}
Be honest about wins and areas to improve. Use first-person as if writing to the user.`;

      try {
        const { message } = await chat(prompt, "coach", { username: user.username });
        aiSummaryText = message;
      } catch {
        logger.warn("AI summary generation failed for monthly report");
      }
    }

    // ── Upsert Report ─────────────────────────────────────────────────────────
    const report = await prisma.monthlyReport.upsert({
      where: { userId_month_year: { userId, month, year } },
      create: {
        userId, month, year,
        workoutsCompleted,
        totalVolumeKg: Math.round(totalVolumeKg),
        avgDailyCalories,
        avgDailyProtein,
        weightStart,
        weightEnd,
        weightChange,
        prsHit,
        goalProgress,
        aiSummary: aiSummaryText,
      },
      update: {
        workoutsCompleted,
        totalVolumeKg: Math.round(totalVolumeKg),
        avgDailyCalories,
        avgDailyProtein,
        weightStart,
        weightEnd,
        weightChange,
        prsHit,
        goalProgress,
        aiSummary: aiSummaryText,
      },
    });

    logger.info(`Monthly report generated for user ${userId}: ${month}/${year}`);
    res.status(201).json({ message: "Report generated", report });
  } catch (error) {
    next(error);
  }
};
