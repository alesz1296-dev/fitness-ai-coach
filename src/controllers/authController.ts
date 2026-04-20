import { Request, Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    if (!email || !username || !password) {
      return next(createError("Email, username, and password are required", 400));
    }

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

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    } as jwt.SignOptions);

    logger.info(`New user registered: ${username} (${email})`);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError("Email and password are required", 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return next(createError("Invalid credentials", 401));
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);

    if (!passwordMatch) {
      return next(createError("Invalid credentials", 401));
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    } as jwt.SignOptions);

    logger.info(`User logged in: ${user.username}`);

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (error) {
    next(error);
  }
};
