import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";

// GET /api/workouts
export const getWorkouts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const [workouts, total] = await Promise.all([
      prisma.workout.findMany({
        where: { userId: req.user!.id },
        include: { exercises: true },
        orderBy: { date: "desc" },
        take: limit,
        skip,
      }),
      prisma.workout.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({ workouts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// GET /api/workouts/:id
export const getWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workout = await prisma.workout.findFirst({
      where: { id: Number(req.params.id), userId: req.user!.id },
      include: { exercises: true },
    });

    if (!workout) {
      return next(createError("Workout not found", 404));
    }

    res.json({ workout });
  } catch (error) {
    next(error);
  }
};

// POST /api/workouts
export const createWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, duration, caloriesBurned, notes, exercises, date } = req.body;

    if (!name || !duration) {
      return next(createError("name and duration are required", 400));
    }

    const workout = await prisma.workout.create({
      data: {
        userId: req.user!.id,
        name,
        duration: Number(duration),
        ...(caloriesBurned !== undefined && { caloriesBurned: Number(caloriesBurned) }),
        ...(notes && { notes }),
        ...(date && { date: new Date(date) }),
        exercises: {
          create: (exercises || []).map((ex: any) => ({
            exerciseName: ex.exerciseName,
            sets: Number(ex.sets),
            reps: Number(ex.reps),
            ...(ex.weight !== undefined && { weight: Number(ex.weight) }),
            ...(ex.rpe !== undefined && { rpe: Number(ex.rpe) }),
            ...(ex.notes && { notes: ex.notes }),
          })),
        },
      },
      include: { exercises: true },
    });

    logger.info(`Workout logged for user ${req.user!.id}: ${name}`);
    res.status(201).json({ message: "Workout logged", workout });
  } catch (error) {
    next(error);
  }
};

// PUT /api/workouts/:id
export const updateWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workoutId = Number(req.params.id);
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Workout not found", 404));
    }

    const { name, duration, caloriesBurned, notes, date } = req.body;

    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        ...(name !== undefined && { name }),
        ...(duration !== undefined && { duration: Number(duration) }),
        ...(caloriesBurned !== undefined && { caloriesBurned: Number(caloriesBurned) }),
        ...(notes !== undefined && { notes }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: { exercises: true },
    });

    res.json({ message: "Workout updated", workout: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/workouts/:id
export const deleteWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workoutId = Number(req.params.id);
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Workout not found", 404));
    }

    await prisma.workout.delete({ where: { id: workoutId } });
    res.json({ message: "Workout deleted" });
  } catch (error) {
    next(error);
  }
};

// GET /api/workouts/stats — personal records and totals
export const getStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [totalWorkouts, totalCaloriesBurned, recentWorkouts] = await Promise.all([
      prisma.workout.count({ where: { userId } }),
      prisma.workout.aggregate({
        where: { userId },
        _sum: { caloriesBurned: true },
      }),
      prisma.workout.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: { exercises: true },
      }),
    ]);

    // Best lifts per exercise (highest weight)
    const exercises = await prisma.workoutExercise.findMany({
      where: { workout: { userId } },
      orderBy: { weight: "desc" },
    });

    const prs: Record<string, { weight: number; reps: number }> = {};
    for (const ex of exercises) {
      if (ex.weight && (!prs[ex.exerciseName] || ex.weight > prs[ex.exerciseName].weight)) {
        prs[ex.exerciseName] = { weight: ex.weight, reps: ex.reps };
      }
    }

    res.json({
      totalWorkouts,
      totalCaloriesBurned: totalCaloriesBurned._sum.caloriesBurned || 0,
      personalRecords: prs,
      recentWorkouts,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/workouts/exercises/:name/progression
// Returns date + max weight per session for a specific exercise — for charting
export const getExerciseProgression = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exerciseName = decodeURIComponent(req.params.name);
    const limit = Number(req.query.limit) || 30;

    const logs = await prisma.workoutExercise.findMany({
      where: {
        exerciseName: { contains: exerciseName },
        workout: { userId: req.user!.id },
      },
      include: { workout: { select: { date: true, name: true } } },
      orderBy: { workout: { date: "asc" } },
      take: limit * 5, // fetch more to aggregate per session
    });

    // Group by workout session — keep best set (highest weight) per session
    const bySession: Record<string, { date: string; workoutName: string; maxWeight: number; bestReps: number; totalVolume: number }> = {};
    for (const log of logs) {
      const key = String(log.workoutId);
      const dateStr = log.workout.date.toISOString().split("T")[0];
      const vol = (log.weight || 0) * log.sets * log.reps;

      if (!bySession[key]) {
        bySession[key] = { date: dateStr, workoutName: log.workout.name, maxWeight: log.weight || 0, bestReps: log.reps, totalVolume: vol };
      } else {
        if ((log.weight || 0) > bySession[key].maxWeight) {
          bySession[key].maxWeight = log.weight || 0;
          bySession[key].bestReps = log.reps;
        }
        bySession[key].totalVolume += vol;
      }
    }

    const progression = Object.values(bySession)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);

    // Calculate estimated 1RM using Epley formula: weight * (1 + reps/30)
    const withORM = progression.map((p) => ({
      ...p,
      estimated1RM: p.maxWeight > 0 ? Math.round(p.maxWeight * (1 + p.bestReps / 30)) : null,
    }));

    // All-time PR
    const allTimePR = progression.reduce((best, p) =>
      p.maxWeight > best.maxWeight ? p : best, progression[0] || { maxWeight: 0, date: "" }
    );

    res.json({
      exerciseName,
      progression: withORM,
      allTimePR: allTimePR?.maxWeight > 0 ? allTimePR : null,
      totalSessions: progression.length,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/workouts/exercises/:exerciseId — inline edit a single exercise entry
export const updateExerciseEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exerciseId = Number(req.params.exerciseId);

    // Verify the exercise belongs to this user's workout
    const exercise = await prisma.workoutExercise.findFirst({
      where: { id: exerciseId, workout: { userId: req.user!.id } },
    });
    if (!exercise) return next(createError("Exercise entry not found", 404));

    const { sets, reps, weight, rpe, notes, order } = req.body;

    const updated = await prisma.workoutExercise.update({
      where: { id: exerciseId },
      data: {
        ...(sets !== undefined && { sets: Number(sets) }),
        ...(reps !== undefined && { reps: Number(reps) }),
        ...(weight !== undefined && { weight: weight === null ? null : Number(weight) }),
        ...(rpe !== undefined && { rpe: Number(rpe) }),
        ...(notes !== undefined && { notes }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });

    res.json({ message: "Exercise updated", exercise: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/workouts/exercises/:exerciseId — remove a single exercise from a workout
export const deleteExerciseEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exerciseId = Number(req.params.exerciseId);

    const exercise = await prisma.workoutExercise.findFirst({
      where: { id: exerciseId, workout: { userId: req.user!.id } },
    });
    if (!exercise) return next(createError("Exercise entry not found", 404));

    await prisma.workoutExercise.delete({ where: { id: exerciseId } });
    res.json({ message: "Exercise removed from workout" });
  } catch (error) {
    next(error);
  }
};
