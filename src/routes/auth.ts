import { Router } from "express";
import {
  register, login, refresh, logout, getMe,
  forgotPassword, resetPassword,
  sendVerification, verifyEmail,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../middleware/schemas.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ── Public (rate-limited) ────────────────────────────────────────────────────
router.post("/register",         authLimiter, validate(registerSchema),       register);
router.post("/login",            authLimiter, validate(loginSchema),           login);
router.post("/refresh",          authLimiter,                                  refresh);
router.post("/forgot-password",  authLimiter, validate(forgotPasswordSchema),  forgotPassword);
router.post("/reset-password",   authLimiter, validate(resetPasswordSchema),   resetPassword);

// ── Public — verify email via link (token in query string) ───────────────────
router.get("/verify-email", verifyEmail);

// ── Protected ────────────────────────────────────────────────────────────────
router.post("/logout",            authenticate, logout);
router.get("/me",                 authenticate, getMe);
router.post("/send-verification", authenticate, sendVerification);

export default router;
