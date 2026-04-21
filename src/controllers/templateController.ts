import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { recommendedSplits } from "../lib/seedSplits.js";
import { normalizeExerciseName } from "../lib/normalizeExercise.js";
import logger from "../lib/logger.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseGroups = (s: string): string[] => {
  try { return JSON.parse(s); } catch { return [s]; }
};

// ── GET /api/templates ────────────────────────────────────────────────────────
// Returns user's own templates + system templates.
// Optional filters: ?objective=hypertrophy&frequency=4&splitType=PPL
export const getTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { objective, frequency, splitType } = req.query;

    const where: any = {
      OR: [
        { userId: req.user!.id },
        { isSystem: true },
      ],
    };
    if (objective) where.objective = objective;
    if (frequency) where.frequency = Number(frequency);
    if (splitType) where.splitType = splitType;

    const templates = await prisma.workoutTemplate.findMany({
      where,
      include: { exercises: { orderBy: { order: "asc" } } },
      orderBy: [{ isSystem: "asc" }, { createdAt: "desc" }],
    });

    res.json({
      templates: templates.map((t) => ({
        ...t,
        muscleGroups: parseGroups(t.muscleGroups),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/templates/recommended ───────────────────────────────────────────
// Returns system templates only, optionally filtered + grouped by split
export const getRecommended = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { objective, frequency, splitType } = req.query;

    const where: any = { isSystem: true };
    if (objective) where.objective = objective;
    if (frequency) where.frequency = Number(frequency);
    if (splitType) where.splitType = splitType;

    const templates = await prisma.workoutTemplate.findMany({
      where,
      include: { exercises: { orderBy: { order: "asc" } } },
      orderBy: [{ frequency: "asc" }, { splitType: "asc" }],
    });

    // Group by splitType for a nicer response shape
    const grouped: Record<string, any[]> = {};
    for (const t of templates) {
      const key = `${t.splitType}_${t.frequency}d`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...t, muscleGroups: parseGroups(t.muscleGroups) });
    }

    res.json({ grouped, all: templates.map((t) => ({ ...t, muscleGroups: parseGroups(t.muscleGroups) })) });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/templates/:id ────────────────────────────────────────────────────
export const getTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = await prisma.workoutTemplate.findFirst({
      where: {
        id: Number(req.params.id),
        OR: [{ userId: req.user!.id }, { isSystem: true }],
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    if (!template) return next(createError("Template not found", 404));

    res.json({ template: { ...template, muscleGroups: parseGroups(template.muscleGroups) } });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/templates ───────────────────────────────────────────────────────
export const createTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, splitType, objective, frequency, dayLabel, muscleGroups, exercises, aiGenerated } = req.body;

    if (!name || !splitType || !objective || !frequency || !dayLabel) {
      return next(createError("name, splitType, objective, frequency, and dayLabel are required", 400));
    }

    const template = await prisma.workoutTemplate.create({
      data: {
        userId: req.user!.id,
        name,
        description,
        splitType,
        objective,
        frequency: Number(frequency),
        dayLabel,
        muscleGroups: JSON.stringify(muscleGroups || []),
        aiGenerated: Boolean(aiGenerated),
        exercises: {
          create: (exercises || []).map((ex: any, i: number) => ({
            exerciseName: normalizeExerciseName(ex.exerciseName),
            sets: Number(ex.sets),
            reps: String(ex.reps),
            restSeconds: ex.restSeconds ? Number(ex.restSeconds) : null,
            notes: ex.notes || null,
            order: ex.order ?? i,
          })),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    logger.info(`Template created by user ${req.user!.id}: ${name}`);
    res.status(201).json({ message: "Template created", template: { ...template, muscleGroups: parseGroups(template.muscleGroups) } });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/templates/:id ────────────────────────────────────────────────────
// Update template metadata (not exercises — use the exercises sub-routes)
export const updateTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) return next(createError("Template not found", 404));

    const { name, description, splitType, objective, frequency, dayLabel, muscleGroups } = req.body;

    const updated = await prisma.workoutTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(splitType && { splitType }),
        ...(objective && { objective }),
        ...(frequency && { frequency: Number(frequency) }),
        ...(dayLabel && { dayLabel }),
        ...(muscleGroups && { muscleGroups: JSON.stringify(muscleGroups) }),
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    res.json({ message: "Template updated", template: { ...updated, muscleGroups: parseGroups(updated.muscleGroups) } });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/templates/:id/exercises ─────────────────────────────────────────
// Add an exercise to a template
export const addExercise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templateId = Number(req.params.id);
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId: req.user!.id },
    });
    if (!existing) return next(createError("Template not found", 404));

    const { exerciseName, sets, reps, restSeconds, notes, order } = req.body;
    if (!exerciseName || !sets || !reps) {
      return next(createError("exerciseName, sets, and reps are required", 400));
    }

    const count = await prisma.templateExercise.count({ where: { templateId } });

    const exercise = await prisma.templateExercise.create({
      data: {
        templateId,
        exerciseName: normalizeExerciseName(exerciseName),
        sets: Number(sets),
        reps: String(reps),
        restSeconds: restSeconds ? Number(restSeconds) : null,
        notes: notes || null,
        order: order !== undefined ? Number(order) : count,
      },
    });

    res.status(201).json({ message: "Exercise added", exercise });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/templates/:id/exercises/:exerciseId ───────────────────────────────
// Edit an exercise inline
export const updateExercise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templateId = Number(req.params.id);
    const exerciseId = Number(req.params.exerciseId);

    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId: req.user!.id },
    });
    if (!template) return next(createError("Template not found", 404));

    const ex = await prisma.templateExercise.findFirst({ where: { id: exerciseId, templateId } });
    if (!ex) return next(createError("Exercise not found", 404));

    const { exerciseName, sets, reps, restSeconds, notes, order } = req.body;

    const updated = await prisma.templateExercise.update({
      where: { id: exerciseId },
      data: {
        ...(exerciseName && { exerciseName: normalizeExerciseName(exerciseName) }),
        ...(sets !== undefined && { sets: Number(sets) }),
        ...(reps !== undefined && { reps: String(reps) }),
        ...(restSeconds !== undefined && { restSeconds: Number(restSeconds) }),
        ...(notes !== undefined && { notes }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });

    res.json({ message: "Exercise updated", exercise: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/templates/:id/exercises/:exerciseId ───────────────────────────
export const removeExercise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templateId = Number(req.params.id);
    const exerciseId = Number(req.params.exerciseId);

    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId: req.user!.id },
    });
    if (!template) return next(createError("Template not found", 404));

    await prisma.templateExercise.deleteMany({ where: { id: exerciseId, templateId } });
    res.json({ message: "Exercise removed" });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/templates/:id ─────────────────────────────────────────────────
export const deleteTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id, userId: req.user!.id },
    });
    if (!existing) return next(createError("Template not found or not yours to delete", 404));

    await prisma.workoutTemplate.delete({ where: { id } });
    res.json({ message: "Template deleted" });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/templates/from-workout/:workoutId ───────────────────────────────
