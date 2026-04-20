import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
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
router.post("/", logWeight);

// DELETE /api/weight/:id
router.delete("/:id", deleteWeightLog);

export default router;
