import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import redisClient from "../lib/redis.js";
import { searchFoods, FOOD_DB }              from "../data/foods.js";
import { searchExercises, EXERCISE_DB, MUSCLE_GROUPS, EQUIPMENT_TYPES, COMPOUND_GROUP_MAP } from "../data/exercises.js";

// Cast to any so new models (FoodItem, ExerciseItem) work before `npx prisma generate` is run
const db = prisma as any;

// ─── Redis cache helpers ──────────────────────────────────────────────────────

const CACHE_TTL = 600; // 10 minutes

async function cacheGet(key: string): Promise<string | null> {
  if (!redisClient) return null;
  try { return await redisClient.get(key); } catch { return null; }
}

async function cacheSet(key: string, value: string): Promise<void> {
  if (!redisClient) return;
  try { await redisClient.setex(key, CACHE_TTL, value); } catch { /* ignore */ }
}

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
    const tagsParam = req.query.tags ? String(req.query.tags) : (req.query.tag ? String(req.query.tag) : undefined);
    const tags   = tagsParam ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const limit  = Math.min(Number(req.query.limit  || 20), 50);
    const offset = Math.max(Number(req.query.offset ||  0),  0);

    // ── Redis cache — food search results are user-agnostic ──────────────────
    const cacheKey = `search:food:${q}:${tags.join("|")}:${limit}:${offset}`;
    const cached   = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    // ── Try DB first ─────────────────────────────────────────────────────────
    const dbCount = await db.foodItem.count();

    if (dbCount > 0) {
      const where: Record<string, any> = {};

      if (q)   where.name = { contains: q };
      if (tags.length > 0) {
        // AND logic: item must have ALL selected tags
        where.AND = tags.map((t) => ({ tags: { contains: `"${t}"` } }));
      }

      const [results, total] = await Promise.all([
        db.foodItem.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: offset }),
        db.foodItem.count({ where }),
      ]);

      const payload = {
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
      };

      await cacheSet(cacheKey, JSON.stringify(payload));
      res.json(payload);
      return;
    }

    // ── Fallback: static array ────────────────────────────────────────────────
    const results = searchFoods(q, limit, tags);
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

    // ── Redis cache ───────────────────────────────────────────────────────────
    const cacheKey = `search:ex:${q}:${muscle ?? ""}:${equipment ?? ""}:${difficulty ?? ""}:${limit}:${offset}`;
    const cached   = await cacheGet(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    // ── Try DB first ─────────────────────────────────────────────────────────
    const dbCount = await db.exerciseItem.count();

    if (dbCount > 0) {
      const LEG_MUSCLES = ["Quads", "Hamstrings", "Glutes", "Calves"];
      const where: Record<string, any> = {};

      if (q) {
        where.OR = [
          { name:             { contains: q } },
          { primaryMuscle:    { contains: q } },
          { secondaryMuscles: { contains: q } },
        ];
      }

      if (muscle) {
        const compoundMuscles = COMPOUND_GROUP_MAP[muscle];
        where.primaryMuscle = muscle === "Legs"
          ? { in: LEG_MUSCLES }
          : compoundMuscles
          ? { in: compoundMuscles }
          : { equals: muscle };
      }

      if (equipment)  where.equipment  = { equals: equipment };
      if (difficulty) where.difficulty = { equals: difficulty };

      if (!muscle) {
        where.primaryMuscle = {
          ...(where.primaryMuscle ?? {}),
          not: "Stretching",
        };
      }

      const [results, total] = await Promise.all([
        db.exerciseItem.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: offset }),
        db.exerciseItem.count({ where }),
      ]);

      // Merge user's custom exercises (no cache — user-specific)
      const userId = (req as AuthRequest).user?.id;
      let customResults: any[] = [];
      if (userId) {
        const customWhere: any = { userId };
        if (q) customWhere.name = { contains: q };
        if (muscle) {
          const compoundMuscles = COMPOUND_GROUP_MAP[muscle];
          customWhere.primaryMuscle = muscle === "Legs"
            ? { in: LEG_MUSCLES }
            : compoundMuscles ? { in: compoundMuscles } : { equals: muscle };
        }
        customResults = await db.customExercise.findMany({ where: customWhere, orderBy: { name: "asc" } }).catch(() => []);
      }

      const payload = {
        results: [
          ...customResults.map((e: any) => ({
            id:               `custom_${e.id}`,
            dbId:             e.id,
            name:             e.name,
            primaryMuscle:    e.primaryMuscle,
            secondaryMuscles: parseJsonArray(e.secondaryMuscles),
            equipment:        e.equipment,
            difficulty:       e.difficulty,
            instructions:     e.instructions ?? "",
            isCustom:         true,
          })),
          ...results.map((e: any) => ({
            id:               e.id,
            name:             e.name,
            primaryMuscle:    e.primaryMuscle,
            secondaryMuscles: parseJsonArray(e.secondaryMuscles),
            equipment:        e.equipment,
            difficulty:       e.difficulty,
            instructions:     e.instructions,
          })),
        ],
        muscleGroups: MUSCLE_GROUPS,
        equipment:    EQUIPMENT_TYPES,
        total:        total + customResults.length,
        source: "db",
      };

      await cacheSet(cacheKey, JSON.stringify(payload));
      res.json(payload);
      return;
    }

    // ── Fallback: static array ────────────────────────────────────────────────
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
