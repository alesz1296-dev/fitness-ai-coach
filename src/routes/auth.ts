import { Router } from "express";
import { register, login, refresh, logout, getMe } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../middleware/schemas.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Public — rate-limited
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login",    authLimiter, validate(loginSchema),    login);
router.post("/refresh",  authLimiter, refresh);

// Protected
router.post("/logout", authenticate, logout);
router.get("/me",      authenticate, getMe);

export default router;
