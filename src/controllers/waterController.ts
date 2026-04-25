import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

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

    // Always store at UTC start of the given date so getToday() can reliably
    // find it with a UTC midnight–23:59 range.
    let dateStr: string;
    if (date) {
      dateStr = (date as string).split("T")[0];
    } else {
      dateStr = new Date().toISOString().split("T")[0];
    }
    const logDate = `${dateStr}T00:00:00.000Z`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "WaterLog" ("userId", "amount", "date", "createdAt") VALUES (?, ?, ?, datetime('now'))`,
      req.user!.id,
      Number(amount),
      logDate
    );

    // Return the newly created row
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "WaterLog" WHERE "userId" = ? ORDER BY "id" DESC LIMIT 1`,
      req.user!.id
    );

    res.status(201).json({ log: rows[0] ?? { userId: req.user!.id, amount, date: logDate } });
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
    const userId = req.user!.id;
    const dateParam = req.query.date as string | undefined;
    const dateStr = dateParam
      ? (dateParam as string).split("T")[0]
      : new Date().toISOString().split("T")[0];

    const start = `${dateStr}T00:00:00.000Z`;
    const end   = `${dateStr}T23:59:59.999Z`;

    const logs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "WaterLog" WHERE "userId" = ? AND "date" >= ? AND "date" <= ? ORDER BY "date" ASC`,
      userId, start, end
    );

    const totalMl = logs.reduce((sum, l) => sum + Number(l.amount), 0);

    // Fetch user's water target
    const users = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "waterTargetMl" FROM "User" WHERE "id" = ?`,
      userId
    );

    res.json({
      logs,
      totalMl,
      targetMl: users[0]?.waterTargetMl ?? 2000,
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
    const days = Math.min(30, Math.max(1, Number(req.query.days ?? 7)));
    const userId = req.user!.id;

    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setUTCHours(0, 0, 0, 0);
    const sinceStr = since.toISOString();

    const logs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "WaterLog" WHERE "userId" = ? AND "date" >= ? ORDER BY "date" ASC`,
      userId, sinceStr
    );

    // Group by date
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

    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id" FROM "WaterLog" WHERE "id" = ? AND "userId" = ?`,
      id, req.user!.id
    );

    if (!existing.length) {
      return next(createError("Water log not found", 404));
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "WaterLog" WHERE "id" = ?`,
      id
    );

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

    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "waterTargetMl" = ? WHERE "id" = ?`,
      clamped, req.user!.id
    );

    res.json({ targetMl: clamped });
  } catch (error) {
    next(error);
  }
};
