import { Response, NextFunction } from "express";
import { z } from "zod";
import prismaBase from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";

// Cast to any so CustomFood model works before `npx prisma generate` is run in Docker
const prisma = prismaBase as any;

// Validation

const customFoodSchema = z.object({
  name:        z.string().min(1).max(200),
  calories:    z.number().nonnegative(),
  protein:     z.number().nonnegative().optional().default(0),
  carbs:       z.number().nonnegative().optional().default(0),
  fats:        z.number().nonnegative().optional().default(0),
  defaultQty:  z.number().positive().optional().default(100),
  defaultUnit: z.string().min(1).max(50).optional().default("g"),
  tags:        z.array(z.string()).optional().default([]),
  basedOnId:   z.string().optional(),
});

// GET /api/custom-foods

export const getCustomFoods = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const q      = String(req.query.q || "").trim();

    const foods = await prisma.customFood.findMany({
      where: {
        userId,
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { name: "asc" },
    });

    const results = foods.map((f: any) => ({
      ...f,
      tags: (() => { try { return JSON.parse(f.tags); } catch { return []; } })(),
    }));

    res.json({ foods: results });
  } catch (error) {
    next(error);
  }
};

// POST /api/custom-foods

export const createCustomFood = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const parsed = customFoodSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(createError(parsed.error.errors.map((e: any) => e.message).join(", "), 400));
    }

    const { tags, ...rest } = parsed.data;

    const food = await prisma.customFood.create({
      data: {
        userId,
        ...rest,
        tags: JSON.stringify(tags),
      },
    });

    logger.info("Custom food created by user " + userId + ": " + food.name);
    res.status(201).json({
      food: { ...food, tags: parsed.data.tags },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/custom-foods/:id

export const updateCustomFood = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id     = Number(req.params.id);

    const existing = await prisma.customFood.findFirst({ where: { id, userId } });
    if (!existing) return next(createError("Custom food not found", 404));

    const parsed = customFoodSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return next(createError(parsed.error.errors.map((e: any) => e.message).join(", "), 400));
    }

    const { tags, ...rest } = parsed.data;

    const updated = await prisma.customFood.update({
      where: { id },
      data: {
        ...rest,
        ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
        updatedAt: new Date(),
      },
    });

    const parsedTags = (() => { try { return JSON.parse(updated.tags); } catch { return []; } })();
    logger.info("Custom food " + id + " updated by user " + userId);
    res.json({ food: { ...updated, tags: parsedTags } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/custom-foods/:id

export const deleteCustomFood = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id     = Number(req.params.id);

    const existing = await prisma.customFood.findFirst({ where: { id, userId } });
    if (!existing) return next(createError("Custom food not found", 404));

    await prisma.customFood.delete({ where: { id } });
    logger.info("Custom food " + id + " deleted by user " + userId);
    res.json({ message: "Custom food deleted" });
  } catch (error) {
    next(error);
  }
};
