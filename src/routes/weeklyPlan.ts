import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import {
  upsertWeeklyPlanSchema,
  toggleDaySchema,
  updateDaySchema,
} from "../middleware/schemas.js";
import {
  getWeeklyPlan,
  upsertWeeklyPlan,
  toggleDay,
  updateDay,
  deleteWeeklyPlan,
} from "../controllers/weeklyPlanController.js";

const router = Router();
router.use(authenticate);

// GET    /api/weekly-plan
router.get("/", getWeeklyPlan);

// POST   /api/weekly-plan
router.post("/", validate(upsertWeeklyPlanSchema), upsertWeeklyPlan);

// PATCH  /api/weekly-plan/days/:dayId/toggle
router.patch("/days/:dayId/toggle", validateIdParam("dayId"), validate(toggleDaySchema), toggleDay);

// PUT    /api/weekly-plan/days/:dayId
router.put("/days/:dayId", validateIdParam("dayId"), validate(updateDaySchema), updateDay);

// DELETE /api/weekly-plan/:planId
router.delete("/:planId", validateIdParam("planId"), deleteWeeklyPlan);

export default router;
