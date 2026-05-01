import { Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { chat, ChatMessage } from "../ai/agent.js";
import {
  AgentType,
  extractWorkoutJson,
  extractNutritionJson,
  extractMealPlanJson,
} from "../ai/prompts.js";
import { calculateCalorieGoal } from "../lib/calorieCalculator.js";
import logger from "../lib/logger.js";

const VALID_AGENTS: AgentType[] = ["coach", "nutritionist", "general"];

// ── Local types ───────────────────────────────────────────────────────────────

interface MealItem {
  foodName: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  quantity?: number;
  unit?: string;
}

interface MealBlock { meal: string; items?: MealItem[] }
interface DayBlock   { dayIndex: number; meals?: MealBlock[] }

interface MealPlanPayload {
  days?:  DayBlock[];
  meals?: MealBlock[];
}

interface EntryRow {
  meal: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity: number;
  unit: string;
}

interface ChatExercise {
  exerciseName: string;
  sets: number;
  reps: string | number;
  restSeconds?: number;
  notes?: string;
  order?: number;
}

const parseMondayDate = (date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
};

const mondayDayIndex = (date = new Date()): number => {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};

const normalizeMealPlanDays = (
  payload: MealPlanPayload,
): Array<{ dayIndex: number; meals: MealBlock[] }> => {
  if (Array.isArray(payload.days) && payload.days.length > 0) {
    return payload.days.map((day) => ({
      dayIndex: Number(day.dayIndex),
      meals: Array.isArray(day.meals) ? day.meals : [],
    }));
  }

  if (Array.isArray(payload.meals) && payload.meals.length > 0) {
    return [{ dayIndex: mondayDayIndex(), meals: payload.meals }];
  }

  return [];
};

// POST /api/chat
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { message, agentType = "general" } = req.body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return next(createError("message is required", 400));
    }

    if (!VALID_AGENTS.includes(agentType)) {
      return next(
        createError(
          `agentType must be one of: ${VALID_AGENTS.join(", ")}`,
          400,
        ),
      );
    }

    // Load user profile for context
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        username: true,
        age: true,
        weight: true,
        height: true,
        fitnessLevel: true,
        goal: true,
        sex: true,
        activityLevel: true,
        proteinMultiplier: true,
        trainingDaysPerWeek: true,
        trainingHoursPerDay: true,
        injuries: true,
        waterTargetMl: true,
        id: true,
      },
    });

    if (!user) {
      return next(createError("User not found", 404));
    }

    // Load recent conversation history for context
    const recentHistory = await prisma.conversation.findMany({
      where: { userId: req.user!.id, agentType },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Build history array in chronological order
    const history: ChatMessage[] = [];
    for (const entry of recentHistory.reverse()) {
      history.push({ role: "user", content: entry.message });
      if (entry.response) {
        history.push({ role: "assistant", content: entry.response });
      }
    }

    // Call the AI agent
    const { message: aiResponse, tokensUsed } = await chat(
      message.trim(),
      agentType as AgentType,
      user,
      history,
    );

    // Extract structured JSON blocks from the AI response so the frontend
    // can render "Save as Template" / "Save as Goal" buttons without parsing raw text.
    const suggestedWorkout = extractWorkoutJson(aiResponse);
    const suggestedPlan = extractNutritionJson(aiResponse);
    const suggestedMealPlan = extractMealPlanJson(aiResponse);

    // Build metadata object to persist alongside the conversation so save
    // buttons are still available when the user reloads chat history.
    const metadataObj: Record<string, unknown> = {};
    if (suggestedWorkout) metadataObj.suggestedWorkout = suggestedWorkout;
    if (suggestedPlan) metadataObj.suggestedPlan = suggestedPlan;
    if (suggestedMealPlan) metadataObj.suggestedMealPlan = suggestedMealPlan;
    const metadataJson =
      Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null;

    // Save conversation to DB
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.id,
        role: "user",
        message: message.trim(),
        response: aiResponse,
        agentType,
        ...(metadataJson && { metadata: metadataJson }),
      },
    });

    logger.info(
      `Chat (${agentType}) — user ${req.user!.id} — ${tokensUsed} tokens`,
    );

    res.json({
      message: aiResponse,
      agentType,
      conversationId: conversation.id,
      tokensUsed,
      ...(suggestedWorkout && { suggestedWorkout }),
      ...(suggestedPlan && { suggestedPlan }),
      ...(suggestedMealPlan && { suggestedMealPlan }),
    });
  } catch (error: unknown) {
    // User-facing errors thrown by the agent's classifyOpenAIError helper
    if (error instanceof Error && (error as Error & { userFacing?: boolean }).userFacing) {
      const status = (error as Error & { statusCode?: number }).statusCode ?? 502;
      return next(createError(error.message, status));
    }
    // Legacy OpenAI SDK status checks (belt-and-suspenders)
    if (error instanceof Error && (error as Error & { status?: number }).status === 401) {
      return next(
        createError("OpenAI API key is invalid or not configured", 503),
      );
    }
    if (error instanceof Error && (error as Error & { status?: number }).status === 429) {
      return next(
        createError(
          "AI service is currently rate limited, please try again shortly",
          429,
        ),
      );
    }
    next(error);
  }
};

