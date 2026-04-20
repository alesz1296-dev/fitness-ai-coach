import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../lib/logger.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret-key";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Invalid token attempt: ${error}`);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
