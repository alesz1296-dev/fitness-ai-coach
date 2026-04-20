import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getCalorieGoals,
  getActiveGoal,
  createCalorieGoal,
  getProjection,
  updateCalorieGoal,
  deleteCalorieGoal,
  previewCalorieGoal,
} from "../controllers/calorieGoalController.js";

const router = Router();
router.use(authenticate);

// POST /api/calorie-goals/preview  (calculate without saving)
router.post("/preview", previewCalorieGoal);

// GET  /api/calorie-goals/active
router.get("/active", getActiveGoal);

// GET  /api/calorie-goals
router.get("/", getCalorieGoals);

// POST /api/calorie-goals
router.post("/", createCalorieGoal);

// GET  /api/calorie-goals/:id/projection
router.get("/:id/projection", getProjection);

// PUT  /api/calorie-goals/:id
router.put("/:id", updateCalorieGoal);

// DELETE /api/calorie-goals/:id
router.delete("/:id", deleteCalorieGoal);

export default router;
