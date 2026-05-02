import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV:             z.enum(["development", "production", "test"]).default("development"),
  PORT:                 z.coerce.number().default(3000),
  DATABASE_URL:         z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET:           z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRY:           z.string().default("15m"),
  REFRESH_SECRET:       z.string().min(32, "REFRESH_SECRET must be at least 32 characters"),
  REFRESH_EXPIRY_DAYS:  z.coerce.number().default(30),
  OPENAI_API_KEY:       z.string().optional(),
  DEEPSEEK_API_KEY:     z.string().optional(),
  // "openai" | "deepseek" -- defaults to "openai"
  AI_PROVIDER:          z.enum(["openai", "deepseek"]).default("openai"),
  REDIS_URL:            z.string().optional(),
  CLIENT_URL:           z.string().url().optional(),
  APP_NAME:             z.string().default("FitAI Coach"),
  APP_VERSION:          z.string().default("1.0.0"),
  POSTGRES_USER:        z.string().optional(),
  POSTGRES_PASSWORD:    z.string().optional(),
  POSTGRES_DB:          z.string().optional(),
  SEED_DB:              z.string().optional(),
  // Email / SMTP -- all optional; if SMTP_HOST is absent, emails log to stdout
  SMTP_HOST:    z.string().optional(),
  SMTP_PORT:    z.coerce.number().default(587),
  SMTP_SECURE:  z.string().default("false").transform((v) => v === "true"),
  SMTP_USER:    z.string().optional(),
  SMTP_PASS:    z.string().optional(),
  SMTP_FROM:    z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\u274c  Invalid environment variables \u2014 fix before starting:\n");
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
