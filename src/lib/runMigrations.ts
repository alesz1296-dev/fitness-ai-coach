/**
 * Lightweight startup migration guard.
 *
 * Runs before the HTTP server starts and ensures every column that was added
 * after the initial prisma migrate dev is present in the live database.
 * Uses Prisma's $queryRawUnsafe so it always targets the same DB file that
 * the rest of the app uses (whatever DATABASE_URL resolves to at runtime).
 *
 * Safe to run on every boot — checks column existence before ALTER TABLE.
 */
import prisma from "./prisma.js";
import logger from "./logger.js";

interface PragmaRow { name: string }
interface TableRow  { name: string }

async function getColumns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<PragmaRow[]>(
    `PRAGMA table_info("${table}")`
  );
  return new Set(rows.map((r) => r.name));
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<TableRow[]>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
  );
  return rows.length > 0;
}

// New tables to create if they don't exist yet
const TABLE_MIGRATIONS: Array<{ table: string; sql: string }> = [
  {
    table: "WaterLog",
    sql: `CREATE TABLE IF NOT EXISTS "WaterLog" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "userId"    INTEGER NOT NULL,
      "amount"    REAL    NOT NULL,
      "date"      TEXT    NOT NULL DEFAULT (datetime('now')),
      "createdAt" TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  },
  {
    table: "MealPlan",
    sql: `CREATE TABLE IF NOT EXISTS "MealPlan" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "userId"    INTEGER NOT NULL,
      "name"      TEXT    NOT NULL,
      "weekStart" TEXT    NOT NULL,
      "createdAt" TEXT    NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  },
  {
    table: "MealPlanDay",
    sql: `CREATE TABLE IF NOT EXISTS "MealPlanDay" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "planId"    INTEGER NOT NULL,
      "dayIndex"  INTEGER NOT NULL,
      "notes"     TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE CASCADE,
      UNIQUE("planId", "dayIndex")
    )`,
  },
  {
    table: "WorkoutCalendarDay",
    sql: `CREATE TABLE IF NOT EXISTS "WorkoutCalendarDay" (
      "id"           INTEGER PRIMARY KEY AUTOINCREMENT,
      "userId"       INTEGER NOT NULL,
      "date"         TEXT    NOT NULL,
      "workoutName"  TEXT,
      "muscleGroups" TEXT,
      "templateId"   INTEGER,
      "isRestDay"    INTEGER NOT NULL DEFAULT 0,
      "notes"        TEXT,
      "createdAt"    TEXT    NOT NULL DEFAULT (datetime('now')),
      "updatedAt"    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      UNIQUE("userId", "date")
    )`,
  },
  {
    table: "MealPlanEntry",
    sql: `CREATE TABLE IF NOT EXISTS "MealPlanEntry" (
      "id"        INTEGER PRIMARY KEY AUTOINCREMENT,
      "dayId"     INTEGER NOT NULL,
      "meal"      TEXT    NOT NULL,
      "foodName"  TEXT    NOT NULL,
      "calories"  REAL    NOT NULL,
      "protein"   REAL    NOT NULL DEFAULT 0,
      "carbs"     REAL    NOT NULL DEFAULT 0,
      "fats"      REAL    NOT NULL DEFAULT 0,
      "quantity"  REAL    NOT NULL DEFAULT 1,
      "unit"      TEXT    NOT NULL DEFAULT 'serving',
      "order"     INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY ("dayId") REFERENCES "MealPlanDay"("id") ON DELETE CASCADE
    )`,
  },
];

