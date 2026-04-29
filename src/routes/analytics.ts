import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.use(authenticate);
router.get("/", getAnalytics);

export default router;
