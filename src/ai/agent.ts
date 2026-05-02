import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { AgentType, buildSystemPrompt, UserContext } from "./prompts.js";
import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { getProvider } from "./providers/index.js";

// ── Typed argument interfaces for tool handlers ────────────────────────────────

interface DaysArgs       { days?: number }
interface WeeksArgs      { weeks?: number }
interface LimitArgs      { limit?: number }
interface ExerciseArgs   { exerciseName?: string }

interface LogFoodArgs {
  foodName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  quantity?: number;
  unit?: string;
  meal?: string;
  date?: string;
}

interface TemplateExerciseArg {
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
  order?: number;
}

interface SaveTemplateArgs {
  name: string;
  description?: string;
  splitType?: string;
  objective?: string;
  dayLabel?: string;
  muscleGroups?: string[];
  exercises: TemplateExerciseArg[];
}

// Typed accumulator for daily food totals
interface MacroTotals { calories: number; protein: number; carbs: number; fats: number }

// Structured error type for upstream HTTP status propagation
interface AppError extends Error { statusCode: number; userFacing: boolean }

// Provider is resolved once at startup from AI_PROVIDER env var.
// Swap provider by changing that var — no code changes needed.
const provider = getProvider();

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentResponse {
  message: string;
  tokensUsed?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1 — TOOL SCHEMAS
//
// These are plain JSON descriptions sent to OpenAI alongside the conversation.
// The AI reads them and decides on its own when to call each one.
// We never tell the AI "call get_recent_workouts now" — it figures that out.
//
// Rules for good tool definitions:
//   - "description" should explain WHEN to use it, not just what it does
//   - Parameter descriptions should tell the AI what values are sensible
//   - Mark parameters "required" only if the tool genuinely can't run without them
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description:
        "Fetch the user's full profile/settings context: age, sex, height, weight, activity level, fitness level, primary goal, injuries, training schedule, protein multiplier, and water target. " +
        "Use this before making personalised workout, nutrition, calorie, or meal-plan changes.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_goals",
      description:
        "Fetch the user's active fitness goals and calorie goals. Use this before suggesting changes to workouts, calories, macros, meal plans, or progress targets.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_workouts",
      description:
        "Fetch the user's logged workout sessions from the last N days, including exercises, sets, reps, and weights. " +
        "Use this when the user asks about their training frequency, volume, recent sessions, muscle groups worked, " +
        "rest days, or whether they are overtraining.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "How many days back to look. Default 7, max 90.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nutrition_summary",
      description:
        "Fetch the user's daily calorie and macro totals for the last N days, plus averages for the period. " +
        "Use this when the user asks about their diet, calorie intake, macro tracking, or why they are or aren't losing/gaining weight.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "How many days back to look. Default 7, max 90.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weight_trend",
      description:
        "Fetch the user's bodyweight entries over the last N weeks and calculate the trend " +
        "(gaining, losing, or maintaining, and at what rate per week). " +
        "Use this when the user asks about weight progress, whether their cut or bulk is working, " +
        "or for any question that requires knowing how their weight is moving.",
      parameters: {
        type: "object",
        properties: {
          weeks: {
            type: "number",
            description: "How many weeks back to look. Default 4, max 24.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_calorie_goal",
      description:
        "Fetch the user's currently active calorie and macro goal (daily calorie target, protein, carbs, fats, " +
        "goal type: cut/bulk/maintain, target weight, target date). " +
        "Use this for any nutrition question that requires knowing what plan the user is supposed to be following.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_meal_plans",
      description:
        "Fetch the user's current Meal Planner plans, including day IDs, day indexes, meals, foods, calories, and macros. " +
        "Use this when creating or adjusting nutrition plans so the JSON proposal can target an existing plan with targetPlanId when appropriate.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description:
              "How many recent meal plans to fetch. Default 3, max 10.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workout_templates",
      description:
        "Fetch the user's saved workout templates including their exercises, sets, and reps. " +
        "Use this when suggesting workouts for today, recommending modifications to existing routines, " +
        "or when the user asks what programs they already have saved.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_personal_records",
      description:
        "Fetch the user's all-time personal records (best weight lifted) per exercise. " +
        "Optionally filter to a single exercise. " +
        "Use this when discussing strength progress, progressive overload targets, or when the user asks about their PRs.",
      parameters: {
        type: "object",
        properties: {
          exerciseName: {
            type: "string",
            description:
              "Optional. If provided, return the PR only for this exercise.",
          },
        },
        required: [],
      },
    },
  },

  // ── WRITE TOOLS ─────────────────────────────────────────────────────────────

  {
    type: "function",
    function: {
      name: "log_food",
      description:
        "Log a food item directly to the user's nutrition diary. " +
        "Use this when the user says they just ate something (e.g. 'I just had 2 eggs'), " +
        "explicitly asks you to log a food item, or confirms a food you suggested. " +
        "Always acknowledge what you logged and mention their updated calorie total. " +
        "If macros are unknown, estimate reasonable values based on typical nutritional data.",
      parameters: {
        type: "object",
        properties: {
          foodName: {
            type: "string",
            description:
              "Name of the food item (e.g. 'Grilled Chicken Breast', '2 Scrambled Eggs').",
          },
          calories: {
            type: "number",
            description: "Total calories in the logged quantity.",
          },
          protein: {
            type: "number",
            description: "Protein in grams (estimate if unknown).",
          },
          carbs: {
            type: "number",
            description: "Carbohydrates in grams (estimate if unknown).",
          },
          fats: {
            type: "number",
            description: "Fats in grams (estimate if unknown).",
          },
          quantity: {
            type: "number",
            description: "Quantity of the serving unit. Default 1.",
          },
          unit: {
            type: "string",
            description:
              "Measurement unit (e.g. 'serving', 'g', 'cup', 'piece', 'slice'). Default 'serving'.",
          },
          meal: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description:
              "Meal category. Infer from context or the time of day if not specified.",
          },
          date: {
            type: "string",
            description: "ISO date (YYYY-MM-DD). Defaults to today if omitted.",
          },
        },
        required: ["foodName", "calories"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "save_workout_template",
      description:
        "Save a complete workout plan as a reusable template in the user's library. " +
        "Use this when you have designed a full routine and the user asks to save it, " +
        "or proactively offer to save it after providing a detailed workout plan. " +
        "Do NOT use this to log a single training session — only for saving reusable programs.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Short descriptive name (e.g. 'Push Day A', 'Full Body Strength').",
          },
          description: {
            type: "string",
            description:
              "Brief description of the template's purpose and target audience.",
          },
          splitType: {
            type: "string",
            description:
              "Training split (e.g. 'Push/Pull/Legs', 'Upper/Lower', 'Full Body', 'Custom').",
          },
          objective: {
            type: "string",
            enum: [
              "strength",
              "hypertrophy",
              "endurance",
              "weight_loss",
              "general",
              "custom",
            ],
            description: "Primary training objective.",
          },
          dayLabel: {
            type: "string",
            description:
              "Label in the split schedule (e.g. 'Day 1', 'Push Day'). Defaults to name.",
          },
          muscleGroups: {
            type: "array",
            items: { type: "string" },
            description:
              "Primary muscle groups (e.g. ['chest', 'shoulders', 'triceps']).",
          },
          exercises: {
            type: "array",
            description: "Ordered list of exercises.",
            items: {
              type: "object",
              properties: {
                exerciseName: { type: "string" },
                sets: { type: "number" },
                reps: {
                  type: "string",
                  description: "Reps or range e.g. '8', '8-12'.",
                },
                restSeconds: {
                  type: "number",
                  description: "Rest in seconds between sets.",
                },
                notes: {
                  type: "string",
                  description: "Form cues or technique notes.",
                },
              },
              required: ["exerciseName", "sets", "reps"],
            },
          },
        },
        required: ["name", "exercises"],
      },
    },
  },
  // ── #115 additions ──────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_today_nutrition",
      description:
        "Fetch the user\'s food log for today only — total calories consumed, macros eaten, " +
        "and how much remains vs their daily target. Use this when the user asks what they\'ve " +
        "eaten today, how many calories they have left, or whether they\'re on track today.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_goal_progress",
      description:
        "Fetch the user\'s active calorie/macro goal and calculate how close they are to " +
        "their target weight — days elapsed, days remaining, expected vs actual progress, " +
        "and whether they are ahead or behind schedule. Use when the user asks how their " +
        "diet plan is going, if they are on track, or how far they are from their goal.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_foods",
      description:
        "Suggest specific foods to help the user hit their remaining macro targets for the day. " +
        "Automatically fetches today\'s remaining macros and returns food ideas with amounts. " +
        "Use when the user asks \'what should I eat\', \'what can I have\', or needs to hit a " +
        "specific protein/calorie target for the rest of the day.",
      parameters: {
        type: "object",
        properties: {
          preference: {
            type: "string",
            description:
              "Optional dietary preference e.g. \'high protein\', \'low carb\', \'vegetarian\', \'quick snack\'.",
          },
        },
        required: [],
      },
    },
  },
];

