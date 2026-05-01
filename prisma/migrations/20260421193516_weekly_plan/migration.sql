-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "age" INTEGER,
    "weight" REAL,
    "height" REAL,
    "sex" TEXT,
    "activityLevel" TEXT,
    "fitnessLevel" TEXT,
    "goal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "target" REAL NOT NULL,
    "current" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER NOT NULL,
    "caloriesBurned" REAL,
    "notes" TEXT,
    "templateId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
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
    "muscleGroups" TEXT NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE TABLE "FoodLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "foodName" TEXT NOT NULL,
    "calories" REAL NOT NULL,
    "protein" REAL,
    "carbs" REAL,
    "fats" REAL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "meal" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeightLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "weight" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeightLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalorieGoal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "currentWeight" REAL NOT NULL,
    "targetWeight" REAL NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "dailyCalories" REAL NOT NULL,
    "proteinGrams" REAL NOT NULL,
    "carbsGrams" REAL NOT NULL,
    "fatsGrams" REAL NOT NULL,
    "weeklyChange" REAL NOT NULL,
    "tdee" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "feasible" BOOLEAN NOT NULL DEFAULT true,
    "warning" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalorieGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT,
    "agentType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalWorkouts" INTEGER NOT NULL,
    "totalVolume" REAL NOT NULL DEFAULT 0,
    "avgCalories" REAL NOT NULL DEFAULT 0,
    "avgProtein" REAL NOT NULL DEFAULT 0,
    "weightStart" REAL,
    "weightEnd" REAL,
    "weightDelta" REAL,
    "prsHit" INTEGER NOT NULL DEFAULT 0,
    "goalProgress" REAL,
    "aiSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyPlanDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "planId" INTEGER NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Training',
    "targetCalories" REAL,
    "actualCalories" REAL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "workoutId" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Workout_userId_idx" ON "Workout"("userId");

-- CreateIndex
CREATE INDEX "Workout_date_idx" ON "Workout"("date");

-- CreateIndex
CREATE INDEX "WorkoutExercise_workoutId_idx" ON "WorkoutExercise"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutExercise_exerciseName_idx" ON "WorkoutExercise"("exerciseName");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_userId_idx" ON "WorkoutTemplate"("userId");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_isSystem_idx" ON "WorkoutTemplate"("isSystem");

-- CreateIndex
CREATE INDEX "TemplateExercise_templateId_idx" ON "TemplateExercise"("templateId");

-- CreateIndex
CREATE INDEX "FoodLog_userId_idx" ON "FoodLog"("userId");

-- CreateIndex
CREATE INDEX "FoodLog_date_idx" ON "FoodLog"("date");

-- CreateIndex
CREATE INDEX "WeightLog_userId_idx" ON "WeightLog"("userId");

-- CreateIndex
CREATE INDEX "WeightLog_date_idx" ON "WeightLog"("date");

-- CreateIndex
CREATE INDEX "CalorieGoal_userId_idx" ON "CalorieGoal"("userId");

-- CreateIndex
CREATE INDEX "CalorieGoal_active_idx" ON "CalorieGoal"("active");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Conversation_agentType_idx" ON "Conversation"("agentType");

-- CreateIndex
CREATE INDEX "MonthlyReport_userId_idx" ON "MonthlyReport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_userId_year_month_key" ON "MonthlyReport"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "WeeklyPlan_userId_idx" ON "WeeklyPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_userId_weekStart_key" ON "WeeklyPlan"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyPlanDay_planId_idx" ON "WeeklyPlanDay"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanDay_planId_dayIndex_key" ON "WeeklyPlanDay"("planId", "dayIndex");
