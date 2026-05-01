import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { validateIdParam } from "../middleware/validate.js";
import { createGoalSchema, updateGoalSchema } from "../middleware/schemas.js";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../controllers/goalController.js";

const router = Router();

router.use(authenticate);

// GET    /api/goals
router.get("/", getGoals);

// POST   /api/goals
router.post("/", validate(createGoalSchema), createGoal);

// PUT    /api/goals/:id
router.put("/:id", validateIdParam(), validate(updateGoalSchema), updateGoal);

// DELETE /api/goals/:id
router.delete("/:id", validateIdParam(), deleteGoal);

export default router;
