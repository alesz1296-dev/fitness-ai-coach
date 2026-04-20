import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
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
router.post("/", createGoal);

// PUT    /api/goals/:id
router.put("/:id", updateGoal);

// DELETE /api/goals/:id
router.delete("/:id", deleteGoal);

export default router;
