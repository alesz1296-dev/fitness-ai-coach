import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { normalizeExerciseName } from "../lib/normalizeExercise.js";
import logger from "../lib/logger.js";
import { getDayBounds, tzFromRequest } from "../utils/dayBounds.js";

// ── MET-based calorie estimation ───────────────────────────────────────────────
const MET_BY_TYPE: Record<string, number> = {
  strength:    5.0,
  weights:     5.0,
  cardio:      8.0,
  running:     8.5,
  hiit:       10.0,
  endurance:   7.0,
  yoga:        2.5,
  flexibility: 2.5,
  stretching:  2.5,
  crossfit:    8.5,
  cycling:     7.0,
  swimming:    7.0,
};

/**
 * Estimate calories burned using MET × weight × duration.
 * durationMin: actual workout duration in minutes.
 * weightKg:    user body weight (defaults to 75 kg if unknown).
 * trainingType: workout category string (maps to MET table).
 */
function estimateCaloriesBurned(
  durationMin: number,
  weightKg: number,
  trainingType?: string,
): number {
  const met = MET_BY_TYPE[(trainingType ?? "").toLowerCase()] ?? 5.0;
  return Math.max(0, Math.round(met * weightKg * (durationMin / 60)));
}

// ── GET /api/workouts ─────────────────────────────────────────────────────────

