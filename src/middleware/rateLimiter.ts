import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../lib/redis.js";

/**
 * Rate limiters.
 *
 * When REDIS_URL is set the counters are stored in Redis (shared across
 * multiple server instances, survives restarts). Otherwise falls back to
 * express-rate-limit's built-in memory store.
 *
 * Override limits via env vars:
 *   RATE_LIMIT_MAX        — general (default 5000 dev / 100 prod)
 *   CHAT_RATE_LIMIT_MAX   — chat    (default 500  dev / 30  prod)
 *   AUTH_RATE_LIMIT_MAX   — auth    (default 200  dev / 10  prod)
 *   REPORT_RATE_LIMIT_MAX — reports (default 100  dev / 5   prod)
 */
const IS_DEV = process.env.NODE_ENV !== "production";
const WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

const GENERAL_MAX = Number(process.env.RATE_LIMIT_MAX ?? (IS_DEV ? 5000 : 100));
const CHAT_MAX = Number(process.env.CHAT_RATE_LIMIT_MAX ?? (IS_DEV ? 500 : 30));
const AUTH_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX ?? (IS_DEV ? 200 : 10));
const REPORT_MAX = Number(
  process.env.REPORT_RATE_LIMIT_MAX ?? (IS_DEV ? 100 : 5),
);

/** Build an optional RedisStore. Returns undefined when Redis is not configured. */
function makeRedisStore(prefix: string): RedisStore | undefined {
  if (!redisClient) return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (...args: string[]) =>
      (redisClient as any).call(...args) as Promise<number>,
  });
}

export const generalLimiter = rateLimit({
  windowMs: WINDOW,
  max: GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore("general"),
  message: { error: "Too many requests, please try again later" },
});

export const authLimiter = rateLimit({
  windowMs: WINDOW,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore("auth"),
  message: { error: "Too many login attempts, please try again in 15 minutes" },
});

export const chatLimiter = rateLimit({
  windowMs: WINDOW,
  max: CHAT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore("chat"),
  message: { error: "AI chat rate limit reached, please try again shortly" },
});

export const reportLimiter = rateLimit({
  windowMs: IS_DEV ? WINDOW : 60 * 60 * 1000,
  max: REPORT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore("report"),
  message: {
    error: "Report generation rate limit reached, please try again later",
  },
});
