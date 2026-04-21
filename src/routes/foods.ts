import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import { logFoodSchema } from "../middleware/schemas.js";
import {
  getFoodLogs,
  logFood,
  updateFoodLog,
  deleteFoodLog,
  getFoodHistory,
} from "../controllers/foodController.js";

const router = Router();

router.use(authenticate);

// GET    /api/foods/history  ← must come before /:id
router.get("/history", getFoodHistory);

// GET    /api/foods  (optional ?date=YYYY-MM-DD)
router.get("/", getFoodLogs);

// POST   /api/foods
router.post("/", validate(logFoodSchema), logFood);

// PUT    /api/foods/:id  ← edit a logged entry
router.put("/:id", validateIdParam(), validate(logFoodSchema.partial()), updateFoodLog);

// DELETE /api/foods/:id
router.delete("/:id", validateIdParam(), deleteFoodLog);

export default router;
