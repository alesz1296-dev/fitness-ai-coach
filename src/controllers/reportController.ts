import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { chat } from "../ai/agent.js";
import logger from "../lib/logger.js";

const getMonthBounds = (year: number, month: number) => ({
  start: new Date(year, month - 1, 1),
  end:   new Date(year, month, 0, 23, 59, 59, 999),
});

// GET /api/reports
export const getReports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reports = await prisma.monthlyReport.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json({ reports });
  } catch (error) { next(error); }
};

// GET /api/reports/:year/:month
export const getReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const year  = Number(req.params.year);
    const month = Number(req.params.month);
    // Key name matches @@unique([userId, year, month]) order
    const report = await prisma.monthlyReport.findUnique({
      where: { userId_year_month: { userId: req.user!.id, year, month } },
    });
    if (!report) return next(createError("Report not found. Generate it first.", 404));
    res.json({ report });
  } catch (error) { next(error); }
};

// POST /api/reports/generate
export const generateReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now   = new Date();
    const year  = Number(req.body.year  || now.getFullYear());
    const month = Number(req.body.month || (now.getMonth() + 1));
    const generateAiSummary = req.body.aiSummary !== false;
    const { start, end } = getMonthBounds(year, month);
    const userId = req.user!.id;

    const [workouts, foodLogs, weightLogs, user, activeGoal] = await Promise.all([
      prisma.workout.findMany({ where: { userId, date: { gte: start, lte: end } }, include: { exercises: true } }),
      prisma.foodLog.findMany({ where: { userId, date: { gte: start, lte: end } } }),
      prisma.weightLog.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: "asc" } }),
      prisma.user.findUnique({ where: { id: userId }, select: { username: true, goal: true } }),
      prisma.calorieGoal.findFirst({ where: { userId, active: true } }),
    ]);

    // totalWorkouts — correct schema column name
    const totalWorkouts = workouts.length;

    // totalVolume — correct schema column name
    let totalVolume = 0;
    for (const w of workouts)
      for (const ex of w.exercises)
        if (ex.weight) totalVolume += ex.sets * ex.reps * ex.weight;

    // avgCalories — correct schema column name
    const calsByDay: Record<string, number> = {};
    for (const log of foodLogs) {
      const day = log.date.toISOString().split("T")[0];
      calsByDay[day] = (calsByDay[day] || 0) + log.calories;
    }
    const calVals = Object.values(calsByDay);
    const avgCalories = calVals.length ? Math.round(calVals.reduce((a, b) => a + b, 0) / calVals.length) : null;

    // avgProtein — correct schema column name
    const proteinByDay: Record<string, number> = {};
    for (const log of foodLogs) {
      const day = log.date.toISOString().split("T")[0];
      proteinByDay[day] = (proteinByDay[day] || 0) + (log.protein || 0);
    }
    const proteinVals = Object.values(proteinByDay);
    const avgProtein = proteinVals.length ? Math.round(proteinVals.reduce((a, b) => a + b, 0) / proteinVals.length) : null;

    const weightStart = weightLogs[0]?.weight ?? null;
    const weightEnd   = weightLogs.at(-1)?.weight ?? null;
    // weightDelta — correct schema column name (not weightChange)
    const weightDelta = weightStart != null && weightEnd != null
      ? Math.round((weightEnd - weightStart) * 100) / 100 : null;

    // ── PR detection: batched (2 queries total, not N+1) ─────────────────────
    const exNames = [...new Set(workouts.flatMap((w) => w.exercises.filter((e) => e.weight).map((e) => e.exerciseName)))];
    let prsHit = 0;

    if (exNames.length > 0) {
      const [priorBests, thisMonthBests] = await Promise.all([
        prisma.workoutExercise.groupBy({
          by: ["exerciseName"],
          where: { exerciseName: { in: exNames }, workout: { userId, date: { lt: start } }, weight: { not: null } },
          _max: { weight: true },
        }),
        prisma.workoutExercise.groupBy({
          by: ["exerciseName"],
          where: { exerciseName: { in: exNames }, workout: { userId, date: { gte: start, lte: end } }, weight: { not: null } },
          _max: { weight: true },
        }),
      ]);
      const priorMap: Record<string, number> = {};
      for (const r of priorBests) priorMap[r.exerciseName] = r._max.weight ?? 0;
      for (const r of thisMonthBests) {
        const best = r._max.weight ?? 0;
        if (best > 0 && best > (priorMap[r.exerciseName] ?? 0)) prsHit++;
      }
    }

    let goalProgress: number | null = null;
    if (activeGoal) {
      const totalChange  = activeGoal.targetWeight - activeGoal.currentWeight;
      const actualChange = (weightEnd ?? activeGoal.currentWeight) - activeGoal.currentWeight;
      if (totalChange !== 0) goalProgress = Math.round(Math.min(100, Math.abs(actualChange / totalChange) * 100));
    }

    let aiSummary: string | null = null;
    if (generateAiSummary && user) {
      const prompt = `Write a motivating 3-4 sentence monthly fitness summary for ${user.username}.
Month: ${new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })}
- Workouts: ${totalWorkouts} | Volume: ${Math.round(totalVolume).toLocaleString()}kg | PRs: ${prsHit}
- Avg calories: ${avgCalories ?? "not tracked"}kcal${activeGoal ? ` (target: ${activeGoal.dailyCalories}kcal)` : ""}
- Avg protein: ${avgProtein ?? "not tracked"}g | Weight: ${weightStart ?? "?"}kg → ${weightEnd ?? "?"}kg (${weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta}kg` : "not tracked"})
- Goal progress: ${goalProgress !== null ? goalProgress + "%" : "N/A"} | User goal: ${user.goal || "general fitness"}
Be honest, highlight wins and one area to improve. Use second-person.`;
      try {
        const { message } = await chat(prompt, "coach", { username: user.username });
        aiSummary = message;
      } catch { logger.warn("AI summary failed for report"); }
    }

    // Upsert with correct column names matching prisma/schema.prisma
    const report = await prisma.monthlyReport.upsert({
      where:  { userId_year_month: { userId, year, month } },
      create: { userId, month, year, totalWorkouts, totalVolume: Math.round(totalVolume), avgCalories: avgCalories ?? 0, avgProtein: avgProtein ?? 0, weightStart, weightEnd, weightDelta, prsHit, goalProgress, aiSummary },
      update: {                      totalWorkouts, totalVolume: Math.round(totalVolume), avgCalories: avgCalories ?? 0, avgProtein: avgProtein ?? 0, weightStart, weightEnd, weightDelta, prsHit, goalProgress, aiSummary },
    });

    logger.info(`Report ${month}/${year} for user ${userId}: ${totalWorkouts} workouts, ${prsHit} PRs`);
    res.status(201).json({ message: "Report generated", report });
  } catch (error) { next(error); }
};
