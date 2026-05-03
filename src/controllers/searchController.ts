import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import redisClient from "../lib/redis.js";
import { searchFoods, FOOD_DB }              from "../data/foods.js";
import { searchExercises, EXERCISE_DB, MUSCLE_GROUPS, EQUIPMENT_TYPES, COMPOUND_GROUP_MAP } from "../data/exercises.js";
import { getProvider } from "../ai/providers/index.js";

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

function parseJsonObject(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

// ─── AI translation helpers ───────────────────────────────────────────────────

const LANG_CACHE_TTL = 3600; // 1 hour for translations

/**
 * Translate a search query from any language → English using the configured AI provider.
 * Returns the original query on any error so search always works.
 */
async function translateQueryToEnglish(query: string, sourceLang: string): Promise<string> {
  if (!query) return query;
  const cacheKey = `translate:q:${sourceLang}:${query}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  try {
    const provider = getProvider();
    const result = await provider.complete({
      model: provider.defaultModel,
      messages: [
        {
          role: "system",
          content: "You are a food translation assistant. Translate the user's food search query to English. Respond with ONLY the translated text — no explanation, no punctuation, no extra words.",
        },
        { role: "user", content: `Translate this food search query from ${sourceLang} to English: "${query}"` },
      ],
      max_tokens: 60,
      temperature: 0,
    });
    const translated = result.message.content?.trim() ?? query;
    await cacheSet(cacheKey, translated);
    // Override TTL to 1h for translations
    if (redisClient) {
      try { await redisClient.expire(cacheKey, LANG_CACHE_TTL); } catch { /* ignore */ }
    }
    return translated;
  } catch {
    return query;
  }
}

/**
 * Translate an array of food names from English → target language.
 * Returns the original names on any error.
 */
async function translateFoodNames(
  names: string[],
  targetLang: string
): Promise<string[]> {
  if (!names.length) return names;
  const cacheKey = `translate:names:${targetLang}:${names.join("|")}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as string[]; } catch { /* fall through */ }
  }
  try {
    const provider = getProvider();
    const result = await provider.complete({
      model: provider.defaultModel,
      messages: [
        {
          role: "system",
          content: `You are a food translation assistant. Translate the food names from English to ${targetLang}. Return ONLY a JSON array of translated strings in the same order, nothing else. Example: ["pollo", "arroz", "manzana"]`,
        },
        { role: "user", content: JSON.stringify(names) },
      ],
      max_tokens: 400,
      temperature: 0,
    });
    const raw = result.message.content?.trim() ?? "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return names;
    const translated = JSON.parse(match[0]) as string[];
    if (!Array.isArray(translated) || translated.length !== names.length) return names;
    await cacheSet(cacheKey, JSON.stringify(translated));
    if (redisClient) {
      try { await redisClient.expire(cacheKey, LANG_CACHE_TTL); } catch { /* ignore */ }
    }
    return translated;
  } catch {
    return names;
  }
}

// ─── Food search ─────────────────────────────────────────────────────────────

// GET /api/search/foods?q=chicken&limit=20&tag=keto&offset=0&lang=es
export const foodSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawQ   = String(req.query.q     || "").trim();
    const lang   = String(req.query.lang  || "en").toLowerCase().slice(0, 5);
    const tagsParam = req.query.tags ? String(req.query.tags) : (req.query.tag ? String(req.query.tag) : undefined);
    const tags   = tagsParam ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const limit  = Math.min(Number(req.query.limit  || 20), 50);
    const offset = Math.max(Number(req.query.offset ||  0),  0);

    // Translate query to English when user is searching in another language
    const q = (lang !== "en" && rawQ) ? await translateQueryToEnglish(rawQ, lang) : rawQ;

    // ── Redis cache — keyed by translated English query (lang-neutral) ──────
    const cacheKey = `search:food:${q}:${tags.join("|")}:${limit}:${offset}`;
    const cached   = await cacheGet(cacheKey);

    // ── Helper: translate result names when lang !== "en" ────────────────────
    async function applyTranslation(items: any[]): Promise<any[]> {
      if (lang === "en" || !items.length) return items;
      const names = items.map((f) => f.name as string);
      const byLocalized = items.map((f) => {
        const localized = f.localizedNames?.[lang];
        return typeof localized === "string" && localized.trim() ? localized : null;
      });
      const translated = await translateFoodNames(names, lang);
      return items.map((f, i) => ({
        ...f,
        name: byLocalized[i] ?? translated[i] ?? f.name,
      }));
    }

    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.results = await applyTranslation(parsed.results);
      res.json(parsed);
      return;
    }

    // ── Try DB first ─────────────────────────────────────────────────────────
    const dbCount = await db.foodItem.count();

    if (dbCount > 0) {
      const where: Record<string, any> = {};

      if (q) {
        where.OR = [
          { name:    { contains: q } },
          { aliases: { contains: q } },
        ];
      }
      if (tags.length > 0) {
        // AND logic: item must have ALL selected tags
        where.AND = tags.map((t) => ({ tags: { contains: `"${t}"` } }));
      }

      const [results, total] = await Promise.all([
        db.foodItem.findMany({ where, orderBy: { name: "asc" }, take: limit, skip: offset }),
        db.foodItem.count({ where }),
      ]);

      const mapped = results.map((f: any) => ({
        id:          f.id,
        name:        f.name,
        calories:    f.calories,
        protein:     f.protein,
        carbs:       f.carbs,
        fats:        f.fats,
        defaultQty:  f.defaultQty,
        defaultUnit: f.defaultUnit,
        tags:        parseJsonArray(f.tags),
        aliases:     parseJsonArray(f.aliases),
        localizedNames: parseJsonObject(f.localizedNames),
      }));

      // Cache English results, translate on the way out
      const payload = { results: mapped, total, source: "db" };
      await cacheSet(cacheKey, JSON.stringify(payload));

      payload.results = await applyTranslation(mapped);
      res.json(payload);
      return;
    }

    // ── Fallback: static array ────────────────────────────────────────────────
      const rawResults = searchFoods(q, limit, tags);
      const translatedResults = await applyTranslation(rawResults);
    res.json({ results: translatedResults, total: FOOD_DB.length, source: "static" });
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
