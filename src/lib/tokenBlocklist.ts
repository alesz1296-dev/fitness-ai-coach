/**
 * In-memory refresh token blocklist.
 *
 * Stores the JTI (JWT ID) of revoked refresh tokens so they can't be reused
 * even within their 30-day validity window (e.g. after logout or token theft).
 *
 * Trade-off: the set is cleared on server restart. For production,
 * replace with Redis (SET jti EX <ttl>) to survive restarts.
 */

interface BlockedEntry {
  expiresAt: number; // epoch ms — allows periodic cleanup
}

const blocklist = new Map<string, BlockedEntry>();

/** Add a JTI to the blocklist. `ttlMs` should match the token's remaining lifetime. */
export function blockToken(jti: string, ttlMs: number): void {
  blocklist.set(jti, { expiresAt: Date.now() + ttlMs });
}

/** Returns true if the JTI has been revoked. */
export function isBlocked(jti: string): boolean {
  const entry = blocklist.get(jti);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    blocklist.delete(jti); // lazy cleanup
    return false;
  }
  return true;
}

// Periodic cleanup — remove expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jti, entry] of blocklist.entries()) {
    if (now > entry.expiresAt) blocklist.delete(jti);
  }
}, 10 * 60 * 1000).unref();
