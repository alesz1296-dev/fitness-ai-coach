import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { searchFoods, FOOD_DB }              from "../data/foods.js";
import { searchExercises, EXERCISE_DB, MUSCLE_GROUPS, EQUIPMENT_TYPES } from "../data/exercises.js";

// Cast to any so new models (FoodItem, ExerciseItem) work before `npx prisma generate` is run
const db = prisma as any;

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Parse a JSON-encoded string array stored in the DB, returning [] on error. */
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// ─── Food search ─────────────────────────────────────────────────────────────

// GET /api/search/foods?q=chicken&limit=20&tag=keto&offset=0
export const foodSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q      = String(req.query.q     || "").trim();
    const tag    = req.query.tag    ? String(req.query.tag)    : undefined;
    const limit  = Math.min(Number(req.query.limit  || 20), 50);
    const offset = Math.max(Number(req.query.offset ||  0),  0);

    // ── Try DB first ─────────────────────────────────────────────────────────
    const dbCount = await db.foodItem.count();

    if (dbCount > 0) {
      // Build where clause
      const where: Record<string, any> = {};

      if (q) {
        where.name = { contains: q };   // SQLite LIKE (case-insensitive by default)
      }
      if (tag) {
        // Tags are stored as a JSON string array — use LIKE to match the tag token
        where.tags = { contains: `"${tag}"` };
      }

      const [results, total] = await Promise.all([
        db.foodItem.findMany({
          where,
          orderBy: { name: "asc" },
          take:   limit,
          skip:   offset,
        }),
        db.foodItem.count({ where }),
      ]);

      res.json({
        results: results.map((f: any) => ({
          id:          f.id,
          name:        f.name,
          calories:    f.calories,
          protein:     f.protein,
          carbs:       f.carbs,
          fats:        f.fats,
          defaultQty:  f.defaultQty,
          defaultUnit: f.defaultUnit,
          tags:        parseJsonArray(f.tags),
        })),
        total,
        source: "db",
      });
      return;
    }

    // ── Fallback: static array (pre-seed / first boot) ────────────────────────
    const results = searchFoods(q, limit, tag);
    res.json({ results, total: FOOD_DB.length, source: "static" });
  } catch (e) {
    next(e);
  }
};

// ─── Exercise search ──────────────────────────────────────────────────────────

// GET /api/search/exercises?q=bench&muscle=Chest&equipment=Barbell&difficulty=beginner&limit=25&offset=0
export const exerciseSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q          = String(req.query.q || "").trim();
    const muscle     = req.query.muscle     ? String(req.query.muscle)     : undefined;
    const equipment  = req.query.equipment  ? String(req.query.equipment)  : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty) : undefined;
    const limit      = Math.min(Number(req.query.limit  || 25), 100);
    const offset     = Math.max(Number(req.query.offset ||  0),  0);

    // ── Try DB first ─────────────────────────────────────────────────────────
    const dbCount = await db.exerciseItem.count();

    if (dbCount > 0) {
      // "Legs" is a broad alias covering Quads, Hamstrings, Glutes, Calves
      const LEG_MUSCLES = ["Quads", "Hamstrings", "Glutes", "Calves"];

      const where: Record<string, any> = {};

      if (q) {
        where.OR = [
          { name:          { contains: q } },
          { primaryMuscle: { contains: q } },
          // secondaryMuscles is a JSON string — fall back to raw contains
          { secondaryMuscles: { contains: q } },
        ];
      }

      if (muscle) {
        if (muscle === "Legs") {
          where.primaryMuscle = { in: LEG_MUSCLES };
        } else {
          where.primaryMuscle = { equals: muscle };
        }
      }

      if (equipment)  where.equipment  = { equals: equipment };
      if (difficulty) where.difficulty = { equals: difficulty };

      // Exclude Stretching from default (no muscle filter) results
      if (!muscle) {
        where.primaryMuscle = {
          ...(where.primaryMuscle ?? {}),
          not: "Stretching",
        };
      }

      const [results, total] = await Promise.all([
        db.exerciseItem.findMany({
          where,
          orderBy: { name: "asc" },
          take:   limit,
          skip:   offset,
        }),
        db.exerciseItem.count({ where }),
      ]);

      res.json({
        results: results.map((e: any) => ({
          id:               e.id,
          name:             e.name,
          primaryMuscle:    e.primaryMuscle,
          secondaryMuscles: parseJsonArray(e.secondaryMuscles),
          equipment:        e.equipment,
          difficulty:       e.difficulty,
          instructions:     e.instructions,
        })),
        muscleGroups: MUSCLE_GROUPS,
        equipment:    EQUIPMENT_TYPES,
        total,
        source: "db",
      });
      return;
    }

    // ── Fallback: static array (pre-seed / first boot) ────────────────────────
    const results = searchExercises(q, { muscle, equipment, difficulty }, limit);
    res.json({
      results,
      muscleGroups: MUSCLE_GROUPS,
      equipment:    EQUIPMENT_TYPES,
      total:        EXERCISE_DB.length,
      source:       "static",
    });
  } catch (e) {
    next(e);
  }
};
