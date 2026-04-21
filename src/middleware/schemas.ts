import { z } from "zod";

// ── Shared Primitives ─────────────────────────────────────────────────────────

const positiveInt = z.coerce.number().int().positive();
const positiveFloat = z.coerce.number().positive();
const optionalPositiveFloat = z.coerce.number().positive().optional();
const optionalPositiveInt = z.coerce.number().int().positive().optional();
const optionalString = z.string().trim().optional();
const dateString = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  firstName: optionalString,
  lastName: optionalString,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// ── User Profile ──────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: optionalString,
  lastName: optionalString,
  age: z.coerce.number().int().min(13, "Must be at least 13").max(120).optional(),
  weight: z.coerce.number().min(20, "Weight must be at least 20kg").max(500).optional(),
  height: z.coerce.number().min(50, "Height must be at least 50cm").max(300).optional(),
  sex: z.enum(["male", "female"]).optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  goal: z.string().trim().max(500).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

// ── Goals ─────────────────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  type: z.enum(["weight_loss", "weight_gain", "strength", "endurance", "custom"]),
  target: positiveFloat,
  unit: z.string().trim().min(1).max(50),
  endDate: dateString.optional(),
});

export const updateGoalSchema = z.object({
  type: z.enum(["weight_loss", "weight_gain", "strength", "endurance", "custom"]).optional(),
  target: positiveFloat.optional(),
  current: z.coerce.number().min(0).optional(),
  unit: z.string().trim().min(1).max(50).optional(),
  endDate: dateString.optional(),
  achieved: z.boolean().optional(),
});

// ── Workouts ──────────────────────────────────────────────────────────────────

const exerciseEntrySchema = z.object({
  exerciseName: z.string().trim().min(1, "Exercise name is required").max(200),
  sets: z.coerce.number().int().min(1, "At least 1 set").max(100),
  reps: z.coerce.number().int().min(1, "At least 1 rep").max(1000),
  weight: z.coerce.number().min(0).max(2000).optional(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  notes: optionalString,
  order: z.coerce.number().int().min(0).optional(),
});

export const createWorkoutSchema = z.object({
  name: z.string().trim().min(1, "Workout name is required").max(200),
  duration: z.coerce.number().int().min(1, "Duration must be at least 1 minute").max(600),
  caloriesBurned: z.coerce.number().min(0).max(10000).optional(),
  notes: optionalString,
  date: dateString.optional(),
  templateId: positiveInt.optional(),
  exercises: z.array(exerciseEntrySchema).optional().default([]),
});

export const updateWorkoutSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  duration: z.coerce.number().int().min(1).max(600).optional(),
  caloriesBurned: z.coerce.number().min(0).max(10000).optional(),
  notes: optionalString,
  date: dateString.optional(),
});

