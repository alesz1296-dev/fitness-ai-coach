import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";

// Load env first, before anything else
dotenv.config();

import logger from "./lib/logger.js";
import prisma from "./lib/prisma.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

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
import reportRoutes from "./routes/reports.js";

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request Logging ─────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "OK",
    app: process.env.APP_NAME || "FitAI Coach",
    version: process.env.APP_VERSION || "1.0.0",
    timestamp: new Date().toISOString(),
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
app.use("/api/reports", reportRoutes);

// ── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`✅ Database connected`);
  } catch (err) {
    logger.error("❌ Database connection failed", err);
  }
  logger.info(`🚀 ${process.env.APP_NAME || "FitAI Coach"} running on port ${PORT}`);
  logger.info(`📍 Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received — shutting down gracefully");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed");
    process.exit(0);
  });
});

export default app;
