import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import {
  createCalorieGoalSchema,
  updateCalorieGoalSchema,
  previewCalorieGoalSchema,
} from "../middleware/schemas.js";
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
router.post("/preview", validate(previewCalorieGoalSchema), previewCalorieGoal);

// GET  /api/calorie-goals/active
router.get("/active", getActiveGoal);

// GET  /api/calorie-goals
router.get("/", getCalorieGoals);

// POST /api/calorie-goals
router.post("/", validate(createCalorieGoalSchema), createCalorieGoal);

// GET  /api/calorie-goals/:id/projection
router.get("/:id/projection", validateIdParam(), getProjection);

// PUT  /api/calorie-goals/:id
router.put("/:id", validateIdParam(), validate(updateCalorieGoalSchema), updateCalorieGoal);

// DELETE /api/calorie-goals/:id
router.delete("/:id", validateIdParam(), deleteCalorieGoal);

export default router;
