import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getPredictions } from "../controllers/predictionController.js";

const router = Router();

router.use(authenticate);

// GET /api/predictions
router.get("/", getPredictions);

export default router;
