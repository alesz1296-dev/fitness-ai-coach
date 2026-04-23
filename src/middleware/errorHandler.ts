import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger.js";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== "production";

  // Always log the full error server-side, including stack in dev
  if (isDev) {
    logger.error(
      `[${err.name ?? "Error"}] ${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`,
      { code: (err as any).code, stack: err.stack }
    );
  } else {
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`);
  }

  // For operational errors (createError) pass the message through as-is.
  // For unexpected errors, map to a human-readable message by error type.
  let message: string;
  if (err.isOperational) {
    message = err.message;
  } else if ((err as any).code === "P2002") {
    // Prisma unique constraint violation
    message = "A record with that value already exists.";
  } else if ((err as any).code === "P2025") {
    // Prisma record not found
    message = "Record not found.";
  } else if ((err as any).code?.startsWith?.("P2")) {
    // Other Prisma known request errors
    message = "Database error — please try again.";
  } else if (err.name === "PrismaClientValidationError") {
    // Bad argument passed to Prisma (e.g. unknown field, wrong type)
    message = "Invalid data — please check your input and try again.";
  } else if (err.name === "PrismaClientInitializationError") {
    message = "Database connection failed — please try again later.";
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    message = "Session expired — please log in again.";
  } else if (err.name === "SyntaxError") {
    message = "Invalid request format.";
  } else {
    message = "Something went wrong. Please try again.";
  }

  res.status(statusCode).json({
    error: message,
    // In development, always expose the real error detail so it shows up
    // in browser devtools / Axios error response without needing server logs
    ...(isDev && {
      detail: err.message,
      errorName: err.name,
      ...(((err as any).code) && { prismaCode: (err as any).code }),
      stack: err.stack?.split("\n").slice(0, 6).join("\n"),
    }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  // API routes → JSON 404
  if (req.originalUrl.startsWith("/api/")) {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
    return;
  }
  // Non-API routes (browser navigation hitting backend directly) → helpful HTML
  res.status(404).send(`
    <html><body style="font-family:sans-serif;padding:2rem;max-width:500px;margin:auto">
      <h2>Wrong port 🙂</h2>
      <p>The backend API is running here on port <strong>3000</strong>.</p>
      <p>Open the frontend at: <a href="http://localhost:5173">http://localhost:5173</a></p>
    </body></html>
  `);
};

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
