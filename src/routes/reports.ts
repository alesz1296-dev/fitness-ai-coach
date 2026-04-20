import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getReports, getReport, generateReport } from "../controllers/reportController.js";

const router = Router();
router.use(authenticate);

// GET  /api/reports
router.get("/", getReports);

// POST /api/reports/generate
router.post("/generate", generateReport);

// GET  /api/reports/:year/:month
router.get("/:year/:month", getReport);

export default router;
