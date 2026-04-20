import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from "../controllers/userController.js";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET  /api/users/profile
router.get("/profile", getProfile);

// PUT  /api/users/profile
router.put("/profile", updateProfile);

// PUT  /api/users/password
router.put("/password", changePassword);

// DELETE /api/users/account
router.delete("/account", deleteAccount);

export default router;
