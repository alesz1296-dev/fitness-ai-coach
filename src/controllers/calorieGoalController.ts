import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { calculateCalorieGoal, generateProjection } from "../lib/calorieCalculator.js";
import logger from "../lib/logger.js";

// ── GET /api/calorie-goals ────────────────────────────────────────────────────
export const getCalorieGoals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goals = await prisma.calorieGoal.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });
    res.json({ goals });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/calorie-goals/active ─────────────────────────────────────────────
export const getActiveGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goal = await prisma.calorieGoal.findFirst({
      where: { userId: req.user!.id, active: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ goal: goal || null });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/calorie-goals ───────────────────────────────────────────────────
// Creates a goal and auto-calculates calorie/macro targets
export const createCalorieGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, currentWeight, targetWeight, targetDate, notes, aiGenerated } = req.body;

    if (!currentWeight || !targetWeight || !targetDate) {
      return next(createError("currentWeight, targetWeight, and targetDate are required", 400));
    }

    // Load user profile for TDEE calculation
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { age: true, height: true, sex: true, activityLevel: true, proteinMultiplier: true, trainingDaysPerWeek: true, trainingHoursPerDay: true },
    });

    const calc = calculateCalorieGoal({
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight),
      targetDate: new Date(targetDate),
      age: user?.age,
      height: user?.height,
      sex: user?.sex,
      activityLevel: user?.activityLevel,
      proteinMultiplier: user?.proteinMultiplier,
      trainingDaysPerWeek: user?.trainingDaysPerWeek,
      trainingHoursPerDay: user?.trainingHoursPerDay,
    });

    // Deactivate current active goals
    await prisma.calorieGoal.updateMany({
      where: { userId: req.user!.id, active: true },
      data: { active: false },
    });

    const goalName = name || `${calc.type === "cut" ? "Cut" : calc.type === "bulk" ? "Bulk" : "Maintain"} — ${new Date(targetDate).toLocaleDateString()}`;

    // ── Macro cycling: compute train/rest day splits ──────────────────────────
    // On training days the user burns ~300–500 kcal extra via exercise.
    // We add them to training days and subtract from rest days to keep the
    // weekly average equal to dailyCalories.
    const { macrosCycling, trainingDaysPerWeek: reqTDPW } = req.body;
    const enableCycling = Boolean(macrosCycling);

    // Training days per week — prefer request body override, else user profile
    const tDaysPerWeek = Number(reqTDPW ?? user?.trainingDaysPerWeek ?? 3);
    const restDaysPerWeek = 7 - tDaysPerWeek;

    let trainDayCalories: number | null = null;
    let trainDayProtein: number | null  = null;
    let trainDayCarbs: number | null    = null;
    let trainDayFats: number | null     = null;
    let restDayCalories: number | null  = null;
    let restDayProtein: number | null   = null;
    let restDayCarbs: number | null     = null;
    let restDayFats: number | null      = null;

    if (enableCycling) {
      // ~350 kcal exercise bonus on training days (spread from rest days)
      const exerciseBonus = Math.round(350 * restDaysPerWeek / tDaysPerWeek);
      trainDayCalories = Math.round(calc.dailyCalories + exerciseBonus);
      restDayCalories  = Math.round(calc.dailyCalories - 350);

      // Scale macros proportionally
      const trainFactor = trainDayCalories / calc.dailyCalories;
      const restFactor  = restDayCalories  / calc.dailyCalories;

      trainDayProtein = Math.round(calc.proteinGrams * trainFactor);
      trainDayCarbs   = Math.round(calc.carbsGrams   * trainFactor);
      trainDayFats    = Math.round(calc.fatsGrams    * trainFactor);
      restDayProtein  = Math.round(calc.proteinGrams * restFactor);
      restDayCarbs    = Math.round(calc.carbsGrams   * restFactor);
      restDayFats     = Math.round(calc.fatsGrams    * restFactor);
    }

    const goal = await (prisma.calorieGoal as any).create({
      data: {
        userId: req.user!.id,
        name: goalName,
        type: calc.type,
        currentWeight: Number(currentWeight),
        targetWeight: Number(targetWeight),
        targetDate: new Date(targetDate),
        dailyCalories: calc.dailyCalories,
        proteinGrams: calc.proteinGrams,
        carbsGrams: calc.carbsGrams,
        fatsGrams: calc.fatsGrams,
        weeklyChange: calc.weeklyChange,
        tdee: calc.tdee,
        aiGenerated: Boolean(aiGenerated),
        notes: notes || null,
        macrosCycling: enableCycling,
        trainDayCalories,
        trainDayProtein,
        trainDayCarbs,
        trainDayFats,
        restDayCalories,
        restDayProtein,
        restDayCarbs,
        restDayFats,
      },
    });

    // Keep user.goal in sync so the Settings page reflects the active goal
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { goal: goalName },
    });

    logger.info(`Calorie goal created for user ${req.user!.id}: ${goal.name}`);

    res.status(201).json({
      message: "Calorie goal created",
      goal,
      calculation: calc,
      ...(calc.warning && { warning: calc.warning }),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/calorie-goals/:id/projection ─────────────────────────────────────
// Returns week-by-week projected weight data for charting,
// overlaid with actual weight log entries
export const getProjection = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goal = await prisma.calorieGoal.findFirst({
      where: { id: Number(req.params.id), userId: req.user!.id },
    });
    if (!goal) return next(createError("Calorie goal not found", 404));

    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksRemaining = Math.max(1, Math.ceil((goal.targetDate.getTime() - today.getTime()) / msPerWeek));

    const projected = generateProjection(goal.currentWeight, goal.weeklyChange, weeksRemaining + 2);

    // Get actual weight logs since goal creation
    const actualLogs = await prisma.weightLog.findMany({
      where: { userId: req.user!.id, date: { gte: goal.createdAt } },
      orderBy: { date: "asc" },
      select: { date: true, weight: true },
    });

    const actual = actualLogs.map((l) => ({
      date: l.date.toISOString().split("T")[0],
      weight: l.weight,
    }));

    res.json({
      goal,
      projected,
      actual,
      summary: {
        startWeight: goal.currentWeight,
        targetWeight: goal.targetWeight,
        currentWeight: actual.at(-1)?.weight ?? goal.currentWeight,
        weeksRemaining,
        weeklyChange: goal.weeklyChange,
        dailyCalories: goal.dailyCalories,
        macros: {
          protein: goal.proteinGrams,
          carbs: goal.carbsGrams,
          fats: goal.fatsGrams,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/calorie-goals/:id ────────────────────────────────────────────────
export const updateCalorieGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.calorieGoal.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) return next(createError("Calorie goal not found", 404));

    const {
      name, notes, active,
      macrosCycling,
      trainDayCalories, trainDayProtein, trainDayCarbs, trainDayFats,
      restDayCalories,  restDayProtein,  restDayCarbs,  restDayFats,
    } = req.body;

    // If activating this goal, deactivate others
    if (active === true) {
      await prisma.calorieGoal.updateMany({
        where: { userId: req.user!.id, active: true, id: { not: id } },
        data: { active: false },
      });
    }

    const updated = await (prisma.calorieGoal as any).update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(notes !== undefined && { notes }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(macrosCycling !== undefined && { macrosCycling: Boolean(macrosCycling) }),
        ...(trainDayCalories !== undefined && { trainDayCalories: trainDayCalories ? Number(trainDayCalories) : null }),
        ...(trainDayProtein  !== undefined && { trainDayProtein:  trainDayProtein  ? Number(trainDayProtein)  : null }),
        ...(trainDayCarbs    !== undefined && { trainDayCarbs:    trainDayCarbs    ? Number(trainDayCarbs)    : null }),
        ...(trainDayFats     !== undefined && { trainDayFats:     trainDayFats     ? Number(trainDayFats)     : null }),
        ...(restDayCalories  !== undefined && { restDayCalories:  restDayCalories  ? Number(restDayCalories)  : null }),
        ...(restDayProtein   !== undefined && { restDayProtein:   restDayProtein   ? Number(restDayProtein)   : null }),
        ...(restDayCarbs     !== undefined && { restDayCarbs:     restDayCarbs     ? Number(restDayCarbs)     : null }),
        ...(restDayFats      !== undefined && { restDayFats:      restDayFats      ? Number(restDayFats)      : null }),
      },
    });

    // If this goal is being activated (or renamed while active), sync user.goal
    if (active === true || (name && existing.active)) {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { goal: updated.name ?? undefined },
      });
    }

    res.json({ message: "Calorie goal updated", goal: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/calorie-goals/:id ─────────────────────────────────────────────
export const deleteCalorieGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.calorieGoal.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) return next(createError("Calorie goal not found", 404));

    await prisma.calorieGoal.delete({ where: { id } });
    res.json({ message: "Calorie goal deleted" });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/calorie-goals/preview ───────────────────────────────────────────
// Calculate without saving — useful for "preview before save" UX
export const previewCalorieGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentWeight, targetWeight, targetDate } = req.body;
    if (!currentWeight || !targetWeight || !targetDate) {
      return next(createError("currentWeight, targetWeight, targetDate are required", 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { age: true, height: true, sex: true, activityLevel: true, proteinMultiplier: true, trainingDaysPerWeek: true, trainingHoursPerDay: true },
    });

    const calc = calculateCalorieGoal({
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight),
      targetDate: new Date(targetDate),
      age: user?.age,
      height: user?.height,
      sex: user?.sex,
      activityLevel: user?.activityLevel,
      proteinMultiplier: user?.proteinMultiplier,
      trainingDaysPerWeek: user?.trainingDaysPerWeek,
      trainingHoursPerDay: user?.trainingHoursPerDay,
    });

    const projection = generateProjection(Number(currentWeight), calc.weeklyChange, calc.weeksToGoal);

    // If macro cycling was requested in preview, compute split info
    const { macrosCycling: previewCycling, trainingDaysPerWeek: previewTDPW } = req.body;
    let cyclingSplit = null;
    if (previewCycling) {
      const tDays = Number(previewTDPW ?? user?.trainingDaysPerWeek ?? 3);
      const rDays = 7 - tDays;
      const bonus = Math.round(350 * rDays / tDays);
      cyclingSplit = {
        trainDayCalories: Math.round(calc.dailyCalories + bonus),
        restDayCalories:  Math.round(calc.dailyCalories - 350),
      };
    }

    res.json({ calculation: calc, projection, cyclingSplit });
  } catch (error) {
    next(error);
  }
};
