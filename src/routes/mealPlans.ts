import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import {
  createMealPlanSchema,
  updateMealPlanSchema,
  addMealPlanEntrySchema,
  updateMealPlanDayNotesSchema,
} from "../middleware/schemas.js";
import {
  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  addEntry,
  deleteEntry,
  updateDayNotes,
} from "../controllers/mealPlanController.js";

const router = Router();
router.use(authenticate);

router.get("/", getPlans);
router.get("/:id", validateIdParam(), getPlan);
router.post("/", validate(createMealPlanSchema), createPlan);
router.put("/:id", validateIdParam(), validate(updateMealPlanSchema), updatePlan);
router.delete("/:id", validateIdParam(), deletePlan);

const vId = validateIdParam;
const vDayId = validateIdParam("dayId");
const vEntryId = validateIdParam("entryId");
router.post("/:id/days/:dayId/entries", vId(), vDayId, validate(addMealPlanEntrySchema), addEntry);
router.delete("/:id/entries/:entryId", vId(), vEntryId, deleteEntry);
router.put("/:id/days/:dayId/notes", vId(), vDayId, validate(updateMealPlanDayNotesSchema), updateDayNotes);

export default router;
