import { Request, Response, NextFunction } from "express";

const TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Request timeout middleware.
 * Sends a 503 JSON response if the handler doesn't respond within TIMEOUT_MS.
 * Uses res.headersSent to avoid writing headers twice if the response
 * has already been partially sent.
 */
export const requestTimeout = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        error: "Request timeout — the server took too long to respond.",
        code: "REQUEST_TIMEOUT",
      });
    }
  }, TIMEOUT_MS);

  // Clear the timer as soon as the response is finished (success or error)
  res.on("finish", () => clearTimeout(timer));
  res.on("close",  () => clearTimeout(timer));

  next();
};
