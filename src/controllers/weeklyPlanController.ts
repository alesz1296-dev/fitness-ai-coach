import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

// ── helpers ───────────────────────────────────────────────────────────────────

/** Return the Monday of the week containing `date` at UTC midnight */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ── GET /api/weekly-plan?week=YYYY-MM-DD ──────────────────────────────────────
// Returns (or auto-creates) the plan for the requested week.

export const getWeeklyPlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawDate  = req.query.week as string | undefined;
    const weekStart = getWeekStart(rawDate ? new Date(rawDate) : new Date());

    let plan = await prisma.weeklyPlan.findUnique({
      where: { userId_weekStart: { userId: req.user!.id, weekStart } },
      include: { days: { orderBy: { dayIndex: "asc" } } },
    });

    res.json({ plan: plan ?? null, weekStart: weekStart.toISOString() });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/weekly-plan ─────────────────────────────────────────────────────
// Upsert a plan for a week. `days` is an array of day configs.
// { week?: "YYYY-MM-DD", days: [{dayIndex, label, targetCalories, notes}] }

export const upsertWeeklyPlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { week, days } = req.body as {
      week?: string;
      days: Array<{
        dayIndex: number;
        label?: string;
        targetCalories?: number | null;
        notes?: string;
      }>;
    };

    if (!Array.isArray(days) || days.length === 0) {
      return next(createError("days array is required", 400));
    }

    const weekStart = getWeekStart(week ? new Date(week) : new Date());

    // Upsert the plan header
    const plan = await prisma.weeklyPlan.upsert({
      where: { userId_weekStart: { userId: req.user!.id, weekStart } },
      create: { userId: req.user!.id, weekStart },
      update: { updatedAt: new Date() },
    });

    // Upsert each day
    for (const d of days) {
      await prisma.weeklyPlanDay.upsert({
        where: { planId_dayIndex: { planId: plan.id, dayIndex: d.dayIndex } },
        create: {
          planId:         plan.id,
          dayIndex:       d.dayIndex,
          label:          d.label          ?? "Training",
          targetCalories: d.targetCalories ?? null,
          notes:          d.notes          ?? null,
        },
        update: {
          label:          d.label          ?? "Training",
          targetCalories: d.targetCalories ?? null,
          notes:          d.notes          ?? null,
        },
      });
    }

    const updated = await prisma.weeklyPlan.findUnique({
      where: { id: plan.id },
      include: { days: { orderBy: { dayIndex: "asc" } } },
    });

    res.json({ message: "Weekly plan saved", plan: updated });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /api/weekly-plan/days/:dayId/toggle ─────────────────────────────────
// Toggle a day's completed state. Optionally record actualCalories.

export const toggleDay = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dayId = Number(req.params.dayId);

    const day = await prisma.weeklyPlanDay.findFirst({
      where: { id: dayId, plan: { userId: req.user!.id } },
    });
    if (!day) return next(createError("Plan day not found", 404));

    const nowCompleted = !day.completed;
    const { actualCalories, workoutId } = req.body;

    const updated = await prisma.weeklyPlanDay.update({
      where: { id: dayId },
      data: {
        completed:      nowCompleted,
        completedAt:    nowCompleted ? new Date() : null,
        actualCalories: actualCalories !== undefined ? Number(actualCalories) : day.actualCalories,
        workoutId:      workoutId      !== undefined ? Number(workoutId)      : day.workoutId,
      },
    });

    res.json({ message: nowCompleted ? "Day marked complete" : "Day unmarked", day: updated });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/weekly-plan/days/:dayId ─────────────────────────────────────────
// Edit a single day's details.

export const updateDay = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dayId = Number(req.params.dayId);

    const day = await prisma.weeklyPlanDay.findFirst({
      where: { id: dayId, plan: { userId: req.user!.id } },
    });
    if (!day) return next(createError("Plan day not found", 404));

    const { label, targetCalories, actualCalories, notes, workoutId } = req.body;

    const updated = await prisma.weeklyPlanDay.update({
      where: { id: dayId },
      data: {
        ...(label          !== undefined && { label }),
        ...(targetCalories !== undefined && { targetCalories: targetCalories === null ? null : Number(targetCalories) }),
        ...(actualCalories !== undefined && { actualCalories: actualCalories === null ? null : Number(actualCalories) }),
        ...(notes          !== undefined && { notes }),
        ...(workoutId      !== undefined && { workoutId: workoutId === null ? null : Number(workoutId) }),
      },
    });

    res.json({ message: "Day updated", day: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/weekly-plan/:planId ──────────────────────────────────────────

export const deleteWeeklyPlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = Number(req.params.planId);

    const plan = await prisma.weeklyPlan.findFirst({
      where: { id: planId, userId: req.user!.id },
    });
    if (!plan) return next(createError("Plan not found", 404));

    await prisma.weeklyPlan.delete({ where: { id: planId } });
    res.json({ message: "Plan deleted" });
  } catch (error) {
    next(error);
  }
};