// Each agent gets only the tools relevant to its role.
// Giving the nutritionist access to PR data would just create noise.
const READ_ONLY_TOOL_NAMES = [
  "get_user_profile",
  "get_user_goals",
  "get_recent_workouts",
  "get_nutrition_summary",
  "get_weight_trend",
  "get_active_calorie_goal",
  "get_meal_plans",
  "get_workout_templates",
  "get_personal_records",
  "get_today_nutrition",
  "get_goal_progress",
  "suggest_foods",
];

const AGENT_TOOLS: Record<AgentType, OpenAI.Chat.ChatCompletionTool[]> = {
  coach: TOOL_DEFINITIONS.filter((t) =>
    [
      "get_user_profile",
      "get_user_goals",
      "get_recent_workouts",
      "get_workout_templates",
      "get_personal_records",
      "get_weight_trend",
      "get_active_calorie_goal",
      "get_today_nutrition",
      "get_goal_progress",
      "save_workout_template",
    ].includes(t.function.name),
  ),
  nutritionist: TOOL_DEFINITIONS.filter((t) =>
    [
      "get_user_profile",
      "get_user_goals",
      "get_nutrition_summary",
      "get_active_calorie_goal",
      "get_meal_plans",
      "get_weight_trend",
      "get_today_nutrition",
      "get_goal_progress",
      "suggest_foods",
      "log_food",
    ].includes(t.function.name),
  ),
  general: TOOL_DEFINITIONS.filter((t) =>
    READ_ONLY_TOOL_NAMES.includes(t.function.name),
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2 — TOOL HANDLER FUNCTIONS
//
// These are the actual database queries. When the AI decides to call a tool,
// we look up the handler by name, run it, and send the result back.
//
// Each handler receives the parsed arguments the AI chose, runs a Prisma
// query, and returns a plain string. We convert to string because that is
// what goes back into the messages array as the "tool result".
//
// Design note: return human-readable summaries, not raw JSON blobs.
// The AI understands natural language better than it understands
// {"calories":1840,"protein":142} with no context.
// ─────────────────────────────────────────────────────────────────────────────

async function handleGetUserProfile(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      firstName: true,
      lastName: true,
      age: true,
      weight: true,
      height: true,
      sex: true,
      activityLevel: true,
      fitnessLevel: true,
      goal: true,
      proteinMultiplier: true,
      trainingDaysPerWeek: true,
      trainingHoursPerDay: true,
      injuries: true,
      waterTargetMl: true,
    },
  });

  if (!user) return "User profile not found.";

  return (
    `User profile/settings:\n` +
    `Name: ${[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}\n` +
    `Age: ${user.age ?? "unknown"} | Sex: ${user.sex ?? "unknown"} | Height: ${user.height ?? "unknown"} cm | Weight: ${user.weight ?? "unknown"} kg\n` +
    `Activity: ${user.activityLevel ?? "unknown"} | Fitness level: ${user.fitnessLevel ?? "unknown"} | Goal: ${user.goal ?? "not set"}\n` +
    `Protein multiplier: ${user.proteinMultiplier ?? "not set"} g/kg | Training: ${user.trainingDaysPerWeek ?? "unknown"} days/week × ${user.trainingHoursPerDay ?? "unknown"} h/session\n` +
    `Injuries/limitations: ${user.injuries ?? "none listed"} | Water target: ${user.waterTargetMl ?? "not set"} ml/day`
  );
}

