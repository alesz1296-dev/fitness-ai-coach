import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getFoodLogs,
  logFood,
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
router.post("/", logFood);

// DELETE /api/foods/:id
router.delete("/:id", deleteFoodLog);

export default router;
