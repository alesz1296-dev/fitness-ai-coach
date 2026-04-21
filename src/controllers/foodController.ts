import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
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
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

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

    res.json({ logs, totals, date: targetDate.toISOString().split("T")[0] });
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
    const { foodName, calories, protein, carbs, fats, quantity, unit, date } = req.body;

    if (!foodName || calories === undefined || !quantity || !unit) {
      return next(createError("foodName, calories, quantity, and unit are required", 400));
    }

    const log = await prisma.foodLog.create({
      data: {
        userId: req.user!.id,
        foodName,
        calories: Number(calories),
        ...(protein !== undefined && { protein: Number(protein) }),
        ...(carbs !== undefined && { carbs: Number(carbs) }),
        ...(fats !== undefined && { fats: Number(fats) }),
        quantity: Number(quantity),
        unit,
        ...(date && { date: new Date(date) }),
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

    const { foodName, calories, protein, carbs, fats, quantity, unit, meal, date } = req.body;

    const updated = await prisma.foodLog.update({
      where: { id: logId },
      data: {
        ...(foodName  !== undefined && { foodName }),
        ...(calories  !== undefined && { calories:  Number(calories) }),
        ...(protein   !== undefined && { protein:   Number(protein) }),
        ...(carbs     !== undefined && { carbs:     Number(carbs) }),
        ...(fats      !== undefined && { fats:      Number(fats) }),
        ...(quantity  !== undefined && { quantity:  Number(quantity) }),
        ...(unit      !== undefined && { unit }),
        ...(meal      !== undefined && { meal }),
        ...(date      !== undefined && { date: new Date(date) }),
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
