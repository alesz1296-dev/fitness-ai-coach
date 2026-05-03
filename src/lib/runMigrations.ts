/**
 * Lightweight startup migration guard for PostgreSQL.
 *
 * Runs before the HTTP server starts and ensures every table/column/index
 * that was added after the initial schema is present in the live database.
 *
 * Uses information_schema and pg_indexes (PostgreSQL system catalog).
 * Safe to run on every boot -- all checks are existence-gated.
 */
import prisma from "./prisma.js";
import logger from "./logger.js";

// Helpers

async function getColumns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    table
  );
  return new Set(rows.map((r) => r.column_name));
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    table
  );
  return rows.length > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = $1`,
    indexName
  );
  return rows.length > 0;
}

// Table migrations

const TABLE_MIGRATIONS: Array<{ table: string; sql: string }> = [
  {
    table: "WaterLog",
    sql: `CREATE TABLE IF NOT EXISTS "WaterLog" (
      "id"        SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL,
      "amount"    DOUBLE PRECISION NOT NULL,
      "date"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  },
  {
    table: "MealPlan",
    sql: `CREATE TABLE IF NOT EXISTS "MealPlan" (
      "id"        SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL,
      "name"      TEXT NOT NULL,
      "weekStart" TEXT NOT NULL,
      "durationWeeks" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  },
  {
    table: "MealPlanDay",
    sql: `CREATE TABLE IF NOT EXISTS "MealPlanDay" (
      "id"        SERIAL PRIMARY KEY,
      "planId"    INTEGER NOT NULL,
      "dayIndex"  INTEGER NOT NULL,
      "notes"     TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE CASCADE,
      UNIQUE("planId", "dayIndex")
    )`,
  },
  {
    table: "WorkoutCalendarDay",
    sql: `CREATE TABLE IF NOT EXISTS "WorkoutCalendarDay" (
      "id"           SERIAL PRIMARY KEY,
      "userId"       INTEGER NOT NULL,
      "date"         TEXT NOT NULL,
      "workoutName"  TEXT,
      "muscleGroups" TEXT,
      "templateId"   INTEGER,
      "isRestDay"    BOOLEAN NOT NULL DEFAULT FALSE,
      "notes"        TEXT,
      "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      UNIQUE("userId", "date")
    )`,
  },
  {
    table: "FoodItem",
    sql: `CREATE TABLE IF NOT EXISTS "FoodItem" (
      "id"          TEXT PRIMARY KEY,
      "name"        TEXT NOT NULL,
      "calories"    DOUBLE PRECISION NOT NULL,
      "protein"     DOUBLE PRECISION NOT NULL,
      "carbs"       DOUBLE PRECISION NOT NULL,
      "fats"        DOUBLE PRECISION NOT NULL,
      "defaultQty"  DOUBLE PRECISION NOT NULL,
      "defaultUnit" TEXT NOT NULL,
      "tags"        TEXT NOT NULL DEFAULT '[]',
      "aliases"     TEXT NOT NULL DEFAULT '[]',
      "localizedNames" TEXT NOT NULL DEFAULT '{}'
    )`,
  },
  {
    table: "ExerciseItem",
    sql: `CREATE TABLE IF NOT EXISTS "ExerciseItem" (
      "id"               TEXT PRIMARY KEY,
      "name"             TEXT NOT NULL,
      "primaryMuscle"    TEXT NOT NULL,
      "secondaryMuscles" TEXT NOT NULL DEFAULT '[]',
      "equipment"        TEXT NOT NULL,
      "difficulty"       TEXT NOT NULL,
      "instructions"     TEXT NOT NULL
    )`,
  },
  {
    table: "CustomFood",
    sql: `CREATE TABLE IF NOT EXISTS "CustomFood" (
      "id"          SERIAL PRIMARY KEY,
      "userId"      INTEGER NOT NULL,
      "name"        TEXT NOT NULL,
      "calories"    DOUBLE PRECISION NOT NULL,
      "protein"     DOUBLE PRECISION NOT NULL DEFAULT 0,
      "carbs"       DOUBLE PRECISION NOT NULL DEFAULT 0,
      "fats"        DOUBLE PRECISION NOT NULL DEFAULT 0,
      "defaultQty"  DOUBLE PRECISION NOT NULL DEFAULT 100,
      "defaultUnit" TEXT NOT NULL DEFAULT 'g',
      "tags"        TEXT NOT NULL DEFAULT '[]',
      "basedOnId"   TEXT,
      "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  },
  {
    table: "MealPlanEntry",
    sql: `CREATE TABLE IF NOT EXISTS "MealPlanEntry" (
      "id"        SERIAL PRIMARY KEY,
      "dayId"     INTEGER NOT NULL,
      "meal"      TEXT NOT NULL,
      "foodName"  TEXT NOT NULL,
      "calories"  DOUBLE PRECISION NOT NULL,
      "protein"   DOUBLE PRECISION NOT NULL DEFAULT 0,
      "carbs"     DOUBLE PRECISION NOT NULL DEFAULT 0,
      "fats"      DOUBLE PRECISION NOT NULL DEFAULT 0,
      "quantity"  DOUBLE PRECISION NOT NULL DEFAULT 1,
      "unit"      TEXT NOT NULL DEFAULT 'serving',
      "order"     INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY ("dayId") REFERENCES "MealPlanDay"("id") ON DELETE CASCADE
    )`,
  },
];

// Column migrations

const MIGRATIONS: Array<{ table: string; column: string; sql: string }> = [
  { table: "Conversation", column: "metadata",
    sql: `ALTER TABLE "Conversation" ADD COLUMN "metadata" TEXT` },
  { table: "User", column: "profileComplete",
    sql: `ALTER TABLE "User" ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT FALSE` },
  { table: "User", column: "proteinMultiplier",
    sql: `ALTER TABLE "User" ADD COLUMN "proteinMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0` },
  { table: "User", column: "trainingDaysPerWeek",
    sql: `ALTER TABLE "User" ADD COLUMN "trainingDaysPerWeek" INTEGER` },
  { table: "User", column: "trainingHoursPerDay",
    sql: `ALTER TABLE "User" ADD COLUMN "trainingHoursPerDay" DOUBLE PRECISION` },
  { table: "User", column: "injuries",
    sql: `ALTER TABLE "User" ADD COLUMN "injuries" TEXT` },
  { table: "User", column: "periodStart",
    sql: `ALTER TABLE "User" ADD COLUMN "periodStart" TEXT` },
  { table: "User", column: "cycleLength",
    sql: `ALTER TABLE "User" ADD COLUMN "cycleLength" INTEGER` },
  { table: "User", column: "waterTargetMl",
    sql: `ALTER TABLE "User" ADD COLUMN "waterTargetMl" DOUBLE PRECISION NOT NULL DEFAULT 2000` },
  { table: "User", column: "emailVerified",
    sql: `ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE` },
  { table: "FoodLog", column: "isCheatMeal",
    sql: `ALTER TABLE "FoodLog" ADD COLUMN "isCheatMeal" BOOLEAN NOT NULL DEFAULT FALSE` },
  { table: "FoodItem", column: "aliases",
    sql: `ALTER TABLE "FoodItem" ADD COLUMN "aliases" TEXT NOT NULL DEFAULT '[]'` },
  { table: "FoodItem", column: "localizedNames",
    sql: `ALTER TABLE "FoodItem" ADD COLUMN "localizedNames" TEXT NOT NULL DEFAULT '{}'` },
  { table: "MealPlan", column: "durationWeeks",
    sql: `ALTER TABLE "MealPlan" ADD COLUMN "durationWeeks" INTEGER NOT NULL DEFAULT 1` },
  { table: "Workout", column: "trainingType",
    sql: `ALTER TABLE "Workout" ADD COLUMN "trainingType" TEXT` },
  { table: "CalorieGoal", column: "macrosCycling",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "macrosCycling" BOOLEAN NOT NULL DEFAULT FALSE` },
  { table: "CalorieGoal", column: "trainDayCalories",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayCalories" DOUBLE PRECISION` },
  { table: "CalorieGoal", column: "trainDayProtein",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayProtein" DOUBLE PRECISION` },
  { table: "CalorieGoal", column: "trainDayCarbs",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayCarbs" DOUBLE PRECISION` },
  { table: "CalorieGoal", column: "trainDayFats",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayFats" DOUBLE PRECISION` },
  { table: "CalorieGoal", column: "restDayCalories",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayCalories" DOUBLE PRECISION` },
  { table: "CalorieGoal", column: "restDayProtein",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayProtein" DOUBLE PRECISION` },
  { table: "CalorieGoal", column: "restDayCarbs",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayCarbs" DOUBLE PRECISION` },
  { table: "CalorieGoal", column: "restDayFats",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayFats" DOUBLE PRECISION` },
];

// Index migrations

const INDEX_MIGRATIONS: Array<{ name: string; sql: string }> = [
  { name: "idx_waterlog_userid_date",
    sql: `CREATE INDEX IF NOT EXISTS "idx_waterlog_userid_date" ON "WaterLog" ("userId", "date")` },
  { name: "idx_foodlog_userid_date",
    sql: `CREATE INDEX IF NOT EXISTS "idx_foodlog_userid_date" ON "FoodLog" ("userId", "date")` },
  { name: "idx_workout_userid_date",
    sql: `CREATE INDEX IF NOT EXISTS "idx_workout_userid_date" ON "Workout" ("userId", "date")` },
  { name: "idx_conversation_userid",
    sql: `CREATE INDEX IF NOT EXISTS "idx_conversation_userid" ON "Conversation" ("userId")` },
  { name: "idx_mealplan_userid_weekstart",
    sql: `CREATE INDEX IF NOT EXISTS "idx_mealplan_userid_weekstart" ON "MealPlan" ("userId", "weekStart")` },
  { name: "idx_workoutcalendar_userid",
    sql: `CREATE INDEX IF NOT EXISTS "idx_workoutcalendar_userid" ON "WorkoutCalendarDay" ("userId")` },
  { name: "idx_customfood_userid",
    sql: `CREATE INDEX IF NOT EXISTS "idx_customfood_userid" ON "CustomFood" ("userId")` },
  { name: "idx_customfood_name",
    sql: `CREATE INDEX IF NOT EXISTS "idx_customfood_name" ON "CustomFood" ("name")` },
  { name: "idx_fooditem_name",
    sql: `CREATE INDEX IF NOT EXISTS "idx_fooditem_name" ON "FoodItem" ("name")` },
  { name: "idx_exerciseitem_name",
    sql: `CREATE INDEX IF NOT EXISTS "idx_exerciseitem_name" ON "ExerciseItem" ("name")` },
  { name: "idx_exerciseitem_primarymuscle",
    sql: `CREATE INDEX IF NOT EXISTS "idx_exerciseitem_primarymuscle" ON "ExerciseItem" ("primaryMuscle")` },
  { name: "idx_exerciseitem_equipment",
    sql: `CREATE INDEX IF NOT EXISTS "idx_exerciseitem_equipment" ON "ExerciseItem" ("equipment")` },
];

// Runner

export async function runMigrations(): Promise<void> {
  let applied = 0;

  // 1. Create new tables that do not exist yet
  for (const { table, sql } of TABLE_MIGRATIONS) {
    const exists = await tableExists(table);
    if (!exists) {
      await prisma.$executeRawUnsafe(sql);
      logger.info(`[migration] Created table ${table}`);
      applied++;
    }
  }

  // 2. Add missing columns to existing tables
  const cache: Record<string, Set<string>> = {};
  for (const { table, column, sql } of MIGRATIONS) {
    if (!cache[table]) cache[table] = await getColumns(table);
    if (cache[table].has(column)) continue;
    await prisma.$executeRawUnsafe(sql);
    cache[table].add(column);
    logger.info(`[migration] Added ${table}.${column}`);
    applied++;
  }

  // 3. Create performance indexes if they do not exist
  for (const { name, sql } of INDEX_MIGRATIONS) {
    const exists = await indexExists(name);
    if (!exists) {
      try {
        await prisma.$executeRawUnsafe(sql);
        logger.info(`[migration] Created index ${name}`);
        applied++;
      } catch {
        logger.warn(`[migration] Skipped index ${name} (table may not exist yet)`);
      }
    }
  }

  if (applied > 0) logger.info(`[migration] Applied ${applied} migration(s)`);
}
