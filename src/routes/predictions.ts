import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getPredictions, previewPrediction } from "../controllers/predictionController.js";

const router = Router();

router.use(authenticate);

// GET /api/predictions
router.get("/", getPredictions);

// POST /api/predictions/preview
router.post("/preview", previewPrediction);

export default router;
