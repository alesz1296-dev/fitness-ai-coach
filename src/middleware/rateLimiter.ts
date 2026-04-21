import rateLimit from "express-rate-limit";

/**
 * General API rate limiter — 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

/**
 * Auth rate limiter — 10 attempts per 15 minutes per IP.
 * Prevents brute-force login attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again in 15 minutes" },
});

/**
 * AI chat rate limiter — 30 requests per 15 minutes per IP.
 * Prevents OpenAI API cost overruns.
 */
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI chat rate limit reached, please try again shortly" },
});

/**
 * Report generation rate limiter — 5 per hour per IP.
 * Expensive computation + AI call.
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Report generation rate limit reached, please try again later" },
});
