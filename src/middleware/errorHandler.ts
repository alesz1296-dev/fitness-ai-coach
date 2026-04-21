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
  const message = err.isOperational ? err.message : "Internal server error";

  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`, err);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
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
