import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { generateReportSchema } from "../middleware/schemas.js";
import { reportLimiter } from "../middleware/rateLimiter.js";
import { getReports, getReport, generateReport } from "../controllers/reportController.js";

const router = Router();
router.use(authenticate);

// GET  /api/reports
router.get("/", getReports);

// POST /api/reports/generate  (rate limited — expensive compute + AI)
router.post("/generate", reportLimiter, validate(generateReportSchema), generateReport);

// GET  /api/reports/:year/:month
router.get("/:year/:month", getReport);

export default router;
