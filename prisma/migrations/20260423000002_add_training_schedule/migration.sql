-- AddColumn trainingDaysPerWeek and trainingHoursPerDay to User
ALTER TABLE "User" ADD COLUMN "trainingDaysPerWeek" INTEGER;
ALTER TABLE "User" ADD COLUMN "trainingHoursPerDay" REAL;
