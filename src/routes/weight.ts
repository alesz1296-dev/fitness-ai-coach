import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import { logWeightSchema } from "../middleware/schemas.js";
import {
  getWeightLogs,
  logWeight,
  deleteWeightLog,
} from "../controllers/weightController.js";

const router = Router();

router.use(authenticate);

// GET    /api/weight  (optional ?days=30)
router.get("/", getWeightLogs);

// POST   /api/weight
router.post("/", validate(logWeightSchema), logWeight);

// DELETE /api/weight/:id
router.delete("/:id", validateIdParam(), deleteWeightLog);

export default router;
