import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  sendMessage,
  getHistory,
  clearHistory,
  saveWorkoutFromChat,
  saveCaloriePlanFromChat,
} from "../controllers/chatController.js";

const router = Router();
router.use(authenticate);

// POST   /api/chat
router.post("/", sendMessage);

// GET    /api/chat/history  (optional ?agentType=coach&page=1&limit=20)
router.get("/history", getHistory);

// DELETE /api/chat/history  (optional ?agentType=coach)
router.delete("/history", clearHistory);

// POST   /api/chat/save-workout  (save AI-suggested workout as template)
router.post("/save-workout", saveWorkoutFromChat);

// POST   /api/chat/save-calorie-plan  (save AI-suggested nutrition plan)
router.post("/save-calorie-plan", saveCaloriePlanFromChat);

export default router;
