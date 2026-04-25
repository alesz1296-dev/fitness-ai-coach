import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import { logFoodSchema, bulkLogFoodsSchema } from "../middleware/schemas.js";
import {
  getFoodLogs,
  logFood,
  bulkLogFoods,
  updateFoodLog,
  deleteFoodLog,
  getFoodHistory,
  getCheatDates,
  getFrequentFoods,
} from "../controllers/foodController.js";

const router = Router();

router.use(authenticate);

// GET    /api/foods/history  ← must come before /:id
router.get("/history", getFoodHistory);
// GET    /api/foods/cheat-dates?days=90
router.get("/cheat-dates", getCheatDates);
// GET    /api/foods/frequent?limit=5
router.get("/frequent", getFrequentFoods);

// GET    /api/foods  (optional ?date=YYYY-MM-DD)
router.get("/", getFoodLogs);

// POST   /api/foods
router.post("/", validate(logFoodSchema), logFood);

// POST   /api/foods/bulk  (log multiple foods — e.g. from AI meal plan)
router.post("/bulk", validate(bulkLogFoodsSchema), bulkLogFoods);

// PUT    /api/foods/:id  ← edit a logged entry
router.put("/:id", validateIdParam(), validate(logFoodSchema.partial()), updateFoodLog);

// DELETE /api/foods/:id
router.delete("/:id", validateIdParam(), deleteFoodLog);

export default router;