export const updateExerciseEntrySchema = z.object({
  sets: z.coerce.number().int().min(1).max(100).optional(),
  reps: z.coerce.number().int().min(1).max(1000).optional(),
  weight: z.coerce.number().min(0).max(2000).nullable().optional(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  notes: optionalString,
  order: z.coerce.number().int().min(0).optional(),
});

// ── Templates ─────────────────────────────────────────────────────────────────

const templateExerciseSchema = z.object({
  exerciseName: z.string().trim().min(1).max(200),
  sets: z.coerce.number().int().min(1).max(100),
  reps: z.string().trim().min(1).max(20), // allows ranges like "8-12"
  restSeconds: z.coerce.number().int().min(0).max(600).optional(),
  notes: optionalString,
  order: z.coerce.number().int().min(0).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(200),
  description: optionalString,
  splitType: z.enum(["PPL", "Upper_Lower", "Bro_Split", "Full_Body", "Custom"]),
  objective: z.enum(["hypertrophy", "strength", "fat_loss", "endurance", "general"]),
  frequency: z.coerce.number().int().min(1).max(7),
  dayLabel: z.string().trim().min(1).max(200),
  muscleGroups: z.array(z.string().trim().min(1)).optional().default([]),
  exercises: z.array(templateExerciseSchema).optional().default([]),
  aiGenerated: z.boolean().optional().default(false),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: optionalString,
  splitType: z.enum(["PPL", "Upper_Lower", "Bro_Split", "Full_Body", "Custom"]).optional(),
  objective: z.enum(["hypertrophy", "strength", "fat_loss", "endurance", "general"]).optional(),
  frequency: z.coerce.number().int().min(1).max(7).optional(),
  dayLabel: z.string().trim().min(1).max(200).optional(),
  muscleGroups: z.array(z.string().trim().min(1)).optional(),
});

export const addTemplateExerciseSchema = templateExerciseSchema;

export const createFromWorkoutSchema = z.object({
  name: z.string().trim().max(200).optional(),
  splitType: z.enum(["PPL", "Upper_Lower", "Bro_Split", "Full_Body", "Custom"]).optional().default("Custom"),
  objective: z.enum(["hypertrophy", "strength", "fat_loss", "endurance", "general"]).optional().default("general"),
  frequency: z.coerce.number().int().min(1).max(7).optional().default(3),
  dayLabel: z.string().trim().max(200).optional(),
  muscleGroups: z.array(z.string().trim().min(1)).optional().default([]),
});

// ── Food Logs ─────────────────────────────────────────────────────────────────

export const logFoodSchema = z.object({
  foodName: z.string().trim().min(1, "Food name is required").max(300),
  calories: z.coerce.number().min(0, "Calories cannot be negative").max(50000),
  protein: z.coerce.number().min(0).max(5000).optional(),
  carbs: z.coerce.number().min(0).max(5000).optional(),
  fats: z.coerce.number().min(0).max(5000).optional(),
  quantity: positiveFloat,
  unit: z.string().trim().min(1, "Unit is required").max(50),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  date: dateString.optional(),
});

// ── Weight Logs ───────────────────────────────────────────────────────────────

export const logWeightSchema = z.object({
  weight: z.coerce.number().min(20, "Weight must be at least 20kg").max(500),
  notes: optionalString,
  date: dateString.optional(),
});

// ── Calorie Goals ─────────────────────────────────────────────────────────────

export const createCalorieGoalSchema = z.object({
  name: z.string().trim().max(200).optional(),
  currentWeight: z.coerce.number().min(20).max(500),
  targetWeight: z.coerce.number().min(20).max(500),
  targetDate: dateString,
  notes: optionalString,
  aiGenerated: z.boolean().optional().default(false),
});

export const updateCalorieGoalSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  notes: optionalString,
  active: z.boolean().optional(),
});

export const previewCalorieGoalSchema = z.object({
  currentWeight: z.coerce.number().min(20).max(500),
  targetWeight: z.coerce.number().min(20).max(500),
  targetDate: dateString,
});

// ── Chat ──────────────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(5000),
  agentType: z.enum(["coach", "nutritionist", "general"]).optional().default("general"),
});

export const saveWorkoutFromChatSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalString,
  splitType: z.enum(["PPL", "Upper_Lower", "Bro_Split", "Full_Body", "Custom"]).optional().default("Custom"),
  objective: z.enum(["hypertrophy", "strength", "fat_loss", "endurance", "general"]).optional().default("general"),
  frequency: z.coerce.number().int().min(1).max(7).optional().default(3),
  dayLabel: z.string().trim().max(200).optional(),
  muscleGroups: z.array(z.string().trim().min(1)).optional().default([]),
  exercises: z.array(templateExerciseSchema).min(1, "At least one exercise is required"),
});

export const saveCaloriePlanFromChatSchema = z.object({
  name: z.string().trim().max(200).optional(),
  currentWeight: z.coerce.number().min(20).max(500),
  targetWeight: z.coerce.number().min(20).max(500),
  targetDate: dateString,
  dailyCalories: z.coerce.number().min(800).max(10000).optional(),
  proteinGrams: z.coerce.number().min(0).max(1000).optional(),
  carbsGrams: z.coerce.number().min(0).max(2000).optional(),
  fatsGrams: z.coerce.number().min(0).max(1000).optional(),
  notes: optionalString,
});

// ── Reports ───────────────────────────────────────────────────────────────────

export const generateReportSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  aiSummary: z.boolean().optional().default(true),
});
