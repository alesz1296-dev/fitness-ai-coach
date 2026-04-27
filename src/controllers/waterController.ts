import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

// Cast for new models not yet in generated client
const db = prisma as any;

// ── POST /api/water ───────────────────────────────────────────────────────────
export const logWater = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { amount, date } = req.body;
    if (!amount || Number(amount) <= 0) {
      return next(createError("amount (ml) is required and must be positive", 400));
    }

    const dateStr = date
      ? (date as string).split("T")[0]
      : new Date().toISOString().split("T")[0];
    const logDate = new Date(`${dateStr}T00:00:00.000Z`);

    const log = await db.waterLog.create({
      data: {
        userId: req.user!.id,
        amount: Number(amount),
        date:   logDate,
      },
    });

    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/water/today ──────────────────────────────────────────────────────
export const getToday = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId    = req.user!.id;
    const dateParam = req.query.date as string | undefined;
    const dateStr   = dateParam
      ? (dateParam as string).split("T")[0]
      : new Date().toISOString().split("T")[0];

    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end   = new Date(`${dateStr}T23:59:59.999Z`);

    const logs = await db.waterLog.findMany({
      where:   { userId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });

    const totalMl = logs.reduce((sum: number, l: any) => sum + Number(l.amount), 0);

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { waterTargetMl: true },
    });

    res.json({
      logs,
      totalMl,
      targetMl: (user as any)?.waterTargetMl ?? 2000,
      date: dateStr,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/water/history?days=7 ─────────────────────────────────────────────
export const getHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days   = Math.min(30, Math.max(1, Number(req.query.days ?? 7)));
    const userId = req.user!.id;

    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setUTCHours(0, 0, 0, 0);

    const logs = await db.waterLog.findMany({
      where:   { userId, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    const byDate: Record<string, number> = {};
    for (const l of logs) {
      const d = new Date(l.date).toISOString().split("T")[0];
      byDate[d] = (byDate[d] ?? 0) + Number(l.amount);
    }

    res.json({ history: byDate, days });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/water/:id ─────────────────────────────────────────────────────
export const deleteLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    const existing = await db.waterLog.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) return next(createError("Water log not found", 404));

    await db.waterLog.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/water/target ─────────────────────────────────────────────────────
export const updateWaterTarget = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetMl } = req.body;
    if (!targetMl) return next(createError("targetMl is required", 400));

    const clamped = Math.min(6000, Math.max(500, Number(targetMl)));

    await prisma.user.update({
      where: { id: req.user!.id },
      data:  { waterTargetMl: clamped } as any,
    });

    res.json({ targetMl: clamped });
  } catch (error) {
    next(error);
  }
};
