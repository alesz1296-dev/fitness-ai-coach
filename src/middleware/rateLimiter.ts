import rateLimit from "express-rate-limit";

/**
 * In development mode all limits are raised massively so testing never
 * hits the wall. Override any limit via environment variables:
 *
 *   RATE_LIMIT_MAX          — general limiter max (default 5000 dev / 100 prod)
 *   RATE_LIMIT_WINDOW_MS    — window in ms (default 900000 = 15 min)
 *   CHAT_RATE_LIMIT_MAX     — chat limiter max (default 500 dev / 30 prod)
 *   AUTH_RATE_LIMIT_MAX     — auth limiter max (default 200 dev / 10 prod)
 *   REPORT_RATE_LIMIT_MAX   — report limiter max (default 100 dev / 5 prod)
 */
const IS_DEV = process.env.NODE_ENV !== "production";
const WINDOW  = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

const GENERAL_MAX = Number(process.env.RATE_LIMIT_MAX       ?? (IS_DEV ? 5000 : 100));
const CHAT_MAX    = Number(process.env.CHAT_RATE_LIMIT_MAX   ?? (IS_DEV ?  500 :  30));
const AUTH_MAX    = Number(process.env.AUTH_RATE_LIMIT_MAX   ?? (IS_DEV ?  200 :  10));
const REPORT_MAX  = Number(process.env.REPORT_RATE_LIMIT_MAX ?? (IS_DEV ?  100 :   5));

/**
 * General API rate limiter.
 * Dev default: 5 000 req / 15 min · Prod default: 100 req / 15 min.
 */
export const generalLimiter = rateLimit({
  windowMs: WINDOW,
  max: GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

/**
 * Auth rate limiter — prevents brute-force login attacks.
 * Dev default: 200 / 15 min · Prod default: 10 / 15 min.
 */
export const authLimiter = rateLimit({
  windowMs: WINDOW,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again in 15 minutes" },
});

/**
 * AI chat rate limiter — prevents OpenAI API cost overruns.
 * Dev default: 500 / 15 min · Prod default: 30 / 15 min.
 */
export const chatLimiter = rateLimit({
  windowMs: WINDOW,
  max: CHAT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI chat rate limit reached, please try again shortly" },
});

/**
 * Report generation rate limiter — expensive computation + AI call.
 * Dev default: 100 / hour · Prod default: 5 / hour.
 */
export const reportLimiter = rateLimit({
  windowMs: IS_DEV ? WINDOW : 60 * 60 * 1000,
  max: REPORT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Report generation rate limit reached, please try again later" },
});
