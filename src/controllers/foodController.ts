import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { getDayBounds, tzFromRequest } from "../utils/dayBounds.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";

// GET /api/foods — daily log for a date (defaults to today)
export const getFoodLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dateStr = req.query.date as string;

    // Use timezone-aware midnight rollover boundaries.
    // Client sends X-Timezone header; if a specific date is requested use UTC
    // day boundaries for that historical date (user is browsing, not "today").
    let startOfDay: Date;
    let endOfDay: Date;
    let resolvedDateStr: string;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Historical date explicitly requested — plain UTC day boundaries are fine
      startOfDay      = new Date(`${dateStr}T00:00:00.000Z`);
      endOfDay        = new Date(`${dateStr}T23:59:59.999Z`);
      resolvedDateStr = dateStr;
    } else {
      // "Today" — use user's local timezone + midnight rollover
      const tz = tzFromRequest(req.headers as Record<string, string | string[] | undefined>);
      ({ start: startOfDay, end: endOfDay, dateStr: resolvedDateStr } = getDayBounds(tz));
    }

    const logs = await prisma.foodLog.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { date: "asc" },
    });

    // Aggregate totals
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fats: acc.fats + (log.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // Also return calories burned from workouts on this day
    const burnedWorkouts = await prisma.workout.findMany({
      where: { userId: req.user!.id, date: { gte: startOfDay, lte: endOfDay } },
      select: { caloriesBurned: true },
    });
    const caloriesBurned = burnedWorkouts.reduce(
      (sum, w) => sum + (w.caloriesBurned ?? 0), 0,
    );

    res.json({ logs, totals, caloriesBurned, date: resolvedDateStr });
  } catch (error) {
    next(error);
  }
};

// POST /api/foods
export const logFood = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { foodName, calories, protein, carbs, fats, quantity, unit, meal, date } = req.body;

    if (!foodName || calories === undefined || !quantity || !unit) {
      return next(createError("foodName, calories, quantity, and unit are required", 400));
    }

    const log = await prisma.foodLog.create({
      data: {
        userId: req.user!.id,
        foodName,
        calories: Number(calories),
        ...(protein !== undefined && { protein: Number(protein) }),
        ...(carbs   !== undefined && { carbs:   Number(carbs) }),
        ...(fats    !== undefined && { fats:    Number(fats) }),
        quantity: Number(quantity),
        unit,
        ...(meal && { meal }),
        // Store as UTC midnight so date queries are timezone-consistent
        ...(date && { date: new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00.000Z` : date) }),
      },
    });

    logger.info(`Food logged for user ${req.user!.id}: ${foodName}`);
    res.status(201).json({ message: "Food logged", log });
  } catch (error) {
    next(error);
  }
};

// PUT /api/foods/:id
export const updateFoodLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logId   = Number(req.params.id);
    const existing = await prisma.foodLog.findFirst({
      where: { id: logId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Food log entry not found", 404));
    }

    const { foodName, calories, protein, carbs, fats, quantity, unit, meal, date, isCheatMeal } = req.body;

    const updated = await prisma.foodLog.update({
      where: { id: logId },
      data: {
        ...(foodName    !== undefined && { foodName }),
        ...(calories    !== undefined && { calories:    Number(calories) }),
        ...(protein     !== undefined && { protein:     Number(protein) }),
        ...(carbs       !== undefined && { carbs:       Number(carbs) }),
        ...(fats        !== undefined && { fats:        Number(fats) }),
        ...(quantity    !== undefined && { quantity:    Number(quantity) }),
        ...(unit        !== undefined && { unit }),
        ...(meal        !== undefined && { meal }),
        ...(date        !== undefined && { date: new Date(date) }),
        ...(isCheatMeal !== undefined && { isCheatMeal }),
      },
    });

    logger.info(`Food log ${logId} updated for user ${req.user!.id}`);
    res.json({ message: "Food log updated", log: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/foods/:id
export const deleteFoodLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logId = Number(req.params.id);
    const existing = await prisma.foodLog.findFirst({
      where: { id: logId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Food log entry not found", 404));
    }

    await prisma.foodLog.delete({ where: { id: logId } });
    res.json({ message: "Food log entry deleted" });
  } catch (error) {
    next(error);
  }
};

// POST /api/foods/bulk — log multiple food items in one request (e.g. from AI meal plan)
export const bulkLogFoods = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { foods, date } = req.body as {
      foods: Array<{
        foodName: string; calories: number;
        protein?: number; carbs?: number; fats?: number;
        quantity: number; unit: string;
        meal?: "breakfast" | "lunch" | "dinner" | "snack";
      }>;
      date?: string;
    };

    const dateStr   = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().split("T")[0];
    const storedDate = new Date(`${dateStr}T12:00:00.000Z`);

    const logs = await prisma.$transaction(
      foods.map((f) =>
        prisma.foodLog.create({
          data: {
            userId:    req.user!.id,
            foodName:  f.foodName,
            calories:  Number(f.calories),
            ...(f.protein !== undefined && { protein: Number(f.protein) }),
            ...(f.carbs   !== undefined && { carbs:   Number(f.carbs) }),
            ...(f.fats    !== undefined && { fats:    Number(f.fats) }),
            quantity:  Number(f.quantity),
            unit:      f.unit,
            ...(f.meal && { meal: f.meal }),
            date:      storedDate,
          },
        })
      )
    );

    logger.info(`Bulk food log: ${logs.length} items for user ${req.user!.id}`);
    res.status(201).json({ message: `${logs.length} food items logged`, logs });
  } catch (error) {
    next(error);
  }
};

// GET /api/foods/history — last 7 days of calorie data
export const getFoodHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await prisma.foodLog.findMany({
      where: { userId: req.user!.id, date: { gte: startDate } },
      orderBy: { date: "asc" },
    });

    // Group by day
    const byDay: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {};
    for (const log of logs) {
      const day = log.date.toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      byDay[day].calories += log.calories;
      byDay[day].protein += log.protein || 0;
      byDay[day].carbs += log.carbs || 0;
      byDay[day].fats += log.fats || 0;
    }

    res.json({ history: byDay, days });
  } catch (error) {
    next(error);
  }
};

// GET /api/foods/frequent?limit=5 — most-frequently-logged foods for quick re-log
export const getFrequentFoods = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(10, Number(req.query.limit) || 5);

    // Scan recent entries, group by food name, rank by count
    const logs = await prisma.foodLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { date: "desc" },
      take: 300,
    });

    const seen = new Map<string, { count: number; log: typeof logs[0] }>();
    for (const log of logs) {
      const key = log.foodName.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, { count: 1, log });
      } else {
        seen.get(key)!.count++;
      }
    }

    const frequent = [...seen.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ count, log }) => ({
        foodName: log.foodName,
        calories: log.calories,
        protein:  log.protein,
        carbs:    log.carbs,
        fats:     log.fats,
        quantity: log.quantity,
        unit:     log.unit,
        meal:     log.meal,
        timesLogged: count,
      }));

    res.json({ frequent });
  } catch (error) {
    next(error);
  }
};

// GET /api/foods/cheat-dates?days=90 — returns array of date strings with cheat meals
export const getCheatDates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await (prisma.foodLog as any).findMany({
      where: { userId: req.user!.id, date: { gte: startDate }, isCheatMeal: true },
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const dates = [...new Set(logs.map((l: any) => l.date.toISOString().split("T")[0]))] as string[];
    res.json({ dates });
  } catch (error) {
    next(error);
  }
};
