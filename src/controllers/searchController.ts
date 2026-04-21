import { Request, Response, NextFunction } from "express";
import { searchFoods, FOOD_DB }         from "../data/foods.js";
import { searchExercises, EXERCISE_DB, MUSCLE_GROUPS, EQUIPMENT_TYPES } from "../data/exercises.js";

// GET /api/search/foods?q=chicken&limit=20
export const foodSearch = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const q     = String(req.query.q || "");
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    res.json({ results: searchFoods(q, limit), total: FOOD_DB.length });
  } catch (e) { next(e); }
};

// GET /api/search/exercises?q=bench&muscle=Chest&equipment=Barbell&difficulty=beginner
export const exerciseSearch = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const q          = String(req.query.q || "");
    const muscle     = req.query.muscle     ? String(req.query.muscle)     : undefined;
    const equipment  = req.query.equipment  ? String(req.query.equipment)  : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty) : undefined;
    const limit      = Math.min(Number(req.query.limit) || 25, 100);

    res.json({
      results:    searchExercises(q, { muscle, equipment, difficulty }, limit),
      muscleGroups: MUSCLE_GROUPS,
      equipment:    EQUIPMENT_TYPES,
      total:        EXERCISE_DB.length,
    });
  } catch (e) { next(e); }
};
