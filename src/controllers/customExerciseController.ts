import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

const db = prisma as any;

// GET /api/custom-exercises
export const listCustomExercises = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const q = req.query.q ? String(req.query.q).trim() : "";
    const muscle = req.query.muscle ? String(req.query.muscle) : undefined;

    const where: any = { userId };
    if (q) where.name = { contains: q };
    if (muscle) where.primaryMuscle = { equals: muscle };

    const exercises = await db.customExercise.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      exercises: exercises.map((e: any) => ({
        id:               `custom_${e.id}`,
        dbId:             e.id,
        name:             e.name,
        primaryMuscle:    e.primaryMuscle,
        secondaryMuscles: (() => { try { return JSON.parse(e.secondaryMuscles); } catch { return []; } })(),
        equipment:        e.equipment,
        difficulty:       e.difficulty,
        instructions:     e.instructions ?? "",
        isCustom:         true,
      })),
    });
  } catch (e) { next(e); }
};

// POST /api/custom-exercises
export const createCustomExercise = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, primaryMuscle, secondaryMuscles, equipment, difficulty, instructions } = req.body;

    if (!name?.trim()) return next(createError("Exercise name is required", 400));
    if (!primaryMuscle?.trim()) return next(createError("Primary muscle is required", 400));

    const exercise = await db.customExercise.create({
      data: {
        userId,
        name:             name.trim(),
        primaryMuscle:    primaryMuscle.trim(),
        secondaryMuscles: JSON.stringify(Array.isArray(secondaryMuscles) ? secondaryMuscles : []),
        equipment:        equipment ?? "Bodyweight",
        difficulty:       difficulty ?? "beginner",
        instructions:     instructions ?? null,
      },
    });

    res.status(201).json({
      exercise: {
        id:               `custom_${exercise.id}`,
        dbId:             exercise.id,
        name:             exercise.name,
        primaryMuscle:    exercise.primaryMuscle,
        secondaryMuscles: JSON.parse(exercise.secondaryMuscles),
        equipment:        exercise.equipment,
        difficulty:       exercise.difficulty,
        instructions:     exercise.instructions ?? "",
        isCustom:         true,
      },
    });
  } catch (e) { next(e); }
};

// PUT /api/custom-exercises/:id
export const updateCustomExercise = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const existing = await db.customExercise.findFirst({ where: { id, userId } });
    if (!existing) return next(createError("Custom exercise not found", 404));

    const { name, primaryMuscle, secondaryMuscles, equipment, difficulty, instructions } = req.body;
    const updated = await db.customExercise.update({
      where: { id },
      data: {
        ...(name          && { name: name.trim() }),
        ...(primaryMuscle && { primaryMuscle: primaryMuscle.trim() }),
        ...(secondaryMuscles !== undefined && { secondaryMuscles: JSON.stringify(Array.isArray(secondaryMuscles) ? secondaryMuscles : []) }),
        ...(equipment     && { equipment }),
        ...(difficulty    && { difficulty }),
        ...(instructions  !== undefined && { instructions }),
      },
    });

    res.json({ exercise: { ...updated, id: `custom_${updated.id}`, dbId: updated.id, isCustom: true, secondaryMuscles: JSON.parse(updated.secondaryMuscles) } });
  } catch (e) { next(e); }
};

// DELETE /api/custom-exercises/:id
export const deleteCustomExercise = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const existing = await db.customExercise.findFirst({ where: { id, userId } });
    if (!existing) return next(createError("Custom exercise not found", 404));
    await db.customExercise.delete({ where: { id } });
    res.json({ message: "Deleted" });
  } catch (e) { next(e); }
};
