import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";

// Load env first, then validate — process.exit(1) on missing/invalid vars
dotenv.config();
import { env } from "./config/env.js";

import logger from "./lib/logger.js";
import prisma from "./lib/prisma.js";
import redisClient from "./lib/redis.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { requestTimeout } from "./middleware/timeout.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import goalRoutes from "./routes/goals.js";
import workoutRoutes from "./routes/workouts.js";
import foodRoutes from "./routes/foods.js";
import weightRoutes from "./routes/weight.js";
import chatRoutes from "./routes/chat.js";
import templateRoutes from "./routes/templates.js";
import calorieGoalRoutes from "./routes/calorieGoals.js";
import reportRoutes    from "./routes/reports.js";
import dashboardRoutes  from "./routes/dashboard.js";
import searchRoutes     from "./routes/search.js";
import weeklyPlanRoutes  from "./routes/weeklyPlan.js";
import predictionRoutes  from "./routes/predictions.js";
import waterRoutes       from "./routes/water.js";
import mealPlanRoutes    from "./routes/mealPlans.js";
import calendarRoutes    from "./routes/calendar.js";
import analyticsRoutes   from "./routes/analytics.js";
import { runMigrations } from "./lib/runMigrations.js";

const app: Express = express();
const PORT = env.PORT;

// ── CORS — explicit allowed origins, no wildcard fallback ───────────────────
const ALLOWED_ORIGINS = env.CLIENT_URL
  ? [env.CLIENT_URL]
  : ["http://localhost:5173", "http://localhost:4173"]; // dev only

// ── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.options("*", cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ── Rate limiting (general — 100 req/15 min per IP) ─────────────────────────
app.use("/api/", generalLimiter);

// ── Request timeout (30 s → 503) ────────────────────────────────────────────
app.use(requestTimeout);

// ── Request Logging ─────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// ── Health Check (deep — probes DB + Redis) ─────────────────────────────────
app.get("/api/health", async (_req: Request, res: Response) => {
  const TIMEOUT_MS = 2000;

  const withTimeout = <T>(promise: Promise<T>, label: string): Promise<{ ok: boolean; error?: string }> =>
    Promise.race([
      promise.then(() => ({ ok: true as const })),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: `${label} timed out after ${TIMEOUT_MS}ms` }), TIMEOUT_MS)
      ),
    ]).catch((err: Error) => ({ ok: false, error: err.message }));

  const [db, redis] = await Promise.all([
    withTimeout(prisma.$queryRaw`SELECT 1`, "postgres"),
    redisClient
      ? withTimeout(redisClient.ping().then(() => {}), "redis")
      : Promise.resolve({ ok: true as const, note: "not configured" }),
  ]);

  const healthy = db.ok && redis.ok;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "OK" : "DEGRADED",
    app: env.APP_NAME,
    version: env.APP_VERSION,
    timestamp: new Date().toISOString(),
    checks: { postgres: db, redis },
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/weight", weightRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/calorie-goals", calorieGoalRoutes);
app.use("/api/reports",    reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search",      searchRoutes);
app.use("/api/weekly-plan", weeklyPlanRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/water",       waterRoutes);
app.use("/api/meal-plans",  mealPlanRoutes);
app.use("/api/calendar",    calendarRoutes);
app.use("/api/analytics",   analyticsRoutes);

// ── Serve React frontend (production) ───────────────────────────────────────
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../client-dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`✅ Server running on http://localhost:${PORT}`);
    logger.info(`📍 Health: http://localhost:${PORT}/api/health`);
  } catch (err) {
    logger.error("Failed to connect to database on startup", err);
  }
  await runMigrations();
});

// Handle port already in use
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`❌ Port ${PORT} is already in use.`);
    logger.error(`   Run this to free it:  npx kill-port ${PORT}`);
    process.exit(1);
  } else {
    throw err;
  }
});

// ── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed");
    process.exit(0);
  });
  // Force-kill after 3 s if graceful close hangs (common on Windows)
  setTimeout(() => {
    logger.warn("Forced exit after timeout");
    process.exit(0);
  }, 3000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

export default app;
