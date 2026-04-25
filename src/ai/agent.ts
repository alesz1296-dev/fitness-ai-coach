import OpenAI from "openai";
import { AgentType, buildSystemPrompt, UserContext } from "./prompts.js";
import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
            description: "Optional. If provided, return the PR only for this exercise.",
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
            description: "Name of the food item (e.g. 'Grilled Chicken Breast', '2 Scrambled Eggs').",
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
            description: "Measurement unit (e.g. 'serving', 'g', 'cup', 'piece', 'slice'). Default 'serving'.",
          },
          meal: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Meal category. Infer from context or the time of day if not specified.",
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
            description: "Short descriptive name (e.g. 'Push Day A', 'Full Body Strength').",
          },
          description: {
            type: "string",
            description: "Brief description of the template's purpose and target audience.",
          },
          splitType: {
            type: "string",
            description: "Training split (e.g. 'Push/Pull/Legs', 'Upper/Lower', 'Full Body', 'Custom').",
          },
          objective: {
            type: "string",
            enum: ["strength", "hypertrophy", "endurance", "weight_loss", "general", "custom"],
            description: "Primary training objective.",
          },
          dayLabel: {
            type: "string",
            description: "Label in the split schedule (e.g. 'Day 1', 'Push Day'). Defaults to name.",
          },
          muscleGroups: {
            type: "array",
            items: { type: "string" },
            description: "Primary muscle groups (e.g. ['chest', 'shoulders', 'triceps']).",
          },
          exercises: {
            type: "array",
            description: "Ordered list of exercises.",
            items: {
              type: "object",
              properties: {
                exerciseName: { type: "string" },
                sets:         { type: "number" },
                reps:         { type: "string", description: "Reps or range e.g. '8', '8-12'." },
                restSeconds:  { type: "number", description: "Rest in seconds between sets." },
                notes:        { type: "string", description: "Form cues or technique notes." },
              },
              required: ["exerciseName", "sets", "reps"],
            },
          },
        },
        required: ["name", "exercises"],
      },
    },
  },
];

// Each agent gets only the tools relevant to its role.
// Giving the nutritionist access to PR data would just create noise.
const AGENT_TOOLS: Record<AgentType, OpenAI.Chat.ChatCompletionTool[]> = {
  coach: TOOL_DEFINITIONS.filter((t) =>
    [
      "get_recent_workouts", "get_workout_templates", "get_personal_records",
      "get_weight_trend", "save_workout_template", "log_food",
    ].includes(t.function.name)
  ),
  nutritionist: TOOL_DEFINITIONS.filter((t) =>
    [
      "get_nutrition_summary", "get_active_calorie_goal", "get_weight_trend", "log_food",
    ].includes(t.function.name)
  ),
  general: TOOL_DEFINITIONS, // general agent gets everything
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

async function handleGetRecentWorkouts(userId: number, args: any): Promise<string> {
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
      (sum, ex) => sum + ex.sets * ex.reps * (ex.weight ?? 0), 0
    );
    const exerciseList = w.exercises
      .map((ex) => `${ex.exerciseName} ${ex.sets}×${ex.reps}${ex.weight ? ` @ ${ex.weight}kg` : ""}`)
      .join(", ");
    return `• ${date} — ${w.name}${w.duration ? ` (${w.duration} min)` : ""}: ${exerciseList}. Volume: ${Math.round(totalVolume)}kg`;
  });

  return `Workouts in the last ${days} days (${workouts.length} sessions):\n${lines.join("\n")}`;
}

async function handleGetNutritionSummary(userId: number, args: any): Promise<string> {
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
  const byDay: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {};
  for (const log of logs) {
    const day = log.date.toISOString().split("T")[0];
    if (!byDay[day]) byDay[day] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    byDay[day].calories += log.calories;
    byDay[day].protein  += log.protein  ?? 0;
    byDay[day].carbs    += log.carbs    ?? 0;
    byDay[day].fats     += log.fats     ?? 0;
  }

  const dayEntries = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
  const totalDays  = dayEntries.length;
  const avg = {
    calories: Math.round(dayEntries.reduce((s, [, d]) => s + d.calories, 0) / totalDays),
    protein:  Math.round(dayEntries.reduce((s, [, d]) => s + d.protein,  0) / totalDays),
    carbs:    Math.round(dayEntries.reduce((s, [, d]) => s + d.carbs,    0) / totalDays),
    fats:     Math.round(dayEntries.reduce((s, [, d]) => s + d.fats,     0) / totalDays),
  };

  const dailyLines = dayEntries.slice(0, 7).map(([date, d]) =>
    `• ${date}: ${Math.round(d.calories)} kcal | P: ${Math.round(d.protein)}g | C: ${Math.round(d.carbs)}g | F: ${Math.round(d.fats)}g`
  );

  return (
    `Nutrition over the last ${days} days (${totalDays} days tracked):\n` +
    `Averages — ${avg.calories} kcal | Protein: ${avg.protein}g | Carbs: ${avg.carbs}g | Fats: ${avg.fats}g\n\n` +
    `Daily breakdown:\n${dailyLines.join("\n")}`
  );
}

