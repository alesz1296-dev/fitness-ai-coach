/**
 * Optional Redis client.
 *
 * If REDIS_URL is set the app connects to Redis and uses it for the token
 * blocklist and rate-limiter store. If the variable is absent (e.g. local
 * dev without Docker) both features fall back to their in-memory defaults —
 * the app still works, just loses persistence across restarts.
 */
import { Redis } from "ioredis";

let client: Redis | null = null;

if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableReadyCheck: true,
  });

  client.on("connect", () => console.info("[redis] connected"));
  client.on("error", (err: Error) =>
    console.error("[redis] error:", err.message),
  );
}

export default client;
