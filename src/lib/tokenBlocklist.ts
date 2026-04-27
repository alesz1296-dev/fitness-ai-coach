/**
 * Refresh token blocklist.
 *
 * Uses Redis when REDIS_URL is set (survives restarts, works across multiple
 * server instances). Falls back to an in-memory Map otherwise (dev / no-Redis).
 */
import redisClient from "./redis.js";

// ── Redis implementation ──────────────────────────────────────────────────────

async function blockTokenRedis(jti: string, ttlMs: number): Promise<void> {
  const ttlSec = Math.ceil(ttlMs / 1000);
  await redisClient!.set(`blocklist:${jti}`, "1", "EX", ttlSec);
}

async function isBlockedRedis(jti: string): Promise<boolean> {
  const val = await redisClient!.get(`blocklist:${jti}`);
  return val !== null;
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface BlockedEntry {
  expiresAt: number;
}

const memBlocklist = new Map<string, BlockedEntry>();

function blockTokenMem(jti: string, ttlMs: number): void {
  memBlocklist.set(jti, { expiresAt: Date.now() + ttlMs });
}

function isBlockedMem(jti: string): boolean {
  const entry = memBlocklist.get(jti);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    memBlocklist.delete(jti);
    return false;
  }
  return true;
}

// Periodic cleanup for in-memory store
setInterval(() => {
  const now = Date.now();
  for (const [jti, entry] of memBlocklist.entries()) {
    if (now > entry.expiresAt) memBlocklist.delete(jti);
  }
}, 10 * 60 * 1000).unref();

// ── Public API ────────────────────────────────────────────────────────────────

/** Add a JTI to the blocklist. ttlMs should match the token's remaining lifetime. */
export async function blockToken(jti: string, ttlMs: number): Promise<void> {
  if (redisClient) return blockTokenRedis(jti, ttlMs);
  blockTokenMem(jti, ttlMs);
}

/** Returns true if the JTI has been revoked. */
export async function isBlocked(jti: string): Promise<boolean> {
  if (redisClient) return isBlockedRedis(jti);
  return isBlockedMem(jti);
}
