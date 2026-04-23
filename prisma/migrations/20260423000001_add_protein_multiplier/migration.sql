-- AlterTable: add proteinMultiplier to User
ALTER TABLE "User" ADD COLUMN "proteinMultiplier" REAL NOT NULL DEFAULT 2.0;
