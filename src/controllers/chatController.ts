import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { chat, ChatMessage } from "../ai/agent.js";
import { AgentType } from "../ai/prompts.js";
import { calculateCalorieGoal } from "../lib/calorieCalculator.js";
import logger from "../lib/logger.js";

const VALID_AGENTS: AgentType[] = ["coach", "nutritionist", "general"];

// POST /api/chat
export const sendMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { message, agentType = "general" } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return next(createError("message is required", 400));
    }

    if (!VALID_AGENTS.includes(agentType)) {
      return next(createError(`agentType must be one of: ${VALID_AGENTS.join(", ")}`, 400));
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
      history
    );

    // Save conversation to DB
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user!.id,
        role: "user",
        message: message.trim(),
        response: aiResponse,
        agentType,
      },
    });

    logger.info(`Chat (${agentType}) — user ${req.user!.id} — ${tokensUsed} tokens`);

    res.json({
      message: aiResponse,
      agentType,
      conversationId: conversation.id,
      tokensUsed,
    });
  } catch (error: any) {
    // Handle OpenAI API errors gracefully
    if (error?.status === 401) {
      return next(createError("OpenAI API key is invalid or not configured", 503));
    }
    if (error?.status === 429) {
      return next(createError("AI service is currently rate limited, please try again shortly", 503));
    }
    next(error);
  }
};

// GET /api/chat/history
export const getHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const agentType = req.query.agentType as string | undefined;
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;

    const where: any = { userId: req.user!.id };
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

    res.json({
      conversations: conversations.reverse(), // chronological order
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
  next: NextFunction
): Promise<void> => {
  try {
    const agentType = req.query.agentType as string | undefined;
    const where: any = { userId: req.user!.id };

    if (agentType && VALID_AGENTS.includes(agentType as AgentType)) {
      where.agentType = agentType;
    }

    const { count } = await prisma.conversation.deleteMany({ where });
    res.json({ message: `Cleared ${count} conversation entries` });
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
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, splitType = "Custom", objective = "general",
            frequency = 3, dayLabel, muscleGroups = [], exercises } = req.body;

    if (!name || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return next(createError("name and exercises array are required", 400));
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
        exercises: {
          create: exercises.map((ex: any, i: number) => ({
            exerciseName: ex.exerciseName,
            sets: Number(ex.sets),
            reps: String(ex.reps),
            restSeconds: ex.restSeconds ? Number(ex.restSeconds) : null,
            notes: ex.notes || null,
            order: ex.order ?? i,
          })),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    logger.info(`AI workout saved as template by user ${req.user!.id}: ${name}`);
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
  next: NextFunction
): Promise<void> => {
  try {
    const { name, currentWeight, targetWeight, targetDate,
            dailyCalories, proteinGrams, carbsGrams, fatsGrams, notes } = req.body;

    if (!currentWeight || !targetWeight || !targetDate) {
      return next(createError("currentWeight, targetWeight, and targetDate are required", 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { age: true, height: true, activityLevel: true },
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
        activityLevel: user?.activityLevel,
      });
      macros = { dailyCalories: calc.dailyCalories, proteinGrams: calc.proteinGrams, carbsGrams: calc.carbsGrams, fatsGrams: calc.fatsGrams };
    }

    const weightDiff = Number(targetWeight) - Number(currentWeight);
    const type = weightDiff < -0.5 ? "cut" : weightDiff > 0.5 ? "bulk" : "maintain";
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeks = Math.max(1, (new Date(targetDate).getTime() - today.getTime()) / msPerWeek);
    const weeklyChange = Math.round((weightDiff / weeks) * 100) / 100;

    // Deactivate current active goals
    await prisma.calorieGoal.updateMany({
      where: { userId: req.user!.id, active: true },
      data: { active: false },
    });

    const goal = await prisma.calorieGoal.create({
      data: {
        userId: req.user!.id,
        name: name || `AI Suggested ${type === "cut" ? "Cut" : type === "bulk" ? "Bulk" : "Maintain"} Plan`,
        type,
        currentWeight: Number(currentWeight),
        targetWeight: Number(targetWeight),
        targetDate: new Date(targetDate),
        dailyCalories: Number(macros.dailyCalories),
        proteinGrams: Number(macros.proteinGrams),
        carbsGrams: Number(macros.carbsGrams),
        fatsGrams: Number(macros.fatsGrams),
        weeklyChange,
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
