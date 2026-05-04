import { Request, Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { createError } from "../middleware/errorHandler.js";
import { AuthRequest } from "../middleware/auth.js";
import { blockToken, isBlocked } from "../lib/tokenBlocklist.js";
import { storeToken, consumeToken } from "../lib/tokenStore.js";
import { sendPasswordResetEmail, sendEmailVerificationEmail } from "../lib/email.js";
import logger from "../lib/logger.js";
import { env } from "../config/env.js";

const JWT_SECRET          = env.JWT_SECRET;
const JWT_EXPIRY          = env.JWT_EXPIRY;
const REFRESH_SECRET      = env.REFRESH_SECRET;
const REFRESH_EXPIRY_DAYS = env.REFRESH_EXPIRY_DAYS;
const REFRESH_EXPIRY_MS   = REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_NAME = "fitai_refresh";
const REFRESH_COOKIE_PATH = "/api/auth";
const REFRESH_COOKIE_BASE = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: REFRESH_COOKIE_PATH,
};

// ── Token helpers ──────────────────────────────────────────────────────────────

function signAccessToken(userId: number, email: string): string {
  return jwt.sign({ id: userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  } as jwt.SignOptions);
}

function signRefreshToken(userId: number, email: string, rememberMe = true): string {
  const jti = crypto.randomBytes(16).toString("hex");
  // rememberMe=true → 30 days; rememberMe=false → 24 hours (shared/public device)
  const expiry = rememberMe ? `${REFRESH_EXPIRY_DAYS}d` : "24h";
  return jwt.sign({ id: userId, email, type: "refresh", jti }, REFRESH_SECRET, {
    expiresIn: expiry,
  } as jwt.SignOptions);
}

function verifyRefreshToken(token: string): { id: number; email: string; jti: string; exp: number } {
  const payload = jwt.verify(token, REFRESH_SECRET) as { id: number; email: string; type: string; jti: string; exp: number };
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  if (!payload.jti)               throw new Error("Token missing JTI");
  return { id: payload.id, email: payload.email, jti: payload.jti, exp: payload.exp };
}

function getRefreshTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${REFRESH_COOKIE_NAME}=`));
    if (match) return decodeURIComponent(match.slice(REFRESH_COOKIE_NAME.length + 1));
  }

  const bodyToken = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  return typeof bodyToken === "string" && bodyToken.trim().length > 0 ? bodyToken : null;
}

function setRefreshCookie(
  res: Response,
  refreshToken: string,
  rememberMe = true,
): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...REFRESH_COOKIE_BASE,
    maxAge: rememberMe ? REFRESH_EXPIRY_MS : 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_BASE);
}

async function getAuthUser(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      age: true,
      weight: true,
      height: true,
      sex: true,
      activityLevel: true,
      fitnessLevel: true,
      goal: true,
      profileComplete: true,
      proteinMultiplier: true,
      trainingDaysPerWeek: true,
      trainingHoursPerDay: true,
      planAdjustmentMode: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}

// ── Register ───────────────────────────────────────────────────────────────────

export const register = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) return next(createError("Email or username already in use", 409));

    const hashedPassword = await bcryptjs.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, firstName, lastName },
    });

    const accessToken  = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email);
    setRefreshCookie(res, refreshToken, true);

    // Fire-and-forget — don't block registration if email fails
    const verifyToken = crypto.randomBytes(32).toString("hex");
    storeToken(`verify:${verifyToken}`, String(user.id), 24 * 60 * 60)
      .then(() => sendEmailVerificationEmail(user.email, user.username, verifyToken))
      .catch((err: Error) => logger.warn(`Failed to send verification email: ${err.message}`));

    const authUser = await getAuthUser(user.id);

    logger.info(`New user registered: ${username} (${email})`);
    res.status(201).json({
      message: "Registration successful. Check your email to verify your account.",
      accessToken,
      user: authUser,
    });
  } catch (error) { next(error); }
};

// ── Login ──────────────────────────────────────────────────────────────────────

export const login = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { email, password, rememberMe = true } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return next(createError("Invalid credentials", 401));

    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) return next(createError("Invalid credentials", 401));

    const accessToken  = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email, Boolean(rememberMe));
    setRefreshCookie(res, refreshToken, Boolean(rememberMe));

    const authUser = await getAuthUser(user.id);

    logger.info(`User logged in: ${user.username}`);
    res.json({
      message: "Login successful",
      accessToken,
      user: authUser,
    });
  } catch (error) { next(error); }
};

// ── Refresh ────────────────────────────────────────────────────────────────────

export const refresh = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken)
      return next(createError("Refresh token required", 400));

    let payload: { id: number; email: string; jti: string; exp: number };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return next(createError("Invalid or expired refresh token — please log in again", 401));
    }

    if (await isBlocked(payload.jti))
      return next(createError("Refresh token has been revoked — please log in again", 401));

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return next(createError("User not found", 404));

    const remainingMs = (payload.exp * 1000) - Date.now();
    if (remainingMs > 0) await blockToken(payload.jti, remainingMs);

    const newAccessToken  = signAccessToken(user.id, user.email);
    const newRefreshToken = signRefreshToken(user.id, user.email);
    setRefreshCookie(res, newRefreshToken, true);

    const authUser = await getAuthUser(user.id);

    logger.info(`Token refreshed for user ${user.id}`);
    res.json({ accessToken: newAccessToken, user: authUser });
  } catch (error) { next(error); }
};

// ── Logout ─────────────────────────────────────────────────────────────────────

export const logout = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        const remainingMs = (payload.exp * 1000) - Date.now();
        if (remainingMs > 0) await blockToken(payload.jti, remainingMs);
      } catch {
        // Token already invalid — that's fine
      }
    }

    clearRefreshCookie(res);
    logger.info(`User ${req.user!.id} logged out`);
    res.json({ message: "Logged out successfully" });
  } catch (error) { next(error); }
};

// ── Me ─────────────────────────────────────────────────────────────────────────

export const getMe = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.id },
      select: {
        id: true, email: true, username: true,
        firstName: true, lastName: true,
        age: true, weight: true, height: true,
        sex: true, activityLevel: true,
        fitnessLevel: true, goal: true,
        profileComplete: true, proteinMultiplier: true,
        trainingDaysPerWeek: true, trainingHoursPerDay: true,
        planAdjustmentMode: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    if (!user) return next(createError("User not found", 404));
    res.json({ user });
  } catch (error) { next(error); }
};

// ── Forgot Password ────────────────────────────────────────────────────────────

export const forgotPassword = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token  = crypto.randomBytes(32).toString("hex");
      await storeToken(`reset:${token}`, String(user.id), 60 * 60); // 1 hour
      await sendPasswordResetEmail(user.email, user.username, token);
    }

    // Always 200 — prevents email enumeration
    res.json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (error) { next(error); }
};

// ── Reset Password ─────────────────────────────────────────────────────────────

export const resetPassword = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };

    const userIdStr = await consumeToken(`reset:${token}`);
    if (!userIdStr) return next(createError("Reset link is invalid or has expired", 400));

    const userId = Number(userIdStr);
    const user   = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next(createError("User not found", 404));

    const hashedPassword = await bcryptjs.hash(password, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    logger.info(`Password reset for user ${userId}`);
    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (error) { next(error); }
};

// ── Send Verification Email ────────────────────────────────────────────────────

export const sendVerification = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return next(createError("User not found", 404));

    if ((user as typeof user & { emailVerified: boolean }).emailVerified) {
      res.json({ message: "Email is already verified." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    await storeToken(`verify:${token}`, String(user.id), 24 * 60 * 60); // 24 hours
    await sendEmailVerificationEmail(user.email, user.username, token);

    res.json({ message: "Verification email sent." });
  } catch (error) { next(error); }
};

// ── Verify Email ───────────────────────────────────────────────────────────────

export const verifyEmail = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) return next(createError("Verification token is required", 400));

    const userIdStr = await consumeToken(`verify:${token}`);
    if (!userIdStr) return next(createError("Verification link is invalid or has expired", 400));

    await prisma.user.update({ where: { id: Number(userIdStr) }, data: { emailVerified: true } });

    logger.info(`Email verified for user ${userIdStr}`);
    res.json({ message: "Email verified successfully." });
  } catch (error) { next(error); }
};
