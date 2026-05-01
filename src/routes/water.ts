import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import { logWaterSchema, updateWaterTargetSchema } from "../middleware/schemas.js";
import {
  logWater,
  getToday,
  getHistory,
  deleteLog,
  updateWaterTarget,
} from "../controllers/waterController.js";

const router = Router();
router.use(authenticate);

router.post("/", validate(logWaterSchema), logWater);
router.get("/today", getToday);
router.get("/history", getHistory);
router.delete("/:id", validateIdParam(), deleteLog);
router.put("/target", validate(updateWaterTargetSchema), updateWaterTarget);

export default router;
