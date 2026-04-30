import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getCustomFoods,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
} from "../controllers/customFoodController.js";

const router = Router();
router.use(authenticate);

// GET    /api/custom-foods        — list user's foods (optional ?q=search)
router.get("/", getCustomFoods);

// POST   /api/custom-foods        — create
router.post("/", createCustomFood);

// PUT    /api/custom-foods/:id    — update
router.put("/:id", updateCustomFood);

// DELETE /api/custom-foods/:id    — delete
router.delete("/:id", deleteCustomFood);

export default router;
