import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getWeeklyPlan,
  upsertWeeklyPlan,
  toggleDay,
  updateDay,
  deleteWeeklyPlan,
} from "../controllers/weeklyPlanController.js";

const router = Router();
router.use(authenticate);

router.get("/",                        getWeeklyPlan);
router.post("/",                       upsertWeeklyPlan);
router.patch("/days/:dayId/toggle",    toggleDay);
router.put("/days/:dayId",             updateDay);
router.delete("/:planId",             deleteWeeklyPlan);

export default router;
