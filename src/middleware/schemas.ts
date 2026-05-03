import { z } from "zod";

// ── Shared Primitives ─────────────────────────────────────────────────────────

const positiveInt = z.coerce.number().int().positive();
const positiveFloat = z.coerce.number().positive();
const optionalPositiveFloat = z.coerce.number().positive().optional();
const optionalPositiveInt = z.coerce.number().int().positive().optional();
const optionalString = z.string().trim().optional();
const dateString = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
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
  age: z.coerce
    .number()
    .int()
    .min(13, "Must be at least 13")
    .max(120)
    .optional(),
  weight: z.coerce
    .number()
    .min(20, "Weight must be at least 20kg")
    .max(500)
    .optional(),
  height: z.coerce
    .number()
    .min(50, "Height must be at least 50cm")
    .max(300)
    .optional(),
  sex: z.enum(["male", "female"]).optional(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  goal: z.string().trim().max(500).optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  proteinMultiplier: z.coerce
    .number()
    .min(0.8, "Minimum is 0.8 g/kg")
    .max(3.0, "Maximum is 3.0 g/kg")
    .optional(),
  trainingDaysPerWeek: z.coerce
    .number()
    .int()
    .min(1)
    .max(7)
    .nullable()
    .optional(),
  trainingHoursPerDay: z.coerce
    .number()
    .min(0.25, "Minimum 15 min")
    .max(4, "Maximum 4 hours")
    .nullable()
    .optional(),
  planAdjustmentMode: z.enum(["suggest", "confirm", "auto"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128),
});

// ── Goals ─────────────────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  type: z.enum([
    "weight_loss",
    "weight_gain",
    "strength",
    "endurance",
    "custom",
  ]),
  target: positiveFloat,
  unit: z.string().trim().min(1).max(50),
  endDate: dateString.optional(),
});

export const updateGoalSchema = z.object({
  type: z
    .enum(["weight_loss", "weight_gain", "strength", "endurance", "custom"])
    .optional(),
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
  duration: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(600),
  caloriesBurned: z.coerce.number().min(0).max(10000).optional(),
  notes: optionalString,
  date: dateString.optional(),
  templateId: positiveInt.optional(),
  trainingType: z.string().max(50).optional(),
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
  objective: z.enum([
    "hypertrophy",
    "strength",
    "fat_loss",
    "endurance",
    "general",
  ]),
  frequency: z.coerce.number().int().min(1).max(7),
  dayLabel: z.string().trim().min(1).max(200),
  muscleGroups: z.array(z.string().trim().min(1)).optional().default([]),
  exercises: z.array(templateExerciseSchema).optional().default([]),
  aiGenerated: z.boolean().optional().default(false),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: optionalString,
  splitType: z
    .enum(["PPL", "Upper_Lower", "Bro_Split", "Full_Body", "Custom"])
    .optional(),
  objective: z
    .enum(["hypertrophy", "strength", "fat_loss", "endurance", "general"])
    .optional(),
  frequency: z.coerce.number().int().min(1).max(7).optional(),
  dayLabel: z.string().trim().min(1).max(200).optional(),
  muscleGroups: z.array(z.string().trim().min(1)).optional(),
});

export const addTemplateExerciseSchema = templateExerciseSchema;

export const createFromWorkoutSchema = z.object({
  name: z.string().trim().max(200).optional(),
  splitType: z
    .enum(["PPL", "Upper_Lower", "Bro_Split", "Full_Body", "Custom"])
    .optional()
    .default("Custom"),
  objective: z
    .enum(["hypertrophy", "strength", "fat_loss", "endurance", "general"])
    .optional()
    .default("general"),
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
  isCheatMeal: z.boolean().optional(),
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
  agentType: z
    .enum(["coach", "nutritionist", "general"])
    .optional()
    .default("general"),
});

export const saveWorkoutFromChatSchema = z.object({
  mode: z.enum(["create", "replace"]).optional().default("create"),
  targetTemplateId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  description: optionalString,
  splitType: z
    .enum(["PPL", "Upper_Lower", "Bro_Split", "Full_Body", "Custom"])
    .optional()
    .default("Custom"),
  objective: z
    .enum(["hypertrophy", "strength", "fat_loss", "endurance", "general"])
    .optional()
    .default("general"),
  frequency: z.coerce.number().int().min(1).max(7).optional().default(3),
  dayLabel: z.string().trim().max(200).optional(),
  muscleGroups: z.array(z.string().trim().min(1)).optional().default([]),
  exercises: z
    .array(templateExerciseSchema)
    .min(1, "At least one exercise is required"),
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

const chatMealPlanFoodSchema = z.object({
  foodName: z.string().trim().min(1).max(300),
  calories: z.coerce.number().min(0).max(50000),
  protein: z.coerce.number().min(0).max(5000).optional(),
  carbs: z.coerce.number().min(0).max(5000).optional(),
  fats: z.coerce.number().min(0).max(5000).optional(),
  quantity: z.coerce.number().positive().optional().default(1),
  unit: z.string().trim().min(1).max(50).optional().default("serving"),
});

const chatMealPlanMealSchema = z.object({
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(chatMealPlanFoodSchema).default([]),
});

export const saveMealPlanFromChatSchema = z
  .object({
    mode: z.enum(["create", "replace", "append"]).optional().default("create"),
    targetPlanId: z.coerce.number().int().positive().nullable().optional(),
    name: z.string().trim().max(200).optional(),
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD")
      .optional(),
    days: z
      .array(
        z.object({
          dayIndex: z.coerce.number().int().min(0).max(6),
          meals: z.array(chatMealPlanMealSchema).default([]),
        }),
      )
      .optional(),
    meals: z.array(chatMealPlanMealSchema).optional(),
  })
  .refine(
    (data) => (data.days?.length ?? 0) > 0 || (data.meals?.length ?? 0) > 0,
    {
      message: "At least one day or meal is required",
    },
  );

// ── Weekly Plan ───────────────────────────────────────────────────────────────

export const upsertWeeklyPlanSchema = z.object({
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "week must be YYYY-MM-DD")
    .optional(),
  days: z
    .array(
      z.object({
        dayIndex: z.coerce.number().int().min(0).max(6),
        label: z.string().trim().min(1).max(100).optional(),
        targetCalories: z.coerce
          .number()
          .min(0)
          .max(20000)
          .nullable()
          .optional(),
        notes: z.string().trim().max(500).optional(),
      }),
    )
    .min(1, "At least one day is required")
    .max(7),
});

export const toggleDaySchema = z
  .object({
    actualCalories: z.coerce.number().min(0).max(20000).nullable().optional(),
    workoutId: z.coerce.number().int().positive().nullable().optional(),
  })
  .optional()
  .default({});

export const updateDaySchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  targetCalories: z.coerce.number().min(0).max(20000).nullable().optional(),
  actualCalories: z.coerce.number().min(0).max(20000).nullable().optional(),
  notes: z.string().trim().max(500).optional(),
  workoutId: z.coerce.number().int().positive().nullable().optional(),
});

