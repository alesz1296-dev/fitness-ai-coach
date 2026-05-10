ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "coachVisibility" TEXT NOT NULL DEFAULT '{"workouts":true,"nutrition":true,"weight":true,"goals":true,"mealPlans":true,"calendar":true}';
