/**
 * prisma/seed.ts
 *
 * Seeds FoodItem and ExerciseItem tables from the static in-memory arrays.
 * Safe to run multiple times — uses upsert (update-or-create) so re-runs
 * won't duplicate rows or fail on existing data.
 *
 * Usage:
 *   npx tsx prisma/seed.ts
 *   # or via package.json script:
 *   npm run prisma:seed
 */

import { PrismaClient } from "@prisma/client";
import { FOOD_DB }     from "../src/data/foods.js";
import { EXERCISE_DB } from "../src/data/exercises.js";

const prisma = new PrismaClient();

async function seedFoods(): Promise<number> {
  let upserted = 0;
  for (const f of FOOD_DB) {
    await prisma.foodItem.upsert({
      where:  { id: f.id },
      update: {
        name:        f.name,
        calories:    f.calories,
        protein:     f.protein,
        carbs:       f.carbs,
        fats:        f.fats,
        defaultQty:  f.defaultQty,
        defaultUnit: f.defaultUnit,
        tags:        JSON.stringify(f.tags ?? []),
      },
      create: {
        id:          f.id,
        name:        f.name,
        calories:    f.calories,
        protein:     f.protein,
        carbs:       f.carbs,
        fats:        f.fats,
        defaultQty:  f.defaultQty,
        defaultUnit: f.defaultUnit,
        tags:        JSON.stringify(f.tags ?? []),
      },
    });
    upserted++;
  }
  return upserted;
}

async function seedExercises(): Promise<number> {
  let upserted = 0;
  for (const e of EXERCISE_DB) {
    await prisma.exerciseItem.upsert({
      where:  { id: e.id },
      update: {
        name:             e.name,
        primaryMuscle:    e.primaryMuscle,
        secondaryMuscles: JSON.stringify(e.secondaryMuscles ?? []),
        equipment:        e.equipment,
        difficulty:       e.difficulty,
        instructions:     e.instructions,
      },
      create: {
        id:               e.id,
        name:             e.name,
        primaryMuscle:    e.primaryMuscle,
        secondaryMuscles: JSON.stringify(e.secondaryMuscles ?? []),
        equipment:        e.equipment,
        difficulty:       e.difficulty,
        instructions:     e.instructions,
      },
    });
    upserted++;
  }
  return upserted;
}

async function main() {
  console.log("🌱  Starting seed...");

  const foods     = await seedFoods();
  console.log(`✅  FoodItem:     ${foods} rows upserted`);

  const exercises = await seedExercises();
  console.log(`✅  ExerciseItem: ${exercises} rows upserted`);

  console.log("🎉  Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
