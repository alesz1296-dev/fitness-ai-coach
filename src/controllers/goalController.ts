import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";

// GET /api/goals
export const getGoals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goals = await prisma.goal.findMany({
      where:   { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take:    50, // safety cap — users rarely have more than 50 goals
    });
    res.json({ goals });
  } catch (error) {
    next(error);
  }
};

// POST /api/goals
export const createGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, target, unit, endDate } = req.body;

    if (!type || target === undefined || !unit) {
      return next(createError("type, target, and unit are required", 400));
    }

    const goal = await prisma.goal.create({
      data: {
        userId: req.user!.id,
        type,
        target: Number(target),
        unit,
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    logger.info(`Goal created for user ${req.user!.id}: ${type}`);
    res.status(201).json({ message: "Goal created", goal });
  } catch (error) {
    next(error);
  }
};

// PUT /api/goals/:id
export const updateGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goalId = Number(req.params.id);
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Goal not found", 404));
    }

    const { type, target, current, unit, endDate, achieved } = req.body;

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(type !== undefined && { type }),
        ...(target !== undefined && { target: Number(target) }),
        ...(current !== undefined && { current: Number(current) }),
        ...(unit !== undefined && { unit }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(achieved !== undefined && { achieved: Boolean(achieved) }),
      },
    });

    res.json({ message: "Goal updated", goal: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/goals/:id
export const deleteGoal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const goalId = Number(req.params.id);
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Goal not found", 404));
    }

    await prisma.goal.delete({ where: { id: goalId } });
    res.json({ message: "Goal deleted" });
  } catch (error) {
    next(error);
  }
};
