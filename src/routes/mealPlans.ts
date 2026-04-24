import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
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

router.get("/",                                     getPlans);
router.get("/:id",                                  getPlan);
router.post("/",                                    createPlan);
router.put("/:id",                                  updatePlan);
router.delete("/:id",                               deletePlan);
router.post("/:id/days/:dayId/entries",             addEntry);
router.delete("/:id/entries/:entryId",              deleteEntry);
router.put("/:id/days/:dayId/notes",                updateDayNotes);

export default router;
