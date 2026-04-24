import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

const db = prisma as any; // Prisma types don't know about new tables yet

// ── Helper: load full plan with days+entries ──────────────────────────────────
async function loadPlan(planId: number, userId: number) {
  const plan = await db.mealPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!plan) return null;

  const days = await db.mealPlanDay.findMany({
    where: { planId },
    orderBy: { dayIndex: "asc" },
  });

  for (const day of days) {
    day.entries = await db.mealPlanEntry.findMany({
      where: { dayId: day.id },
      orderBy: [{ meal: "asc" }, { order: "asc" }],
    });
  }

  return { ...plan, days };
}

// ── GET /api/meal-plans ───────────────────────────────────────────────────────
export const getPlans = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plans = await db.mealPlan.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ plans });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/meal-plans/:id ───────────────────────────────────────────────────
export const getPlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plan = await loadPlan(Number(req.params.id), req.user!.id);
    if (!plan) return next(createError("Meal plan not found", 404));
    res.json({ plan });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/meal-plans ──────────────────────────────────────────────────────
export const createPlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, weekStart } = req.body;
    if (!name || !weekStart) {
      return next(createError("name and weekStart are required", 400));
    }

    const plan = await db.mealPlan.create({
      data: {
        userId: req.user!.id,
        name,
        weekStart,
      },
    });

    // Pre-create 7 day slots
    for (let i = 0; i < 7; i++) {
      await db.mealPlanDay.create({
        data: { planId: plan.id, dayIndex: i },
      });
    }

    const full = await loadPlan(plan.id, req.user!.id);
    res.status(201).json({ plan: full });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/meal-plans/:id ───────────────────────────────────────────────────
export const updatePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { name, weekStart } = req.body;

    const existing = await db.mealPlan.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) return next(createError("Meal plan not found", 404));

    await db.mealPlan.update({
      where: { id },
      data: {
        ...(name      !== undefined && { name }),
        ...(weekStart !== undefined && { weekStart }),
        updatedAt: new Date().toISOString(),
      },
    });

    const full = await loadPlan(id, req.user!.id);
    res.json({ plan: full });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/meal-plans/:id ────────────────────────────────────────────────
export const deletePlan = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await db.mealPlan.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) return next(createError("Meal plan not found", 404));

    await db.mealPlan.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/meal-plans/:id/days/:dayId/entries ──────────────────────────────
export const addEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = Number(req.params.id);
    const dayId  = Number(req.params.dayId);

    // Verify ownership
    const plan = await db.mealPlan.findFirst({ where: { id: planId, userId: req.user!.id } });
    if (!plan) return next(createError("Meal plan not found", 404));

    const day = await db.mealPlanDay.findFirst({ where: { id: dayId, planId } });
    if (!day) return next(createError("Day not found", 404));

    const { meal, foodName, calories, protein = 0, carbs = 0, fats = 0, quantity = 1, unit = "serving" } = req.body;
    if (!meal || !foodName || calories == null) {
      return next(createError("meal, foodName, and calories are required", 400));
    }

    // Get current max order for this day+meal combo
    const maxOrder = await db.mealPlanEntry.findFirst({
      where: { dayId, meal },
      orderBy: { order: "desc" },
    });

    const entry = await db.mealPlanEntry.create({
      data: {
        dayId,
        meal,
        foodName,
        calories: Number(calories),
        protein:  Number(protein),
        carbs:    Number(carbs),
        fats:     Number(fats),
        quantity: Number(quantity),
        unit,
        order: (maxOrder?.order ?? -1) + 1,
      },
    });

    res.status(201).json({ entry });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/meal-plans/:id/entries/:entryId ───────────────────────────────
export const deleteEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId  = Number(req.params.id);
    const entryId = Number(req.params.entryId);

    // Verify ownership via join
    const plan = await db.mealPlan.findFirst({ where: { id: planId, userId: req.user!.id } });
    if (!plan) return next(createError("Meal plan not found", 404));

    await db.mealPlanEntry.delete({ where: { id: entryId } });
    res.json({ message: "Deleted" });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/meal-plans/:id/days/:dayId/notes ─────────────────────────────────
export const updateDayNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = Number(req.params.id);
    const dayId  = Number(req.params.dayId);

    const plan = await db.mealPlan.findFirst({ where: { id: planId, userId: req.user!.id } });
    if (!plan) return next(createError("Meal plan not found", 404));

    await db.mealPlanDay.update({
      where: { id: dayId },
      data: { notes: req.body.notes ?? null },
    });

    res.json({ message: "Updated" });
  } catch (error) {
    next(error);
  }
};
