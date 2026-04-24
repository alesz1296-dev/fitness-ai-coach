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

async function getColumns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<PragmaRow[]>(
    `PRAGMA table_info("${table}")`
  );
  return new Set(rows.map((r) => r.name));
}

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
];

export async function runMigrations(): Promise<void> {
  let applied = 0;

  // Cache column sets per table to avoid redundant PRAGMA calls
  const cache: Record<string, Set<string>> = {};

  for (const { table, column, sql } of MIGRATIONS) {
    if (!cache[table]) {
      cache[table] = await getColumns(table);
    }

    if (cache[table].has(column)) continue;

    await prisma.$executeRawUnsafe(sql);
    cache[table].add(column); // keep cache fresh for subsequent entries
    logger.info(`[migration] Added ${table}.${column}`);
    applied++;
  }

  if (applied > 0) {
    logger.info(`[migration] Applied ${applied} missing column(s)`);
  }
}
