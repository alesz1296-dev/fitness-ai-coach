/*
  Warnings:

  - Added the required column `updatedAt` to the `WorkoutExercise` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FoodLog" ADD COLUMN "meal" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "activityLevel" TEXT;
ALTER TABLE "User" ADD COLUMN "sex" TEXT;

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN "templateId" INTEGER;

-- CreateTable
CREATE TABLE "CalorieGoal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentWeight" REAL NOT NULL,
    "targetWeight" REAL NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "dailyCalories" REAL NOT NULL,
    "proteinGrams" REAL NOT NULL,
    "carbsGrams" REAL NOT NULL,
    "fatsGrams" REAL NOT NULL,
    "weeklyChange" REAL NOT NULL,
    "tdee" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalorieGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "splitType" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL,
    "dayLabel" TEXT NOT NULL,
    "muscleGroups" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateExercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "templateId" INTEGER NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "restSeconds" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateExercise_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "workoutsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalVolumeKg" REAL,
    "avgDailyCalories" REAL,
    "avgDailyProtein" REAL,
    "weightStart" REAL,
    "weightEnd" REAL,
    "weightChange" REAL,
    "prsHit" INTEGER NOT NULL DEFAULT 0,
    "goalProgress" REAL,
    "aiSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkoutExercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workoutId" INTEGER NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" REAL,
    "rpe" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutExercise_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutExercise" ("createdAt", "exerciseName", "id", "notes", "reps", "rpe", "sets", "weight", "workoutId") SELECT "createdAt", "exerciseName", "id", "notes", "reps", "rpe", "sets", "weight", "workoutId" FROM "WorkoutExercise";
DROP TABLE "WorkoutExercise";
ALTER TABLE "new_WorkoutExercise" RENAME TO "WorkoutExercise";
CREATE INDEX "WorkoutExercise_workoutId_idx" ON "WorkoutExercise"("workoutId");
CREATE INDEX "WorkoutExercise_exerciseName_idx" ON "WorkoutExercise"("exerciseName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CalorieGoal_userId_idx" ON "CalorieGoal"("userId");

-- CreateIndex
CREATE INDEX "CalorieGoal_active_idx" ON "CalorieGoal"("active");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_isSystem_idx" ON "WorkoutTemplate"("isSystem");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_splitType_idx" ON "WorkoutTemplate"("splitType");

-- CreateIndex
CREATE INDEX "TemplateExercise_templateId_idx" ON "TemplateExercise"("templateId");

-- CreateIndex
CREATE INDEX "MonthlyReport_userId_idx" ON "MonthlyReport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_userId_month_year_key" ON "MonthlyReport"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_agentType_idx" ON "Conversation"("agentType");

-- CreateIndex
CREATE INDEX "FoodLog_userId_idx" ON "FoodLog"("userId");

-- CreateIndex
CREATE INDEX "FoodLog_date_idx" ON "FoodLog"("date");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "WeightLog_userId_idx" ON "WeightLog"("userId");

-- CreateIndex
CREATE INDEX "WeightLog_date_idx" ON "WeightLog"("date");

-- CreateIndex
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");

-- CreateIndex
CREATE INDEX "Workout_date_idx" ON "Workout"("date");