export const getWorkouts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 20;
    const page  = Number(req.query.page)  || 1;
    const skip  = (page - 1) * limit;

    const [workouts, total] = await Promise.all([
      prisma.workout.findMany({
        where: { userId: req.user!.id },
        include: { exercises: { orderBy: { order: "asc" } } },
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

// ── GET /api/workouts/:id ─────────────────────────────────────────────────────

export const getWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workout = await prisma.workout.findFirst({
      where: { id: Number(req.params.id), userId: req.user!.id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    if (!workout) {
      return next(createError("Workout not found", 404));
    }

    res.json({ workout });
  } catch (error) {
    next(error);
  }
};

// ── PR detection helper ────────────────────────────────────────────────────────

interface PRResult {
  exerciseName: string;
  weight: number;
  reps: number;
  previousBest: number;
}

async function detectNewPRs(
  userId: number,
  exercises: Array<{ exerciseName: string; weight?: number | null; reps: number; sets: number }>
): Promise<PRResult[]> {
  const newPRs: PRResult[] = [];

  // Only exercises that have weight
  const weightedExercises = exercises.filter((e) => e.weight && e.weight > 0);
  if (!weightedExercises.length) return newPRs;

  const names = [...new Set(weightedExercises.map((e) => e.exerciseName))];

  // Fetch current PRs for these exercise names
  const historicPRs = await prisma.workoutExercise.findMany({
    where: {
      exerciseName: { in: names },
      workout: { userId },
      weight: { not: null },
    },
    select: { exerciseName: true, weight: true },
  });

  const prMap: Record<string, number> = {};
  for (const h of historicPRs) {
    if (!prMap[h.exerciseName] || (h.weight ?? 0) > prMap[h.exerciseName]) {
      prMap[h.exerciseName] = h.weight ?? 0;
    }
  }

  for (const ex of weightedExercises) {
    const currentBest = prMap[ex.exerciseName] ?? 0;
    if ((ex.weight ?? 0) > currentBest) {
      newPRs.push({
        exerciseName: ex.exerciseName,
        weight:       ex.weight!,
        reps:         ex.reps,
        previousBest: currentBest,
      });
    }
  }

  return newPRs;
}

// ── POST /api/workouts ────────────────────────────────────────────────────────

export const createWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, duration, caloriesBurned, notes, exercises, date, templateId, trainingType } = req.body;

    // Normalise exercise names
    const normalisedExercises = (exercises || []).map((ex: any, idx: number) => ({
      ...ex,
      exerciseName: normalizeExerciseName(ex.exerciseName),
      order: ex.order ?? idx,
    }));

    // Detect PRs before saving (compare against history)
    const newPRs = await detectNewPRs(req.user!.id, normalisedExercises);

    // Auto-estimate calories burned if not supplied by client
    let resolvedCaloriesBurned: number | undefined;
    if (caloriesBurned !== undefined) {
      resolvedCaloriesBurned = Number(caloriesBurned);
    } else if (duration) {
      const profile = await (prisma.user as any).findUnique({
        where: { id: req.user!.id },
        select: { weight: true },
      });
      const weightKg = (profile?.weight ?? 75) as number;
      resolvedCaloriesBurned = estimateCaloriesBurned(Number(duration), weightKg, trainingType);
    }

    const workout = await prisma.workout.create({
      data: {
        userId: req.user!.id,
        name,
        duration: Number(duration),
        ...(resolvedCaloriesBurned !== undefined && { caloriesBurned: resolvedCaloriesBurned }),
        ...(notes        && { notes }),
        ...(date         && { date: new Date(date) }),
        ...(templateId   && { templateId: Number(templateId) }),
        ...(trainingType && { trainingType }),
        exercises: {
          create: normalisedExercises.map((ex: any) => ({
            exerciseName: ex.exerciseName,
            sets:  Number(ex.sets),
            reps:  Number(ex.reps),
            order: Number(ex.order ?? 0),
            ...(ex.weight !== undefined && ex.weight !== null && { weight: Number(ex.weight) }),
            ...(ex.rpe   !== undefined && { rpe: Number(ex.rpe) }),
            ...(ex.notes && { notes: ex.notes }),
          })),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    logger.info(`Workout logged for user ${req.user!.id}: ${name}${newPRs.length ? ` (${newPRs.length} new PR${newPRs.length > 1 ? "s" : ""})` : ""}`);

    res.status(201).json({
      message: "Workout logged",
      workout,
      newPRs:          newPRs.length ? newPRs : undefined,
      caloriesBurned:  resolvedCaloriesBurned,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/workouts/calories-burned ────────────────────────────────────────
// Returns total calories burned from workouts on the user's effective "today"
// (or a specific date if ?date=YYYY-MM-DD is provided).

export const getCaloriesBurned = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId    = req.user!.id;
    const dateParam = req.query.date as string | undefined;

    let start: Date, end: Date, dateStr: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      dateStr = dateParam;
      start   = new Date(`${dateStr}T00:00:00.000Z`);
      end     = new Date(`${dateStr}T23:59:59.999Z`);
    } else {
      const tz = tzFromRequest(req.headers as Record<string, string | string[] | undefined>);
      ({ start, end, dateStr } = getDayBounds(tz));
    }

    const workouts = await prisma.workout.findMany({
      where:  { userId, date: { gte: start, lte: end } },
      select: { id: true, name: true, duration: true, caloriesBurned: true, trainingType: true },
      orderBy: { date: "desc" },
    });

    const totalBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0);

    res.json({ date: dateStr, totalBurned, workouts });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/workouts/:id ─────────────────────────────────────────────────────

export const updateWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workoutId = Number(req.params.id);
    const existing  = await prisma.workout.findFirst({
      where: { id: workoutId, userId: req.user!.id },
    });

    if (!existing) {
      return next(createError("Workout not found", 404));
    }

    const { name, duration, caloriesBurned, notes, date, trainingType } = req.body;

    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        ...(name           !== undefined && { name }),
        ...(duration       !== undefined && { duration: Number(duration) }),
        ...(caloriesBurned !== undefined && { caloriesBurned: Number(caloriesBurned) }),
        ...(notes          !== undefined && { notes }),
        ...(date           !== undefined && { date: new Date(date) }),
        ...(trainingType   !== undefined && { trainingType: trainingType || null }),
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    res.json({ message: "Workout updated", workout: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/workouts/:id ──────────────────────────────────────────────────

export const deleteWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workoutId = Number(req.params.id);
    const existing  = await prisma.workout.findFirst({
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

// ── GET /api/workouts/stats ───────────────────────────────────────────────────

export const getStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [totalWorkouts, totalCaloriesResult, recentWorkouts] = await Promise.all([
      prisma.workout.count({ where: { userId } }),
      prisma.workout.aggregate({
        where: { userId },
        _sum: { caloriesBurned: true },
      }),
      prisma.workout.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: { exercises: { orderBy: { order: "asc" } } },
      }),
    ]);

    // Best lifts per exercise (highest weight × reps ≈ 1RM)
    const exercises = await prisma.workoutExercise.findMany({
      where: { workout: { userId }, weight: { not: null } },
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
      totalCaloriesBurned: totalCaloriesResult._sum.caloriesBurned || 0,
      personalRecords: prs,
      recentWorkouts,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/workouts/exercises/:name/progression ─────────────────────────────

export const getExerciseProgression = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exerciseName = normalizeExerciseName(decodeURIComponent(req.params.name));
    const limit        = Number(req.query.limit) || 30;

    const logs = await prisma.workoutExercise.findMany({
      where: {
        exerciseName: { contains: exerciseName },
        workout: { userId: req.user!.id },
      },
      include: { workout: { select: { date: true, name: true } } },
      orderBy: { workout: { date: "asc" } },
      take: limit * 5,
    });

    // Group by workout session — best set per session
    const bySession: Record<string, {
      date: string; workoutName: string; maxWeight: number; bestReps: number; totalVolume: number;
    }> = {};

    for (const log of logs) {
      const key     = String(log.workoutId);
      const dateStr = log.workout.date.toISOString().split("T")[0];
      const vol     = (log.weight || 0) * log.sets * log.reps;

      if (!bySession[key]) {
        bySession[key] = { date: dateStr, workoutName: log.workout.name, maxWeight: log.weight || 0, bestReps: log.reps, totalVolume: vol };
      } else {
        if ((log.weight || 0) > bySession[key].maxWeight) {
          bySession[key].maxWeight = log.weight || 0;
          bySession[key].bestReps  = log.reps;
        }
        bySession[key].totalVolume += vol;
      }
    }

    const progression = Object.values(bySession)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);

    const withORM = progression.map((p) => ({
      ...p,
      estimated1RM: p.maxWeight > 0 ? Math.round(p.maxWeight * (1 + p.bestReps / 30)) : null,
    }));

    const allTimePR = progression.reduce(
      (best, p) => (p.maxWeight > best.maxWeight ? p : best),
      progression[0] || { maxWeight: 0, date: "" }
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

// ── PUT /api/workouts/exercises/:exerciseId ───────────────────────────────────

export const updateExerciseEntry = async (
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

    const { sets, reps, weight, rpe, notes, order } = req.body;

    const updated = await prisma.workoutExercise.update({
      where: { id: exerciseId },
      data: {
        ...(sets   !== undefined && { sets:   Number(sets) }),
        ...(reps   !== undefined && { reps:   Number(reps) }),
        ...(weight !== undefined && { weight: weight === null ? null : Number(weight) }),
        ...(rpe    !== undefined && { rpe:    Number(rpe) }),
        ...(notes  !== undefined && { notes }),
        ...(order  !== undefined && { order:  Number(order) }),
      },
    });

    res.json({ message: "Exercise updated", exercise: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/workouts/exercises/:exerciseId ────────────────────────────────

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

// ── POST /api/workouts/:id/exercises ─────────────────────────────────────────
// Add a single exercise to an already-logged workout.

export const addExerciseToWorkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workoutId = Number(req.params.id);

    // Verify workout ownership and get current exercise count for ordering
    const workout = await prisma.workout.findFirst({
      where: { id: workoutId, userId: req.user!.id },
      include: { exercises: { orderBy: { order: "desc" }, take: 1 } },
    });

    if (!workout) {
      return next(createError("Workout not found", 404));
    }

    const { exerciseName, sets, reps, weight, rpe, notes } = req.body;

    if (!exerciseName || sets === undefined || reps === undefined) {
      return next(createError("exerciseName, sets, and reps are required", 400));
    }

    const nextOrder = (workout.exercises[0]?.order ?? -1) + 1;

    const exercise = await prisma.workoutExercise.create({
      data: {
        workoutId,
        exerciseName: normalizeExerciseName(exerciseName),
        sets:  Number(sets),
        reps:  Number(reps),
        order: nextOrder,
        ...(weight !== undefined && weight !== null && { weight: Number(weight) }),
        ...(rpe    !== undefined && rpe    !== null && { rpe:    Number(rpe) }),
        ...(notes  && { notes }),
      },
    });

    logger.info(`Exercise added to workout ${workoutId} for user ${req.user!.id}: ${exerciseName}`);
    res.status(201).json({ message: "Exercise added", exercise });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/workouts/start-from-template/:templateId ────────────────────────
// Creates a new (empty/pre-filled) workout session from a template.
// The frontend can edit it before formally saving; this is just the starter object.

export const startFromTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templateId = Number(req.params.templateId);

    // Load template with exercises
    const template = await prisma.workoutTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { userId: req.user!.id },  // user's own template
          { isSystem: true },         // system / recommended template
        ],
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    if (!template) {
      return next(createError("Template not found", 404));
    }

    // Build default workout name  (e.g. "Push Day — Apr 20")
    const targetDate  = req.body.date ? new Date(req.body.date) : new Date();
    const dateLabel   = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const workoutName = req.body.name ?? `${template.dayLabel} — ${dateLabel}`;

    // Create the workout pre-filled with the template's exercises.
    // Reps in templates are strings ("8-12"), so we take the lower bound as a default.
    const workout = await prisma.workout.create({
      data: {
        userId:     req.user!.id,
        name:       workoutName,
        date:       targetDate,
        duration:   0, // user fills this in after the session
        templateId: template.id,
        exercises: {
          create: template.exercises.map((te, idx) => {
            // Parse "8-12" → 8, "5" → 5
            const repsDefault = parseInt(te.reps.split("-")[0], 10) || 8;
            return {
              exerciseName: normalizeExerciseName(te.exerciseName),
              sets:  te.sets,
              reps:  repsDefault,
              order: te.order ?? idx,
              ...(te.notes && { notes: te.notes }),
            };
          }),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    logger.info(`Workout started from template ${templateId} for user ${req.user!.id}`);

    res.status(201).json({
      message: "Workout session started",
      workout,
      template: {
        id:          template.id,
        name:        template.name,
        dayLabel:    template.dayLabel,
        objective:   template.objective,
        description: template.description,
      },
    });
  } catch (error) {
    next(error);
  }
};
