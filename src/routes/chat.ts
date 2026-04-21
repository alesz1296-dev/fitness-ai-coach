import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate, validateIdParam } from "../middleware/validate.js";
import {
  sendMessageSchema,
  saveWorkoutFromChatSchema,
  saveCaloriePlanFromChatSchema,
} from "../middleware/schemas.js";
import { chatLimiter } from "../middleware/rateLimiter.js";
import {
  sendMessage,
  getHistory,
  clearHistory,
  saveWorkoutFromChat,
  saveCaloriePlanFromChat,
} from "../controllers/chatController.js";

const router = Router();
router.use(authenticate);

// POST   /api/chat  (rate limited — protects OpenAI costs)
router.post("/", chatLimiter, validate(sendMessageSchema), sendMessage);

// GET    /api/chat/history  (optional ?agentType=coach&page=1&limit=20)
router.get("/history", getHistory);

// DELETE /api/chat/history  (optional ?agentType=coach)
router.delete("/history", clearHistory);

// POST   /api/chat/save-workout  (save AI-suggested workout as template)
router.post("/save-workout", validate(saveWorkoutFromChatSchema), saveWorkoutFromChat);

// POST   /api/chat/save-calorie-plan  (save AI-suggested nutrition plan)
router.post("/save-calorie-plan", validate(saveCaloriePlanFromChatSchema), saveCaloriePlanFromChat);

export default router;