// Create a template directly from a previously logged workout
export const createFromWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workoutId = Number(req.params.workoutId);
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId: req.user!.id },
      include: { exercises: { orderBy: { createdAt: "asc" } } },
    });
    if (!workout) return next(createError("Workout not found", 404));

    const { splitType = "Custom", objective = "general", frequency = 3, dayLabel, muscleGroups = [] } = req.body;

    const template = await prisma.workoutTemplate.create({
      data: {
        userId: req.user!.id,
        name: req.body.name || `${workout.name} (Template)`,
        description: `Created from workout on ${workout.date.toDateString()}`,
        splitType,
        objective,
        frequency: Number(frequency),
        dayLabel: dayLabel || workout.name,
        muscleGroups: JSON.stringify(muscleGroups),
        exercises: {
          create: workout.exercises.map((ex) => ({
            exerciseName: normalizeExerciseName(ex.exerciseName),
            sets: ex.sets,
            reps: String(ex.reps),
            notes: ex.notes || null,
            order: ex.order,
          })),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    logger.info(`Template created from workout ${workoutId} by user ${req.user!.id}`);
    res.status(201).json({ message: "Template created from workout", template });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/templates/seed ──────────────────────────────────────────────────
// Seeds the DB with all recommended system splits (run once / idempotent)
export const seedRecommended = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let seeded = 0;
    for (const split of recommendedSplits) {
      const exists = await prisma.workoutTemplate.findFirst({
        where: { name: split.name, isSystem: true },
      });
      if (!exists) {
        await prisma.workoutTemplate.create({
          data: {
            name: split.name,
            description: split.description,
            splitType: split.splitType,
            objective: split.objective,
            frequency: split.frequency,
            dayLabel: split.dayLabel,
            muscleGroups: JSON.stringify(split.muscleGroups),
            isSystem: true,
            exercises: {
              create: split.exercises.map((ex) => ({
                exerciseName: ex.exerciseName,
                sets: ex.sets,
                reps: ex.reps,
                restSeconds: ex.restSeconds,
                notes: ex.notes || null,
                order: ex.order,
              })),
            },
          },
        });
        seeded++;
      }
    }

    res.json({ message: `Seeded ${seeded} recommended splits (${recommendedSplits.length - seeded} already existed)` });
  } catch (error) {
    next(error);
  }
};
