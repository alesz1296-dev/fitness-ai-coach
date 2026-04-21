import { Request, Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { createError } from "../middleware/errorHandler.js";
import { AuthRequest } from "../middleware/auth.js";
import logger from "../lib/logger.js";

const JWT_SECRET          = process.env.JWT_SECRET     || "secret-key";
const JWT_EXPIRY          = process.env.JWT_EXPIRY      || "15m";
const REFRESH_SECRET      = process.env.REFRESH_SECRET  || "refresh-secret-key";
const REFRESH_EXPIRY_DAYS = Number(process.env.REFRESH_EXPIRY_DAYS) || 30;
const REFRESH_EXPIRY_STR  = `${REFRESH_EXPIRY_DAYS}d`;

// ── Token helpers ──────────────────────────────────────────────────────────────

function signAccessToken(userId: number, email: string): string {
  return jwt.sign({ id: userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  } as jwt.SignOptions);
}

function signRefreshToken(userId: number, email: string): string {
  // Refresh token is a signed JWT — no DB table needed
  return jwt.sign({ id: userId, email, type: "refresh" }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY_STR,
  } as jwt.SignOptions);
}

function verifyRefreshToken(token: string): { id: number; email: string } {
  const payload = jwt.verify(token, REFRESH_SECRET) as any;
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return { id: payload.id, email: payload.email };
}

// ── Register ───────────────────────────────────────────────────────────────────

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      return next(createError("Email or username already in use", 409));
    }

    const hashedPassword = await bcryptjs.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, firstName, lastName },
    });

    const accessToken  = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email);

    logger.info(`New user registered: ${username} (${email})`);

    res.status(201).json({
      message: "Registration successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Login ──────────────────────────────────────────────────────────────────────

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return next(createError("Invalid credentials", 401));
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);

    if (!passwordMatch) {
      return next(createError("Invalid credentials", 401));
    }

    const accessToken  = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id, user.email);

    logger.info(`User logged in: ${user.username}`);

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Refresh ────────────────────────────────────────────────────────────────────

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return next(createError("Refresh token required", 400));
    }

    let payload: { id: number; email: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return next(createError("Invalid or expired refresh token — please log in again", 401));
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return next(createError("User not found", 404));

    const newAccessToken  = signAccessToken(user.id, user.email);
    const newRefreshToken = signRefreshToken(user.id, user.email);

    logger.info(`Token refreshed for user ${user.id}`);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

// ── Logout ─────────────────────────────────────────────────────────────────────
// With JWT-based refresh tokens there's nothing to revoke server-side.
// The client simply discards its tokens. For true revocation a token
// blocklist (Redis / DB) can be added later.

export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    logger.info(`User ${req.user!.id} logged out`);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// ── Me ─────────────────────────────────────────────────────────────────────────

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, username: true,
        firstName: true, lastName: true,
        age: true, weight: true, height: true,
        sex: true, activityLevel: true,
        fitnessLevel: true, goal: true,
        createdAt: true,
      },
    });

    if (!user) return next(createError("User not found", 404));
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
