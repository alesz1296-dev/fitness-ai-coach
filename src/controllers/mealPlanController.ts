import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

// ── Raw-SQL helpers ───────────────────────────────────────────────────────────
// All queries use $queryRawUnsafe / $executeRawUnsafe so this controller works
// regardless of whether `prisma generate` has been run after the models were
// added to schema.prisma.

type Row = Record<string, any>;

async function loadPlan(planId: number, userId: number) {
  const plans = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "MealPlan" WHERE "id" = ? AND "userId" = ?`,
    planId, userId
  );
  if (!plans.length) return null;
  const plan = plans[0];

  const days = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT * FROM "MealPlanDay" WHERE "planId" = ? ORDER BY "dayIndex" ASC`,
    planId
  );

  for (const day of days) {
    day.entries = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT * FROM "MealPlanEntry" WHERE "dayId" = ? ORDER BY "meal" ASC, "order" ASC`,
      day.id
    );
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
    const plans = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT * FROM "MealPlan" WHERE "userId" = ? ORDER BY "createdAt" DESC`,
      req.user!.id
    );
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

    const now = new Date().toISOString();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "MealPlan" ("userId","name","weekStart","createdAt","updatedAt") VALUES (?,?,?,?,?)`,
      req.user!.id, name, weekStart, now, now
    );

    const newPlans = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT * FROM "MealPlan" WHERE "userId" = ? ORDER BY "id" DESC LIMIT 1`,
      req.user!.id
    );
    const plan = newPlans[0];

    // Pre-create 7 day slots
    for (let i = 0; i < 7; i++) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "MealPlanDay" ("planId","dayIndex","createdAt") VALUES (?,?,?)`,
        plan.id, i, now
      );
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

    const existing = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id" FROM "MealPlan" WHERE "id" = ? AND "userId" = ?`,
      id, req.user!.id
    );
    if (!existing.length) return next(createError("Meal plan not found", 404));

    const now = new Date().toISOString();
    if (name !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "MealPlan" SET "name" = ?, "updatedAt" = ? WHERE "id" = ?`,
        name, now, id
      );
    }
    if (weekStart !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "MealPlan" SET "weekStart" = ?, "updatedAt" = ? WHERE "id" = ?`,
        weekStart, now, id
      );
    }

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
    const existing = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id" FROM "MealPlan" WHERE "id" = ? AND "userId" = ?`,
      id, req.user!.id
    );
    if (!existing.length) return next(createError("Meal plan not found", 404));

    // Cascade: entries → days → plan
    const days = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id" FROM "MealPlanDay" WHERE "planId" = ?`, id
    );
    for (const day of days) {
      await prisma.$executeRawUnsafe(`DELETE FROM "MealPlanEntry" WHERE "dayId" = ?`, day.id);
    }
    await prisma.$executeRawUnsafe(`DELETE FROM "MealPlanDay" WHERE "planId" = ?`, id);
    await prisma.$executeRawUnsafe(`DELETE FROM "MealPlan" WHERE "id" = ?`, id);

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
    const plan = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id" FROM "MealPlan" WHERE "id" = ? AND "userId" = ?`,
      planId, req.user!.id
    );
    if (!plan.length) return next(createError("Meal plan not found", 404));

    const day = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id" FROM "MealPlanDay" WHERE "id" = ? AND "planId" = ?`,
      dayId, planId
    );
    if (!day.length) return next(createError("Day not found", 404));

    const { meal, foodName, calories, protein = 0, carbs = 0, fats = 0, quantity = 1, unit = "serving" } = req.body;
    if (!meal || !foodName || calories == null) {
      return next(createError("meal, foodName, and calories are required", 400));
    }

    // Get current max order for this day+meal
    const maxRows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT MAX("order") as maxOrd FROM "MealPlanEntry" WHERE "dayId" = ? AND "meal" = ?`,
      dayId, meal
    );
    const nextOrder = ((maxRows[0]?.maxOrd as number | null) ?? -1) + 1;

    const now = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MealPlanEntry" ("dayId","meal","foodName","calories","protein","carbs","fats","quantity","unit","order","createdAt")
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      dayId, meal, foodName,
      Number(calories), Number(protein), Number(carbs), Number(fats),
      Number(quantity), unit, nextOrder, now
    );

    const entry = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT * FROM "MealPlanEntry" WHERE "dayId" = ? AND "meal" = ? ORDER BY "id" DESC LIMIT 1`,
      dayId, meal
    );

    res.status(201).json({ entry: entry[0] });
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

    // Verify ownership via plan
    const plan = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id" FROM "MealPlan" WHERE "id" = ? AND "userId" = ?`,
      planId, req.user!.id
    );
    if (!plan.length) return next(createError("Meal plan not found", 404));

    await prisma.$executeRawUnsafe(`DELETE FROM "MealPlanEntry" WHERE "id" = ?`, entryId);
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

    const plan = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "id" FROM "MealPlan" WHERE "id" = ? AND "userId" = ?`,
      planId, req.user!.id
    );
    if (!plan.length) return next(createError("Meal plan not found", 404));

    await prisma.$executeRawUnsafe(
      `UPDATE "MealPlanDay" SET "notes" = ? WHERE "id" = ?`,
      req.body.notes ?? null, dayId
    );

    res.json({ message: "Updated" });
  } catch (error) {
    next(error);
  }
};