// ── Workouts — start from template ───────────────────────────────────────────

export const startFromTemplateSchema = z.object({
  // Optional date the workout is being started (defaults to now in controller)
  date: dateString.optional(),
  // Optional custom name override (controller builds a default from template label + date)
  name: z.string().trim().min(1).max(200).optional(),
});

// ── Workouts — add exercise to existing workout ───────────────────────────────

export const addExerciseToWorkoutSchema = z.object({
  exerciseName: z.string().trim().min(1, "Exercise name is required").max(200),
  sets: z.coerce.number().int().min(1).max(100),
  reps: z.coerce.number().int().min(1).max(1000),
  weight: z.coerce.number().min(0).max(2000).nullable().optional(),
  rpe: z.coerce.number().int().min(1).max(10).nullable().optional(),
  notes: optionalString,
});

// ── Food Logs — bulk create ───────────────────────────────────────────────────

const bulkFoodItemSchema = z.object({
  foodName: z.string().trim().min(1).max(300),
  calories: z.coerce.number().min(0).max(50000),
  protein: z.coerce.number().min(0).max(5000).optional(),
  carbs: z.coerce.number().min(0).max(5000).optional(),
  fats: z.coerce.number().min(0).max(5000).optional(),
  quantity: positiveFloat,
  unit: z.string().trim().min(1).max(50),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});

export const bulkLogFoodsSchema = z.object({
  foods: z
    .array(bulkFoodItemSchema)
    .min(1, "At least one food item is required")
    .max(50),
  date: dateString.optional(),
});

// ── Reports ───────────────────────────────────────────────────────────────────

export const generateReportSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  aiSummary: z.boolean().optional().default(true),
});

// ── Water ─────────────────────────────────────────────────────────────────────

export const logWaterSchema = z.object({
  amount: z.coerce
    .number()
    .int()
    .positive("Amount must be a positive integer")
    .max(5000, "Amount too large"),
});

export const updateWaterTargetSchema = z.object({
  targetMl: z.coerce
    .number()
    .int()
    .min(250, "Minimum target is 250 ml")
    .max(10000, "Maximum target is 10 000 ml"),
});

// ── Calendar ──────────────────────────────────────────────────────────────────

const calendarDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const calendarMonthString = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");

const calendarAssignmentSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6), // 0=Mon … 6=Sun
  workoutName: z.string().trim().min(1).max(200),
  muscleGroups: z.array(z.string().trim().min(1)).optional(),
  templateId: z.coerce.number().int().positive().optional(),
  isRestDay: z.boolean().optional().default(false),
});

export const populateCalendarSchema = z.object({
  month: calendarMonthString,
  assignments: z
    .array(calendarAssignmentSchema)
    .min(1, "At least one assignment is required")
    .max(7),
  overwrite: z.boolean().optional().default(false),
});

export const swapCalendarDaysSchema = z
  .object({
    date1: calendarDateString,
    date2: calendarDateString,
  })
  .refine((d) => d.date1 !== d.date2, {
    message: "date1 and date2 must be different",
  });

export const updateCalendarDaySchema = z.object({
  workoutName: z.string().trim().min(1).max(200).optional(),
  muscleGroups: z.array(z.string().trim().min(1)).optional(),
  templateId: z.coerce.number().int().positive().nullable().optional(),
  isRestDay: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

// ── Meal Plans ────────────────────────────────────────────────────────────────

export const createMealPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(200),
  weekStart: calendarDateString,
  durationWeeks: z.coerce.number().int().min(1).max(52).optional(),
});

export const updateMealPlanSchema = z.object({
  name: z.string().trim().min(1).max(200),
  durationWeeks: z.coerce.number().int().min(1).max(52).optional(),
});

export const addMealPlanEntrySchema = z.object({
  foodName: z.string().trim().min(1, "Food name is required").max(300),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: z.coerce.number().min(0).max(50000),
  protein: z.coerce.number().min(0).max(5000).optional(),
  carbs: z.coerce.number().min(0).max(5000).optional(),
  fats: z.coerce.number().min(0).max(5000).optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(50),
});

export const updateMealPlanDayNotesSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
});

// ── Auth — password reset + email verification ────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
  token:    z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});
