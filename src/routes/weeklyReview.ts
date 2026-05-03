import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  applyWeeklyReviewAdjustment,
  getCurrentWeeklyReview,
  getWeeklyReviewHistory,
  saveWeeklyReview,
} from "../controllers/weeklyReviewController.js";

const router = Router();

router.use(authenticate);

router.get("/current", getCurrentWeeklyReview);
router.get("/history", getWeeklyReviewHistory);
router.post("/", saveWeeklyReview);
router.post("/:id/apply-adjustment", applyWeeklyReviewAdjustment);

export default router;
