/**
 * Generic one-time token store (password reset + email verification).
 *
 * Uses Redis when REDIS_URL is set (survives restarts, works across instances).
 * Falls back to an in-memory Map otherwise (dev / no-Redis).
 *
 * Tokens are consumed on first use (get → null → deleted). This prevents
 * replay attacks even if the attacker intercepts the URL.
 */
import redisClient from "./redis.js";

const PREFIX = "token:";

// ── Redis implementation ──────────────────────────────────────────────────────

async function storeRedis(token: string, value: string, ttlSec: number): Promise<void> {
  await redisClient!.set(`${PREFIX}${token}`, value, "EX", ttlSec);
}

async function consumeRedis(token: string): Promise<string | null> {
  const key = `${PREFIX}${token}`;
  const val = await redisClient!.get(key);
  if (val !== null) await redisClient!.del(key);
  return val;
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface MemEntry { value: string; expiresAt: number }
const mem = new Map<string, MemEntry>();

function storeMem(token: string, value: string, ttlSec: number): void {
  mem.set(token, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

function consumeMem(token: string): string | null {
  const entry = mem.get(token);
  if (!entry) return null;
  mem.delete(token);
  if (Date.now() > entry.expiresAt) return null;
  return entry.value;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, e] of mem.entries()) {
    if (now > e.expiresAt) mem.delete(k);
  }
}, 10 * 60 * 1000).unref();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Store a one-time token mapped to a value (e.g. userId string).
 * ttlSec — how long the token is valid.
 */
export async function storeToken(token: string, value: string, ttlSec: number): Promise<void> {
  if (redisClient) return storeRedis(token, value, ttlSec);
  storeMem(token, value, ttlSec);
}

/**
 * Retrieve and immediately delete the token.
 * Returns the stored value, or null if token is expired / doesn't exist.
 */
export async function consumeToken(token: string): Promise<string | null> {
  if (redisClient) return consumeRedis(token);
  return consumeMem(token);
}
