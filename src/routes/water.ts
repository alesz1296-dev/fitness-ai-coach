import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  logWater,
  getToday,
  getHistory,
  deleteLog,
  updateWaterTarget,
} from "../controllers/waterController.js";

const router = Router();
router.use(authenticate);

router.post("/",              logWater);
router.get("/today",          getToday);
router.get("/history",        getHistory);
router.delete("/:id",         deleteLog);
router.put("/target",         updateWaterTarget);

export default router;