const MIGRATIONS: Array<{ table: string; column: string; sql: string }> = [
  {
    table: "Conversation",
    column: "metadata",
    sql: `ALTER TABLE "Conversation" ADD COLUMN "metadata" TEXT`,
  },
  {
    table: "User",
    column: "profileComplete",
    sql: `ALTER TABLE "User" ADD COLUMN "profileComplete" INTEGER NOT NULL DEFAULT 0`,
  },
  {
    table: "User",
    column: "proteinMultiplier",
    sql: `ALTER TABLE "User" ADD COLUMN "proteinMultiplier" REAL NOT NULL DEFAULT 2.0`,
  },
  {
    table: "User",
    column: "trainingDaysPerWeek",
    sql: `ALTER TABLE "User" ADD COLUMN "trainingDaysPerWeek" INTEGER`,
  },
  {
    table: "User",
    column: "trainingHoursPerDay",
    sql: `ALTER TABLE "User" ADD COLUMN "trainingHoursPerDay" REAL`,
  },
  {
    table: "User",
    column: "injuries",
    sql: `ALTER TABLE "User" ADD COLUMN "injuries" TEXT`,
  },
  {
    table: "User",
    column: "periodStart",
    sql: `ALTER TABLE "User" ADD COLUMN "periodStart" TEXT`,
  },
  {
    table: "User",
    column: "cycleLength",
    sql: `ALTER TABLE "User" ADD COLUMN "cycleLength" INTEGER`,
  },
  {
    table: "User",
    column: "waterTargetMl",
    sql: `ALTER TABLE "User" ADD COLUMN "waterTargetMl" REAL NOT NULL DEFAULT 2000`,
  },
  {
    table: "FoodLog",
    column: "isCheatMeal",
    sql: `ALTER TABLE "FoodLog" ADD COLUMN "isCheatMeal" INTEGER NOT NULL DEFAULT 0`,
  },
  // Training type on Workout
  {
    table: "Workout",
    column: "trainingType",
    sql: `ALTER TABLE "Workout" ADD COLUMN "trainingType" TEXT`,
  },
  // Macro cycling columns on CalorieGoal
  {
    table: "CalorieGoal",
    column: "macrosCycling",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "macrosCycling" INTEGER NOT NULL DEFAULT 0`,
  },
  {
    table: "CalorieGoal",
    column: "trainDayCalories",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayCalories" REAL`,
  },
  {
    table: "CalorieGoal",
    column: "trainDayProtein",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayProtein" REAL`,
  },
  {
    table: "CalorieGoal",
    column: "trainDayCarbs",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayCarbs" REAL`,
  },
  {
    table: "CalorieGoal",
    column: "trainDayFats",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "trainDayFats" REAL`,
  },
  {
    table: "CalorieGoal",
    column: "restDayCalories",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayCalories" REAL`,
  },
  {
    table: "CalorieGoal",
    column: "restDayProtein",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayProtein" REAL`,
  },
  {
    table: "CalorieGoal",
    column: "restDayCarbs",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayCarbs" REAL`,
  },
  {
    table: "CalorieGoal",
    column: "restDayFats",
    sql: `ALTER TABLE "CalorieGoal" ADD COLUMN "restDayFats" REAL`,
  },
];

// Performance indexes for high-traffic query patterns
const INDEX_MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: "idx_waterlog_userid_date",
    sql: `CREATE INDEX IF NOT EXISTS "idx_waterlog_userid_date" ON "WaterLog" ("userId", "date")`,
  },
  {
    name: "idx_foodlog_userid_date",
    sql: `CREATE INDEX IF NOT EXISTS "idx_foodlog_userid_date" ON "FoodLog" ("userId", "date")`,
  },
  {
    name: "idx_workout_userid_date",
    sql: `CREATE INDEX IF NOT EXISTS "idx_workout_userid_date" ON "Workout" ("userId", "date")`,
  },
  {
    name: "idx_conversation_userid",
    sql: `CREATE INDEX IF NOT EXISTS "idx_conversation_userid" ON "Conversation" ("userId")`,
  },
  {
    name: "idx_mealplan_userid_weekstart",
    sql: `CREATE INDEX IF NOT EXISTS "idx_mealplan_userid_weekstart" ON "MealPlan" ("userId", "weekStart")`,
  },
  {
    name: "idx_workoutcalendar_userid",
    sql: `CREATE INDEX IF NOT EXISTS "idx_workoutcalendar_userid" ON "WorkoutCalendarDay" ("userId")`,
  },
];

async function indexExists(indexName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<TableRow[]>(
    `SELECT name FROM sqlite_master WHERE type='index' AND name='${indexName}'`
  );
  return rows.length > 0;
}

export async function runMigrations(): Promise<void> {
  let applied = 0;

  // 1. Create new tables that don't exist yet
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
    if (!cache[table]) {
      cache[table] = await getColumns(table);
    }

    if (cache[table].has(column)) continue;

    await prisma.$executeRawUnsafe(sql);
    cache[table].add(column);
    logger.info(`[migration] Added ${table}.${column}`);
    applied++;
  }

  // 3. Create performance indexes if they don't exist
  for (const { name, sql } of INDEX_MIGRATIONS) {
    const exists = await indexExists(name);
    if (!exists) {
      try {
        await prisma.$executeRawUnsafe(sql);
        logger.info(`[migration] Created index ${name}`);
        applied++;
      } catch (e) {
        // Index on a table that doesn't exist yet is fine — skip silently
        logger.warn(`[migration] Skipped index ${name} (table may not exist yet)`);
      }
    }
  }

  if (applied > 0) {
    logger.info(`[migration] Applied ${applied} migration(s)`);
  }
}