// GET /api/chat/history
export const getHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const agentType = req.query.agentType as string | undefined;
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;

    const where: Prisma.ConversationWhereInput = { userId: req.user!.id };
    if (agentType && VALID_AGENTS.includes(agentType as AgentType)) {
      where.agentType = agentType;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    // Parse metadata JSON for each conversation so the frontend can hydrate
    // save buttons from history without re-querying the AI.
    const conversationsWithMeta = conversations.reverse().map((c) => ({
      ...c,
      metadata: c.metadata
        ? (() => {
            try {
              return JSON.parse(c.metadata!);
            } catch {
              return null;
            }
          })()
        : null,
    }));

    res.json({
      conversations: conversationsWithMeta,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/chat/history — clear conversation history
export const clearHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const agentType = req.query.agentType as string | undefined;
    const where: Prisma.ConversationWhereInput = { userId: req.user!.id };

    if (agentType && VALID_AGENTS.includes(agentType as AgentType)) {
      where.agentType = agentType;
    }

    const { count } = await prisma.conversation.deleteMany({ where });
    res.json({ message: `Cleared ${count} conversation entries` });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/chat/ai-status ───────────────────────────────────────────────────
// Returns whether the OpenAI API key is configured (without exposing it).
export const getAiStatus = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const key = process.env.OPENAI_API_KEY ?? "";
    const configured = key.length > 0 && !key.startsWith("sk-your");
    const masked = configured ? `${key.slice(0, 8)}...${key.slice(-4)}` : null;
    res.json({ configured, masked, model: "gpt-4o-mini" });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/chat/save-workout ───────────────────────────────────────────────
// The frontend sends an AI-suggested workout payload to save as a template.
// The AI response in chat should include a structured JSON block that the
// frontend parses and POSTs here.
export const saveWorkoutFromChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      mode = "create",
      targetTemplateId,
      name,
      description,
      splitType = "Custom",
      objective = "general",
      frequency = 3,
      dayLabel,
      muscleGroups = [],
      exercises,
    } = req.body;

    if (
      !name ||
      !exercises ||
      !Array.isArray(exercises) ||
      exercises.length === 0
    ) {
      return next(createError("name and exercises array are required", 400));
    }

    const exerciseCreates = exercises.map((ex: ChatExercise, i: number) => ({
      exerciseName: ex.exerciseName,
      sets: Number(ex.sets),
      reps: String(ex.reps),
      restSeconds: ex.restSeconds ? Number(ex.restSeconds) : null,
      notes: ex.notes || null,
      order: ex.order ?? i,
    }));

    if (mode === "replace") {
      if (!targetTemplateId) {
        return next(
          createError(
            "targetTemplateId is required when replacing a workout template",
            400,
          ),
        );
      }

      const existing = await prisma.workoutTemplate.findFirst({
        where: { id: Number(targetTemplateId), userId: req.user!.id },
      });
      if (!existing)
        return next(createError("Workout template not found", 404));

      const template = await prisma.$transaction(async (tx) => {
        await tx.templateExercise.deleteMany({
          where: { templateId: Number(targetTemplateId) },
        });
        return tx.workoutTemplate.update({
          where: { id: Number(targetTemplateId) },
          data: {
            name,
            description: description || "Updated by AI Coach",
            splitType,
            objective,
            frequency: Number(frequency),
            dayLabel: dayLabel || name,
            muscleGroups: JSON.stringify(muscleGroups),
            aiGenerated: true,
            exercises: { create: exerciseCreates },
          },
          include: { exercises: { orderBy: { order: "asc" } } },
        });
      });

      logger.info(
        `AI workout template replaced by user ${req.user!.id}: ${name}`,
      );
      res.json({ message: "Workout template updated", template });
      return;
    }

    const template = await prisma.workoutTemplate.create({
      data: {
        userId: req.user!.id,
        name,
        description: description || "Suggested by AI Coach",
        splitType,
        objective,
        frequency: Number(frequency),
        dayLabel: dayLabel || name,
        muscleGroups: JSON.stringify(muscleGroups),
        aiGenerated: true,
        exercises: { create: exerciseCreates },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    logger.info(
      `AI workout saved as template by user ${req.user!.id}: ${name}`,
    );
    res.status(201).json({ message: "Workout saved as template", template });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/chat/save-calorie-plan ──────────────────────────────────────────
// Save a calorie plan suggested by the AI coach as an active CalorieGoal.
export const saveCaloriePlanFromChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      name,
      currentWeight,
      targetWeight,
      targetDate,
      dailyCalories,
      proteinGrams,
      carbsGrams,
      fatsGrams,
      notes,
    } = req.body;

    if (!currentWeight || !targetWeight || !targetDate) {
      return next(
        createError(
          "currentWeight, targetWeight, and targetDate are required",
          400,
        ),
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        age: true,
        height: true,
        sex: true,
        activityLevel: true,
        proteinMultiplier: true,
        trainingDaysPerWeek: true,
        trainingHoursPerDay: true,
      },
    });

    // If macros provided by AI use them, otherwise auto-calculate
    let macros = { dailyCalories, proteinGrams, carbsGrams, fatsGrams };
    if (!dailyCalories) {
      const calc = calculateCalorieGoal({
        currentWeight: Number(currentWeight),
        targetWeight: Number(targetWeight),
        targetDate: new Date(targetDate),
        age: user?.age,
        height: user?.height,
        sex: user?.sex,
        activityLevel: user?.activityLevel,
        proteinMultiplier: user?.proteinMultiplier,
        trainingDaysPerWeek: user?.trainingDaysPerWeek,
        trainingHoursPerDay: user?.trainingHoursPerDay,
      });
      macros = {
        dailyCalories: calc.dailyCalories,
        proteinGrams: calc.proteinGrams,
        carbsGrams: calc.carbsGrams,
        fatsGrams: calc.fatsGrams,
      };
    }

    const weightDiff = Number(targetWeight) - Number(currentWeight);
    const type =
      weightDiff < -0.5 ? "cut" : weightDiff > 0.5 ? "bulk" : "maintain";
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeks = Math.max(
      1,
      (new Date(targetDate).getTime() - today.getTime()) / msPerWeek,
    );
    const weeklyChange = Math.round((weightDiff / weeks) * 100) / 100;

    // Deactivate current active goals
    await prisma.calorieGoal.updateMany({
      where: { userId: req.user!.id, active: true },
      data: { active: false },
    });

    const goal = await prisma.calorieGoal.create({
      data: {
        userId: req.user!.id,
        name:
          name ||
          `AI Suggested ${type === "cut" ? "Cut" : type === "bulk" ? "Bulk" : "Maintain"} Plan`,
        type,
        currentWeight: Number(currentWeight),
        targetWeight: Number(targetWeight),
        targetDate: new Date(targetDate),
        dailyCalories: Number(macros.dailyCalories),
        proteinGrams: Number(macros.proteinGrams),
        carbsGrams: Number(macros.carbsGrams),
        fatsGrams: Number(macros.fatsGrams),
        weeklyChange,
        tdee: Number(macros.dailyCalories), // AI-provided value used as TDEE estimate
        aiGenerated: true,
        notes: notes || null,
      },
    });

    logger.info(`AI calorie plan saved for user ${req.user!.id}: ${goal.name}`);
    res.status(201).json({ message: "Calorie plan saved", goal });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/chat/save-meal-plan ────────────────────────────────────────────
// Apply an AI-suggested Meal Planner proposal after explicit user confirmation.
export const saveMealPlanFromChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { mode = "create", targetPlanId, name, weekStart } = req.body;
    const normalizedDays = normalizeMealPlanDays(req.body);
    if (normalizedDays.length === 0) {
      return next(createError("At least one meal-plan day is required", 400));
    }

    const entriesByDay = new Map<number, EntryRow[]>();
    for (const day of normalizedDays) {
      const dayIndex = Number(day.dayIndex);
      const entries = (day.meals ?? []).flatMap((meal: MealBlock) =>
        (meal.items ?? []).map((item: MealItem): EntryRow => ({
          meal: meal.meal,
          foodName: item.foodName,
          calories: Number(item.calories ?? 0),
          protein: Number(item.protein ?? 0),
          carbs: Number(item.carbs ?? 0),
          fats: Number(item.fats ?? 0),
          quantity: Number(item.quantity ?? 1),
          unit: item.unit ?? "serving",
        })),
      );
      entriesByDay.set(dayIndex, entries);
    }

    if (mode === "replace" || mode === "append") {
      if (!targetPlanId) {
        return next(
          createError(
            "targetPlanId is required when updating an existing meal plan",
            400,
          ),
        );
      }

      const existing = await prisma.mealPlan.findFirst({
        where: { id: Number(targetPlanId), userId: req.user!.id },
        include: { days: true },
      });
      if (!existing) return next(createError("Meal plan not found", 404));

      const plan = await prisma.$transaction(async (tx) => {
        if (mode === "replace") {
          await tx.mealPlanEntry.deleteMany({
            where: { day: { planId: Number(targetPlanId) } },
          });
          await tx.mealPlan.update({
            where: { id: Number(targetPlanId) },
            data: { ...(name && { name }) },
          });
        }

        for (const day of existing.days) {
          const entries = entriesByDay.get(day.dayIndex) ?? [];
          if (entries.length > 0) {
            await tx.mealPlanEntry.createMany({
              data: entries.map((entry: EntryRow, i: number) => ({
                ...entry,
                dayId: day.id,
                order: i,
              })),
            });
          }
        }

        return tx.mealPlan.findFirst({
          where: { id: Number(targetPlanId), userId: req.user!.id },
          include: {
            days: {
              orderBy: { dayIndex: "asc" },
              include: {
                entries: { orderBy: [{ meal: "asc" }, { order: "asc" }] },
              },
            },
          },
        });
      });

      logger.info(
        `AI meal plan ${mode} by user ${req.user!.id}: ${plan?.name}`,
      );
      res.json({
        message: `Meal plan ${mode === "replace" ? "updated" : "appended"}`,
        plan,
      });
      return;
    }

    const plan = await prisma.mealPlan.create({
      data: {
        userId: req.user!.id,
        name: name || "AI Suggested Meal Plan",
        weekStart: weekStart || parseMondayDate(),
        days: {
          create: Array.from({ length: 7 }, (_, dayIndex) => ({
            dayIndex,
            entries: {
              create: (entriesByDay.get(dayIndex) ?? []).map(
                (entry: EntryRow, i: number) => ({
                  ...entry,
                  order: i,
                }),
              ),
            },
          })),
        },
      },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: {
            entries: { orderBy: [{ meal: "asc" }, { order: "asc" }] },
          },
        },
      },
    });

    logger.info(`AI meal plan saved by user ${req.user!.id}: ${plan.name}`);
    res.status(201).json({ message: "Meal plan saved", plan });
  } catch (error) {
    next(error);
  }
};
