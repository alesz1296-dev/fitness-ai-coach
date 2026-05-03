import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";
import {
  getTodayWeightDateStr,
  normalizeWeightDateInput,
  findWeightLogForDay,
  syncLatestWeight,
} from "../lib/weightSync.js";

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

    const todayStr = getTodayWeightDateStr(req.headers as Record<string, string | string[] | undefined>);
    const { dateStr, date: logDate } = normalizeWeightDateInput(date, todayStr);

    const log = await prisma.$transaction(async (tx) => {
      const existing = await findWeightLogForDay(tx, req.user!.id, dateStr);
      const payload: Record<string, any> = {
        weight: Number(weight),
        date: logDate,
      };
      if (notes !== undefined) {
        payload.notes = notes;
      }

      const entry = existing
        ? await tx.weightLog.update({
            where: { id: existing.id },
            data: payload,
          })
        : await tx.weightLog.create({
            data: {
              userId: req.user!.id,
              ...payload,
            } as any,
          });

      await syncLatestWeight(tx, req.user!.id);
      return entry;
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

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.weightLog.findFirst({
        where: { id: logId, userId: req.user!.id },
      });
      if (!existing) return null;

      const todayStr = getTodayWeightDateStr(req.headers as Record<string, string | string[] | undefined>);
      const baseDateStr = date !== undefined
        ? normalizeWeightDateInput(date, todayStr).dateStr
        : existing.date.toISOString().split("T")[0];
      const { date: logDate } = normalizeWeightDateInput(date ?? existing.date.toISOString(), baseDateStr);

      const target = await findWeightLogForDay(tx, req.user!.id, baseDateStr, existing.id);
      if (target) {
        await tx.weightLog.delete({ where: { id: target.id } });
      }

      const payload: Record<string, any> = {};
      if (weight !== undefined) payload.weight = Number(weight);
      if (notes !== undefined) payload.notes = notes;
      if (date !== undefined || target) payload.date = logDate;

      const updatedLog = await tx.weightLog.update({
        where: { id: existing.id },
        data: payload,
      });

      await syncLatestWeight(tx, req.user!.id);
      return updatedLog;
    });

    if (!updated) return next(createError("Weight log entry not found", 404));
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
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.weightLog.findFirst({
        where: { id: logId, userId: req.user!.id },
      });

      if (!existing) {
        return null;
      }

      await tx.weightLog.delete({ where: { id: logId } });
      await syncLatestWeight(tx, req.user!.id);
      return existing;
    });

    if (!deleted) {
      return next(createError("Weight log entry not found", 404));
    }

    res.json({ message: "Weight log entry deleted" });
  } catch (error) {
    next(error);
  }
};