async function handleGetUserGoals(userId: number): Promise<string> {
  const [goals, calorieGoals] = await Promise.all([
    prisma.goal.findMany({
      where: { userId },
      orderBy: [{ achieved: "asc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.calorieGoal.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  const goalLines = goals.length
    ? goals
        .map(
          (g) =>
            `• #${g.id} ${g.type}: ${g.current}/${g.target} ${g.unit}${g.achieved ? " (achieved)" : ""}`,
        )
        .join("\n")
    : "No fitness goals saved.";

  const calorieLines = calorieGoals.length
    ? calorieGoals
        .map(
          (g) =>
            `• #${g.id}${g.active ? " ACTIVE" : ""} ${g.name ?? g.type}: ${g.dailyCalories} kcal | P ${g.proteinGrams}g C ${g.carbsGrams}g F ${g.fatsGrams}g | ${g.currentWeight}kg → ${g.targetWeight}kg by ${g.targetDate.toISOString().split("T")[0]}`,
        )
        .join("\n")
    : "No calorie goals saved.";

  return `Fitness goals:\n${goalLines}\n\nCalorie/macro goals:\n${calorieLines}`;
}

async function handleGetRecentWorkouts(
  userId: number,
  args: DaysArgs,
): Promise<string> {
  const days = Math.min(Number(args.days) || 7, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const workouts = await prisma.workout.findMany({
    where: { userId, date: { gte: since } },
    include: { exercises: { orderBy: { order: "asc" } } },
    orderBy: { date: "desc" },
  });

  if (workouts.length === 0) {
    return `No workouts logged in the last ${days} days.`;
  }

  const lines = workouts.map((w) => {
    const date = w.date.toISOString().split("T")[0];
    const totalVolume = w.exercises.reduce(
      (sum, ex) => sum + ex.sets * ex.reps * (ex.weight ?? 0),
      0,
    );
    const exerciseList = w.exercises
      .map(
        (ex) =>
          `${ex.exerciseName} ${ex.sets}×${ex.reps}${ex.weight ? ` @ ${ex.weight}kg` : ""}`,
      )
      .join(", ");
    return `• ${date} — ${w.name}${w.duration ? ` (${w.duration} min)` : ""}: ${exerciseList}. Volume: ${Math.round(totalVolume)}kg`;
  });

  return `Workouts in the last ${days} days (${workouts.length} sessions):\n${lines.join("\n")}`;
}

async function handleGetNutritionSummary(
  userId: number,
  args: DaysArgs,
): Promise<string> {
  const days = Math.min(Number(args.days) || 7, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await prisma.foodLog.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "desc" },
  });

  if (logs.length === 0) {
    return `No food logged in the last ${days} days.`;
  }

  // Group by day
  const byDay: Record<
    string,
    { calories: number; protein: number; carbs: number; fats: number }
  > = {};
  for (const log of logs) {
    const day = log.date.toISOString().split("T")[0];
    if (!byDay[day])
      byDay[day] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    byDay[day].calories += log.calories;
    byDay[day].protein += log.protein ?? 0;
    byDay[day].carbs += log.carbs ?? 0;
    byDay[day].fats += log.fats ?? 0;
  }

  const dayEntries = Object.entries(byDay).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );
  const totalDays = dayEntries.length;
  const avg = {
    calories: Math.round(
      dayEntries.reduce((s, [, d]) => s + d.calories, 0) / totalDays,
    ),
    protein: Math.round(
      dayEntries.reduce((s, [, d]) => s + d.protein, 0) / totalDays,
    ),
    carbs: Math.round(
      dayEntries.reduce((s, [, d]) => s + d.carbs, 0) / totalDays,
    ),
    fats: Math.round(
      dayEntries.reduce((s, [, d]) => s + d.fats, 0) / totalDays,
    ),
  };

  const dailyLines = dayEntries
    .slice(0, 7)
    .map(
      ([date, d]) =>
        `• ${date}: ${Math.round(d.calories)} kcal | P: ${Math.round(d.protein)}g | C: ${Math.round(d.carbs)}g | F: ${Math.round(d.fats)}g`,
    );

  return (
    `Nutrition over the last ${days} days (${totalDays} days tracked):\n` +
    `Averages — ${avg.calories} kcal | Protein: ${avg.protein}g | Carbs: ${avg.carbs}g | Fats: ${avg.fats}g\n\n` +
    `Daily breakdown:\n${dailyLines.join("\n")}`
  );
}

async function handleGetWeightTrend(
  userId: number,
  args: WeeksArgs,
): Promise<string> {
  const weeks = Math.min(Number(args.weeks) || 4, 24);
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const entries = await prisma.weightLog.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  if (entries.length === 0) {
    return `No weight entries logged in the last ${weeks} weeks.`;
  }

  const first = entries[0];
  const last = entries[entries.length - 1];
  const delta = Math.round((last.weight - first.weight) * 100) / 100;
  const daysDiff = Math.max(
    1,
    (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weeklyRate = Math.round((delta / (daysDiff / 7)) * 100) / 100;

  const direction =
    Math.abs(delta) < 0.3
      ? "maintaining"
      : delta < 0
        ? "losing weight"
        : "gaining weight";

  const recentLines = entries
    .slice(-5)
    .map((e) => `• ${e.date.toISOString().split("T")[0]}: ${e.weight} kg`);

  return (
    `Weight trend over the last ${weeks} weeks (${entries.length} entries):\n` +
    `Start: ${first.weight} kg → Current: ${last.weight} kg\n` +
    `Change: ${delta > 0 ? "+" : ""}${delta} kg (${direction} at ~${Math.abs(weeklyRate)} kg/week)\n\n` +
    `Recent entries:\n${recentLines.join("\n")}`
  );
}

async function handleGetActiveCalorieGoal(userId: number): Promise<string> {
  const goal = await prisma.calorieGoal.findFirst({
    where: { userId, active: true },
  });

  if (!goal) {
    return "The user has no active calorie goal set.";
  }

  const targetDate = goal.targetDate
    ? goal.targetDate.toISOString().split("T")[0]
    : "no target date set";

  return (
    `Active calorie goal:\n` +
    `Type: ${goal.type} (${goal.name})\n` +
    `Daily target: ${goal.dailyCalories} kcal | Protein: ${goal.proteinGrams}g | Carbs: ${goal.carbsGrams}g | Fats: ${goal.fatsGrams}g\n` +
    `Current weight: ${goal.currentWeight} kg → Target: ${goal.targetWeight} kg by ${targetDate}\n` +
    `Weekly change target: ${goal.weeklyChange && goal.weeklyChange > 0 ? "+" : ""}${goal.weeklyChange} kg/week`
  );
}

async function handleGetMealPlans(userId: number, args: LimitArgs): Promise<string> {
  const limit = Math.min(Number(args.limit) || 3, 10);
  const plans = await prisma.mealPlan.findMany({
    where: { userId },
    include: {
      days: {
        orderBy: { dayIndex: "asc" },
        include: { entries: { orderBy: [{ meal: "asc" }, { order: "asc" }] } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (plans.length === 0) return "The user has no Meal Planner plans saved.";

  const planLines = plans.map((p) => {
    const days = p.days
      .map((d) => {
        const entries = d.entries
          .map(
            (e) =>
              `${e.meal}: ${e.foodName} (${Math.round(e.calories)} kcal, P${Math.round(e.protein ?? 0)} C${Math.round(e.carbs ?? 0)} F${Math.round(e.fats ?? 0)})`,
          )
          .join("; ");
        return `  Day ${d.dayIndex} (dayId ${d.id}): ${entries || "empty"}`;
      })
      .join("\n");
    return `• Plan #${p.id}: ${p.name} (weekStart ${p.weekStart})\n${days}`;
  });

  return `Current meal plans (${plans.length}):\n${planLines.join("\n")}`;
}

async function handleGetWorkoutTemplates(userId: number): Promise<string> {
  const templates = await prisma.workoutTemplate.findMany({
    where: { userId },
    include: { exercises: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  if (templates.length === 0) {
    return "The user has no saved workout templates.";
  }

  const lines = templates.map((t) => {
    const exerciseList = t.exercises
      .map((ex) => `${ex.exerciseName} ${ex.sets}×${ex.reps}`)
      .join(", ");
    return `• #${t.id} ${t.name} (${t.splitType}, ${t.objective}, ${t.frequency}d/week): ${exerciseList}`;
  });

  return `Saved workout templates (${templates.length}):\n${lines.join("\n")}`;
}

async function handleGetPersonalRecords(
  userId: number,
  args: ExerciseArgs,
): Promise<string> {
  const where: Prisma.WorkoutExerciseWhereInput = {
    workout: { userId },
    weight: { not: null },
  };
  if (args.exerciseName) {
    where.exerciseName = { contains: args.exerciseName, mode: "insensitive" };
  }

  const records = await prisma.workoutExercise.groupBy({
    by: ["exerciseName"],
    where,
    _max: { weight: true },
    orderBy: { _max: { weight: "desc" } },
    take: 20,
  });

  if (records.length === 0) {
    return args.exerciseName
      ? `No logged sets found for "${args.exerciseName}".`
      : "No personal records found yet — no weighted exercises have been logged.";
  }

  const lines = records.map((r) => `• ${r.exerciseName}: ${r._max.weight} kg`);

  return `Personal records (best weight lifted):\n${lines.join("\n")}`;
}

// ── #115 NEW READ TOOL HANDLERS ───────────────────────────────────────────────

async function handleGetTodayNutrition(userId: number): Promise<string> {
  const today = new Date();
  const start = new Date(today);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCHours(23, 59, 59, 999);

  const [logs, goal] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { createdAt: "asc" },
      select: { foodName: true, calories: true, protein: true, carbs: true, fats: true, meal: true },
    }),
    prisma.calorieGoal.findFirst({
      where: { userId, active: true },
      select: { dailyCalories: true, proteinGrams: true, carbsGrams: true, fatsGrams: true },
    }),
  ]);

  const totals = logs.reduce<MacroTotals>(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + (l.protein ?? 0),
      carbs: acc.carbs + (l.carbs ?? 0),
      fats: acc.fats + (l.fats ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  const dateStr = today.toISOString().split("T")[0];
  const itemLines = logs.map(
    (l) => `  • ${l.meal ? `[${l.meal}] ` : ""}${l.foodName}: ${Math.round(l.calories)} kcal`,
  );

  let result =
    `Today (${dateStr}) — ${logs.length} item(s) logged:\n` +
    `Consumed: ${Math.round(totals.calories)} kcal | P: ${Math.round(totals.protein)}g | C: ${Math.round(totals.carbs)}g | F: ${Math.round(totals.fats)}g\n`;

  if (goal) {
    const remCal = Math.round(goal.dailyCalories - totals.calories);
    const remP = Math.round(goal.proteinGrams - totals.protein);
    const remC = Math.round(goal.carbsGrams - totals.carbs);
    const remF = Math.round(goal.fatsGrams - totals.fats);
    result +=
      `Target:   ${Math.round(goal.dailyCalories)} kcal | P: ${Math.round(goal.proteinGrams)}g | C: ${Math.round(goal.carbsGrams)}g | F: ${Math.round(goal.fatsGrams)}g\n` +
      `Remaining: ${remCal > 0 ? remCal : 0} kcal | P: ${remP > 0 ? remP : 0}g | C: ${remC > 0 ? remC : 0}g | F: ${remF > 0 ? remF : 0}g\n` +
      (remCal < 0 ? `⚠️ Over target by ${Math.abs(remCal)} kcal\n` : "");
  } else {
    result += "(No active calorie goal set)\n";
  }

  if (itemLines.length > 0) {
    result += `\nItems logged today:\n${itemLines.join("\n")}`;
  } else {
    result += "\nNothing logged yet today.";
  }

  return result;
}

async function handleGetGoalProgress(userId: number): Promise<string> {
  const [goal, latestWeight] = await Promise.all([
    prisma.calorieGoal.findFirst({
      where: { userId, active: true },
      select: {
        name: true,
        type: true,
        currentWeight: true,
        targetWeight: true,
        targetDate: true,
        dailyCalories: true,
        weeklyChange: true,
        createdAt: true,
      },
    }),
    prisma.weightLog.findFirst({
      where: { userId },
      orderBy: { date: "desc" },
      select: { weight: true, date: true },
    }),
  ]);

  if (!goal) return "No active calorie goal found. Set a goal in the Goals section to track progress.";

  const now = new Date();
  const totalDays = Math.max(
    1,
    (goal.targetDate.getTime() - goal.createdAt.getTime()) / 86400000,
  );
  const elapsed = Math.max(
    0,
    (now.getTime() - goal.createdAt.getTime()) / 86400000,
  );
  const remaining = Math.max(0, (goal.targetDate.getTime() - now.getTime()) / 86400000);
  const weightToGo = Math.abs(goal.targetWeight - goal.currentWeight);
  const expectedProgress = (elapsed / totalDays) * weightToGo;

  let progressLine = "";
  if (latestWeight) {
    const actualChange = Math.abs(latestWeight.weight - goal.currentWeight);
    const pctDone = weightToGo > 0 ? Math.round((actualChange / weightToGo) * 100) : 0;
    const ahead = goal.type === "cut"
      ? latestWeight.weight <= goal.currentWeight - expectedProgress
      : latestWeight.weight >= goal.currentWeight + expectedProgress;
    progressLine =
      `Current weight: ${latestWeight.weight} kg (logged ${latestWeight.date.toISOString().split("T")[0]})\n` +
      `Progress: ${actualChange.toFixed(1)} kg of ${weightToGo.toFixed(1)} kg target (${pctDone}% complete)\n` +
      `Schedule: ${ahead ? "✅ Ahead of schedule" : "⚠️ Behind schedule"} (expected ${expectedProgress.toFixed(1)} kg by now)\n`;
  }

  return (
    `Active goal: ${goal.name ?? goal.type}\n` +
    `Type: ${goal.type} | Start: ${goal.currentWeight} kg → Target: ${goal.targetWeight} kg\n` +
    `Daily calories: ${Math.round(goal.dailyCalories)} kcal | Weekly change rate: ${goal.weeklyChange > 0 ? "+" : ""}${goal.weeklyChange} kg/week\n` +
    `Timeline: ${Math.round(elapsed)} days elapsed, ${Math.round(remaining)} days remaining (target: ${goal.targetDate.toISOString().split("T")[0]})\n` +
    progressLine
  );
}

interface SuggestFoodsArgs { preference?: string }

async function handleSuggestFoods(userId: number, args: SuggestFoodsArgs): Promise<string> {
  // Get today\'s remaining macros first
  const today = new Date();
  const start = new Date(today); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(today); end.setUTCHours(23, 59, 59, 999);

  const [logs, goal] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { calories: true, protein: true, carbs: true, fats: true },
    }),
    prisma.calorieGoal.findFirst({
      where: { userId, active: true },
      select: { dailyCalories: true, proteinGrams: true, carbsGrams: true, fatsGrams: true },
    }),
  ]);

  const consumed = logs.reduce<MacroTotals>(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + (l.protein ?? 0),
      carbs: acc.carbs + (l.carbs ?? 0),
      fats: acc.fats + (l.fats ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  const pref = args.preference ? ` (preference: ${args.preference})` : "";

  if (!goal) {
    return (
      `No active calorie goal — I\'ll suggest based on general good nutrition${pref}.\n` +
      `Consumed today: ${Math.round(consumed.calories)} kcal | P: ${Math.round(consumed.protein)}g | C: ${Math.round(consumed.carbs)}g | F: ${Math.round(consumed.fats)}g\n` +
      `Suggestion context provided. Please suggest 3-5 whole foods with estimated macros.`
    );
  }

  const rem = {
    calories: Math.max(0, Math.round(goal.dailyCalories - consumed.calories)),
    protein: Math.max(0, Math.round(goal.proteinGrams - consumed.protein)),
    carbs: Math.max(0, Math.round(goal.carbsGrams - consumed.carbs)),
    fats: Math.max(0, Math.round(goal.fatsGrams - consumed.fats)),
  };

  return (
    `Remaining macros for today${pref}:\n` +
    `Calories: ${rem.calories} kcal | Protein: ${rem.protein}g | Carbs: ${rem.carbs}g | Fats: ${rem.fats}g\n\n` +
    `Based on these remaining targets, please suggest 3-5 specific foods with serving sizes and estimated macros that would help the user hit their targets.`
  );
}

// ── WRITE TOOL HANDLERS ──────────────────────────────────────────────────────

async function handleLogFood(userId: number, args: LogFoodArgs): Promise<string> {
  const {
    foodName,
    calories,
    protein = 0,
    carbs = 0,
    fats = 0,
    quantity = 1,
    unit = "serving",
    meal,
    date,
  } = args;

  if (!foodName || calories == null) {
    return "Cannot log food: foodName and calories are required.";
  }

  // Determine the target date (today by default)
  const targetDate = date ? new Date(date) : new Date();
  // Normalize to midnight UTC to match how other food logs are stored
  targetDate.setUTCHours(0, 0, 0, 0);

  await prisma.foodLog.create({
    data: {
      userId,
      foodName,
      calories: Math.round(calories),
      protein: Math.round(protein ?? 0),
      carbs: Math.round(carbs ?? 0),
      fats: Math.round(fats ?? 0),
      quantity: quantity ?? 1,
      unit: unit ?? "serving",
      meal: meal ?? null,
      date: targetDate,
    },
  });

  // Return a summary that includes the running daily total so the AI can
  // mention it in the response without needing another tool call.
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const dayLogs = await prisma.foodLog.findMany({
    where: { userId, date: { gte: startOfDay, lte: endOfDay } },
    select: { calories: true, protein: true, carbs: true, fats: true },
  });

  const totals = dayLogs.reduce<MacroTotals>(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + (l.protein ?? 0),
      carbs: acc.carbs + (l.carbs ?? 0),
      fats: acc.fats + (l.fats ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  logger.info(
    `AI logged food for user ${userId}: ${foodName} (${Math.round(calories)} kcal)`,
  );

  return (
    `✅ Logged: "${foodName}" — ${Math.round(calories)} kcal | P: ${Math.round(protein)}g | C: ${Math.round(carbs)}g | F: ${Math.round(fats)}g\n` +
    `Daily total so far: ${Math.round(totals.calories)} kcal | P: ${Math.round(totals.protein)}g | C: ${Math.round(totals.carbs)}g | F: ${Math.round(totals.fats)}g`
  );
}

async function handleSaveWorkoutTemplate(
  userId: number,
  args: SaveTemplateArgs,
): Promise<string> {
  const {
    name,
    description,
    splitType = "Custom",
    objective = "general",
    dayLabel,
    muscleGroups = [],
    exercises,
  } = args;

  if (
    !name ||
    !exercises ||
    !Array.isArray(exercises) ||
    exercises.length === 0
  ) {
    return "Cannot save template: name and at least one exercise are required.";
  }

  const template = await prisma.workoutTemplate.create({
    data: {
      userId,
      name,
      description: description || "Created by AI Coach",
      splitType,
      objective,
      frequency: 3,
      dayLabel: dayLabel || name,
      muscleGroups: JSON.stringify(
        Array.isArray(muscleGroups) ? muscleGroups : [],
      ),
      aiGenerated: true,
      exercises: {
        create: exercises.map((ex: TemplateExerciseArg, i: number) => ({
          exerciseName: ex.exerciseName,
          sets: Number(ex.sets),
          reps: String(ex.reps),
          restSeconds: ex.restSeconds ? Number(ex.restSeconds) : null,
          notes: ex.notes ?? null,
          order: ex.order ?? i,
        })),
      },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  const exerciseList = template.exercises
    .map((ex) => `${ex.exerciseName} ${ex.sets}×${ex.reps}`)
    .join(", ");

  logger.info(
    `AI saved workout template for user ${userId}: ${name} (${template.exercises.length} exercises)`,
  );

  return (
    `✅ Workout template "${name}" saved to your library with ${template.exercises.length} exercises:\n` +
    exerciseList +
    "\n" +
    `You can find it in the Workouts → Templates tab and start it any time.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DISPATCHER
//
// A single function that maps tool name → handler function.
// When the AI calls a tool, this is what runs the actual code.
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  userId: number,
): Promise<string> {
  logger.debug(`Tool call: ${name}(${JSON.stringify(args)})`);

  switch (name) {
    case "get_user_profile":
      return handleGetUserProfile(userId);
    case "get_user_goals":
      return handleGetUserGoals(userId);
    case "get_recent_workouts":
      return handleGetRecentWorkouts(userId, args);
    case "get_nutrition_summary":
      return handleGetNutritionSummary(userId, args);
    case "get_weight_trend":
      return handleGetWeightTrend(userId, args);
    case "get_active_calorie_goal":
      return handleGetActiveCalorieGoal(userId);
    case "get_meal_plans":
      return handleGetMealPlans(userId, args);
    case "get_workout_templates":
      return handleGetWorkoutTemplates(userId);
    case "get_personal_records":
      return handleGetPersonalRecords(userId, args);
    case "get_today_nutrition":
      return handleGetTodayNutrition(userId);
    case "get_goal_progress":
      return handleGetGoalProgress(userId);
    case "suggest_foods":
      return handleSuggestFoods(userId, args);
    case "log_food":
      return handleLogFood(userId, args as unknown as LogFoodArgs);
    case "save_workout_template":
      return handleSaveWorkoutTemplate(userId, args as unknown as SaveTemplateArgs);
    default:
      return `Unknown tool: ${name}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3 — THE AGENT LOOP
//
// This replaces the single openai.chat.completions.create call.
//
// The loop:
//   1. Call the AI with the current messages + tool definitions
//   2. If the AI returns tool_calls → run each tool, append results, go to 1
//   3. If the AI returns a text message → we're done, return it
//
// We cap the loop at MAX_TOOL_ROUNDS to prevent infinite loops in edge cases.
// In practice the AI almost never needs more than 2-3 rounds.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 5;

// Error classification is now delegated to provider.classifyError() and
// provider.isRateLimitError(). The standalone function has been removed.

export const chat = async (
  userMessage: string,
  agentType: AgentType,
  user: UserContext & { id?: number },
  history: ChatMessage[] = [],
): Promise<AgentResponse> => {
  const systemPrompt = buildSystemPrompt(agentType, user);
  const tools = AGENT_TOOLS[agentType];

  // Build the initial message array
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  let totalTokens = 0;

  // ── The loop ────────────────────────────────────────────────────────────────
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    logger.debug(
      `AI agent (${agentType}) — round ${round + 1}, ${messages.length} messages`,
    );

    let result: import("./providers/ProviderAdapter.js").CompletionResult;
    try {
      result = await provider.complete({
        model: provider.defaultModel,
        messages,
        tools,
        // "auto" means the AI decides whether to call a tool or reply directly.
        // Alternatives: "none" (never call tools), "required" (always call one).
        tool_choice: "auto",
        max_tokens: 1000,
        temperature: 0.7,
      });
    } catch (error) {
      const userFacingMsg = provider.classifyError(error);
      logger.error(
        `AI provider error (${agentType}, round ${round + 1}):`,
        error,
      );
      // Throw a structured error the chatController can catch and return as HTTP 502
      const apiError = Object.assign(new Error(userFacingMsg), {
        statusCode: provider.isRateLimitError(error) ? 429 : 502,
        userFacing: true,
      }) as AppError;
      throw apiError;
    }

    totalTokens += result.tokensUsed;
    const responseMessage = result.message;

    if (!responseMessage) break;

    // ── Case 1: No tool calls → the AI is done, return the text ────────────
    if (
      !responseMessage.tool_calls ||
      responseMessage.tool_calls.length === 0
    ) {
      const reply =
        responseMessage.content ??
        "I'm sorry, I couldn't generate a response. Please try again.";

      logger.debug(
        `AI agent done — ${totalTokens} total tokens, ${round + 1} round(s)`,
      );
      return { message: reply, tokensUsed: totalTokens };
    }

    // ── Case 2: Tool calls present → run each one, append results ──────────
    //
    // First, add the assistant's message (including its tool_calls) to the
    // conversation. OpenAI requires this before you can add tool results.
    messages.push(responseMessage);

    // Run all tool calls in parallel — no reason to do them sequentially
    // if the AI asked for multiple tools at once.
    await Promise.all(
      responseMessage.tool_calls.map(async (toolCall) => {
        const args = JSON.parse(toolCall.function.arguments || "{}");

        // Only run tools if we have a userId (shouldn't ever be missing, but be safe)
        const result = user.id
          ? await dispatchTool(toolCall.function.name, args, user.id)
          : "User context unavailable — cannot query database.";

        // Append the tool result as a "tool" role message.
        // The tool_call_id links this result back to the specific tool call
        // the AI made, so it knows which result belongs to which call.
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }),
    );

    // Loop again — the AI will now read the tool results and either
    // reply with text or ask for more tools.
  }

  // Safety fallback — if we hit MAX_TOOL_ROUNDS without a text response
  logger.warn(
    `AI agent hit MAX_TOOL_ROUNDS (${MAX_TOOL_ROUNDS}) without a final response`,
  );
  return {
    message:
      "I gathered your data but ran into an issue composing a response. Please try again.",
    tokensUsed: totalTokens,
  };
};
