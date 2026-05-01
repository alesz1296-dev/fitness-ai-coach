import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";

// GET /api/weight
export const getWeightLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.weightLog.findMany({
      where: { userId: req.user!.id, date: { gte: startDate } },
      orderBy: { date: "asc" },
    });

    // Stats
    if (logs.length > 0) {
      const weights = logs.map((l) => l.weight);
      const latest = weights[weights.length - 1];
      const starting = weights[0];
      const min = Math.min(...weights);
      const max = Math.max(...weights);
      const change = latest - starting;

      res.json({
        logs,
        stats: { latest, starting, min, max, change, totalEntries: logs.length },
        days,
      });
      return;
    }

    res.json({ logs, stats: null, days });
  } catch (error) {
    next(error);
  }
};

// POST /api/weight
export const logWeight = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { weight, notes, date } = req.body;

    if (weight === undefined) {
      return next(createError("weight is required", 400));
    }

    const log = await prisma.weightLog.create({
      data: {
        userId: req.user!.id,
        weight: Number(weight),
        ...(notes && { notes }),
        ...(date && { date: new Date(date) }),
      },
    });

    // Also update the user's current weight
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { weight: Number(weight) },
    });

    logger.info(`Weight logged for user ${req.user!.id}: ${weight}kg`);
    res.status(201).json({ message: "Weight logged", log });
  } catch (error) {
    next(error);
  }
};

// PUT /api/weight/:id
export const updateWeightLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logId = Number(req.params.id);
    const { weight, notes, date } = req.body;
    const existing = await prisma.weightLog.findFirst({
      where: { id: logId, userId: req.user!.id },
    });
    if (!existing) return next(createError("Weight log entry not found", 404));
    const updated = await prisma.weightLog.update({
      where: { id: logId },
      data: {
        ...(weight !== undefined && { weight: Number(weight) }),
        ...(notes !== undefined && { notes }),
        ...(date  !== undefined && { date: new Date(date) }),
      },
    });
    res.json({ message: "Weight log updated", log: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/weight/:id
export const deleteWeightLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logId = Number(req.params.id);
    const existing = await prisma.weightLog.findFirst({
      where: { id: logId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Weight log entry not found", 404));
    }

    await prisma.weightLog.delete({ where: { id: logId } });
    res.json({ message: "Weight log entry deleted" });
  } catch (error) {
    next(error);
  }
};