async function handleGetWeightTrend(userId: number, args: any): Promise<string> {
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
  const last  = entries[entries.length - 1];
  const delta = Math.round((last.weight - first.weight) * 100) / 100;
  const daysDiff = Math.max(1,
    (last.date.getTime() - first.date.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weeklyRate = Math.round((delta / (daysDiff / 7)) * 100) / 100;

  const direction =
    Math.abs(delta) < 0.3 ? "maintaining"
    : delta < 0 ? "losing weight"
    : "gaining weight";

  const recentLines = entries.slice(-5).map((e) =>
    `• ${e.date.toISOString().split("T")[0]}: ${e.weight} kg`
  );

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
    return `• ${t.name} (${t.splitType}, ${t.objective}): ${exerciseList}`;
  });

  return `Saved workout templates (${templates.length}):\n${lines.join("\n")}`;
}

async function handleGetPersonalRecords(userId: number, args: any): Promise<string> {
  const where: any = {
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

  const lines = records.map(
    (r) => `• ${r.exerciseName}: ${r._max.weight} kg`
  );

  return `Personal records (best weight lifted):\n${lines.join("\n")}`;
}

// ── WRITE TOOL HANDLERS ──────────────────────────────────────────────────────

async function handleLogFood(userId: number, args: any): Promise<string> {
  const {
    foodName, calories, protein = 0, carbs = 0, fats = 0,
    quantity = 1, unit = "serving", meal, date,
  } = args;

  if (!foodName || calories == null) {
    return "Cannot log food: foodName and calories are required.";
  }

  // Determine the target date (today by default)
  const targetDate = date ? new Date(date) : new Date();
  // Normalize to midnight UTC to match how other food logs are stored
  targetDate.setUTCHours(0, 0, 0, 0);

  const log = await (prisma.foodLog as any).create({
    data: {
      userId,
      foodName,
      calories: Math.round(calories),
      protein:  Math.round(protein  ?? 0),
      carbs:    Math.round(carbs    ?? 0),
      fats:     Math.round(fats     ?? 0),
      quantity: quantity ?? 1,
      unit:     unit ?? "serving",
      meal:     meal ?? null,
      date:     targetDate,
    },
  });

  // Return a summary that includes the running daily total so the AI can
  // mention it in the response without needing another tool call.
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay   = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const dayLogs = await (prisma.foodLog as any).findMany({
    where: { userId, date: { gte: startOfDay, lte: endOfDay } },
    select: { calories: true, protein: true, carbs: true, fats: true },
  });

  const totals = dayLogs.reduce(
    (acc: any, l: any) => ({
      calories: acc.calories + l.calories,
      protein:  acc.protein  + (l.protein  ?? 0),
      carbs:    acc.carbs    + (l.carbs    ?? 0),
      fats:     acc.fats     + (l.fats     ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  logger.info(`AI logged food for user ${userId}: ${foodName} (${Math.round(calories)} kcal)`);

  return (
    `✅ Logged: "${foodName}" — ${Math.round(calories)} kcal | P: ${Math.round(protein)}g | C: ${Math.round(carbs)}g | F: ${Math.round(fats)}g\n` +
    `Daily total so far: ${Math.round(totals.calories)} kcal | P: ${Math.round(totals.protein)}g | C: ${Math.round(totals.carbs)}g | F: ${Math.round(totals.fats)}g`
  );
}

async function handleSaveWorkoutTemplate(userId: number, args: any): Promise<string> {
  const {
    name, description, splitType = "Custom", objective = "general",
    dayLabel, muscleGroups = [], exercises,
  } = args;

  if (!name || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
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
      dayLabel:  dayLabel || name,
      muscleGroups: JSON.stringify(Array.isArray(muscleGroups) ? muscleGroups : []),
      aiGenerated: true,
      exercises: {
        create: exercises.map((ex: any, i: number) => ({
          exerciseName: ex.exerciseName,
          sets:         Number(ex.sets),
          reps:         String(ex.reps),
          restSeconds:  ex.restSeconds ? Number(ex.restSeconds) : null,
          notes:        ex.notes ?? null,
          order:        ex.order ?? i,
        })),
      },
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  const exerciseList = template.exercises
    .map((ex) => `${ex.exerciseName} ${ex.sets}×${ex.reps}`)
    .join(", ");

  logger.info(`AI saved workout template for user ${userId}: ${name} (${template.exercises.length} exercises)`);

  return (
    `✅ Workout template "${name}" saved to your library with ${template.exercises.length} exercises:\n` +
    exerciseList + "\n" +
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
  args: any,
  userId: number
): Promise<string> {
  logger.debug(`Tool call: ${name}(${JSON.stringify(args)})`);

  switch (name) {
    case "get_recent_workouts":     return handleGetRecentWorkouts(userId, args);
    case "get_nutrition_summary":   return handleGetNutritionSummary(userId, args);
    case "get_weight_trend":        return handleGetWeightTrend(userId, args);
    case "get_active_calorie_goal": return handleGetActiveCalorieGoal(userId);
    case "get_workout_templates":   return handleGetWorkoutTemplates(userId);
    case "get_personal_records":    return handleGetPersonalRecords(userId, args);
    case "log_food":                return handleLogFood(userId, args);
    case "save_workout_template":   return handleSaveWorkoutTemplate(userId, args);
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

// ── OpenAI error classifier ──────────────────────────────────────────────────
// Returns a user-friendly message based on the OpenAI API error type/status.
function classifyOpenAIError(error: unknown): string {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return "The request to the AI timed out. Please try again in a moment.";
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return "Unable to reach the AI service. Check your internet connection and try again.";
  }

  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    const code   = (error as any).code as string | undefined;
    const type   = (error as any).type as string | undefined;

    if (status === 429) {
      return "The AI service is temporarily rate-limited. Please wait a moment and try again.";
    }

    if (status === 503 || status === 529) {
      return "OpenAI is temporarily overloaded. Please try again in a few seconds.";
    }

    if (status === 400 && (code === "context_length_exceeded" || type === "invalid_request_error")) {
      return "This conversation is too long for the AI to process. Please start a new chat to continue.";
    }

    if (status === 400 && code === "model_not_found") {
      return "The AI model is not available right now. Please contact support.";
    }

    if (status === 401) {
      return "AI service authentication failed. Please contact support.";
    }

    if (status === 402) {
      return "AI service quota exceeded. Please contact support.";
    }

    // Generic API error with status
    return `The AI service returned an error (${status}). Please try again.`;
  }

  // Unknown error
  return "An unexpected error occurred. Please try again.";
}

export const chat = async (
  userMessage: string,
  agentType: AgentType,
  user: UserContext & { id?: number },
  history: ChatMessage[] = []
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
    logger.debug(`AI agent (${agentType}) — round ${round + 1}, ${messages.length} messages`);

    let completion: OpenAI.Chat.ChatCompletion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools,
        // "auto" means the AI decides whether to call a tool or reply directly.
        // Alternatives: "none" (never call tools), "required" (always call one).
        tool_choice: "auto",
        max_tokens: 1000,
        temperature: 0.7,
      });
    } catch (error) {
      const userFacingMsg = classifyOpenAIError(error);
      logger.error(`OpenAI API error (${agentType}, round ${round + 1}):`, error);
      // Throw a structured error the chatController can catch and return as HTTP 502
      const apiError = new Error(userFacingMsg) as any;
      apiError.statusCode = error instanceof OpenAI.APIError && error.status === 429 ? 429 : 502;
      apiError.userFacing = true;
      throw apiError;
    }

    totalTokens += completion.usage?.total_tokens ?? 0;
    const responseMessage = completion.choices[0]?.message;

    if (!responseMessage) break;

    // ── Case 1: No tool calls → the AI is done, return the text ────────────
    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      const reply = responseMessage.content
        ?? "I'm sorry, I couldn't generate a response. Please try again.";

      logger.debug(`AI agent done — ${totalTokens} total tokens, ${round + 1} round(s)`);
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
      })
    );

    // Loop again — the AI will now read the tool results and either
    // reply with text or ask for more tools.
  }

  // Safety fallback — if we hit MAX_TOOL_ROUNDS without a text response
  logger.warn(`AI agent hit MAX_TOOL_ROUNDS (${MAX_TOOL_ROUNDS}) without a final response`);
  return {
    message: "I gathered your data but ran into an issue composing a response. Please try again.",
    tokensUsed: totalTokens,
  };
};
