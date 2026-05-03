import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";

function timezoneFromHeaders(req: AuthRequest): string {
  const raw = req.headers["x-timezone"];
  const tz = Array.isArray(raw) ? raw[0] : raw;
  return typeof tz === "string" && /^[A-Za-z0-9_+\-./]+$/.test(tz)
    ? tz
    : "UTC";
}

function dayKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function mondayFor(date: Date, timezone: string): string {
  const local = new Date(`${dayKey(date, timezone)}T12:00:00Z`);
  const day = local.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setUTCDate(local.getUTCDate() + diff);
  return dayKey(local, "UTC");
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dayKey(d, "UTC");
}

function parseAdjustment(value: string | null): any | null {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

async function buildReview(userId: number, timezone: string, weekStart = mondayFor(new Date(), timezone)) {
  const weekEnd = addDays(weekStart, 6);
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(`${addDays(weekEnd, 1)}T00:00:00Z`);

  const [user, activeGoal, weights, foods, workouts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { weight: true, trainingDaysPerWeek: true, planAdjustmentMode: true },
    }),
    prisma.calorieGoal.findFirst({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
      select: {
        dailyCalories: true,
        proteinGrams: true,
        weeklyChange: true,
        targetDate: true,
        targetWeight: true,
        type: true,
      },
    }),
    prisma.weightLog.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
      select: { weight: true, date: true },
    }),
    prisma.foodLog.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { calories: true, protein: true, date: true },
    }),
    prisma.workout.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { date: true },
    }),
  ]);

  const avgWeight = weights.length
    ? Math.round((weights.reduce((s, w) => s + w.weight, 0) / weights.length) * 10) / 10
    : user?.weight ?? null;
  const foodDays = new Set(foods.map((f) => dayKey(f.date, timezone))).size || 1;
  const avgCalories = foods.reduce((s, f) => s + f.calories, 0) / foodDays;
  const avgProtein = foods.reduce((s, f) => s + (f.protein ?? 0), 0) / foodDays;
  const calorieAdherence = activeGoal?.dailyCalories
    ? Math.min(150, Math.round((avgCalories / activeGoal.dailyCalories) * 100))
    : null;
  const proteinAdherence = activeGoal?.proteinGrams
    ? Math.min(150, Math.round((avgProtein / activeGoal.proteinGrams) * 100))
    : null;
  const plannedWorkouts = user?.trainingDaysPerWeek ?? null;
  const workoutsCompleted = workouts.length;
  const workoutAdherence = plannedWorkouts
    ? Math.round((workoutsCompleted / plannedWorkouts) * 100)
    : null;

  const planStatus =
    calorieAdherence == null ? "needs_goal" :
    calorieAdherence < 75 ? "logging_or_intake_low" :
    proteinAdherence != null && proteinAdherence < 80 ? "protein_low" :
    workoutAdherence != null && workoutAdherence < 75 ? "training_incomplete" :
    "on_track";

  const recommendation =
    planStatus === "needs_goal"
      ? "Set an active calorie goal so the review can compare this week against a plan."
      : planStatus === "logging_or_intake_low"
        ? "Do not adjust the goal yet; improve calorie consistency or logging first."
        : planStatus === "protein_low"
          ? "Bring protein closer to target before changing calories."
          : planStatus === "training_incomplete"
            ? "Prioritize completing the planned sessions before changing the nutrition target."
            : "Hold the current plan for another week.";

  const recommendedAdjustment = {
    action: planStatus === "on_track" ? "hold" : "improve_adherence",
    calorieDelta: 0,
    suggestedTargetDate: null,
    mode: user?.planAdjustmentMode ?? "suggest",
    reason: recommendation,
    canAutoApply: false,
  };

  return {
    userId,
    weekStart,
    weekEnd,
    averageWeight: avgWeight,
    calorieAdherence,
    proteinAdherence,
    workoutsCompleted,
    plannedWorkouts,
    performanceTrend: workoutAdherence == null ? "unknown" : workoutAdherence >= 90 ? "aligned" : "incomplete",
    planStatus,
    recommendation,
    recommendedAdjustment,
  };
}

export const getCurrentWeeklyReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const timezone = timezoneFromHeaders(req);
    const computed = await buildReview(req.user!.id, timezone);
    const saved = await (prisma as any).weeklyReview.findUnique({
      where: { userId_weekStart: { userId: req.user!.id, weekStart: computed.weekStart } },
    });
    res.json({
      review: saved
        ? { ...saved, recommendedAdjustment: parseAdjustment(saved.recommendedAdjustment) }
        : computed,
      computed,
    });
  } catch (error) {
    next(error);
  }
};

export const getWeeklyReviewHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviews = await (prisma as any).weeklyReview.findMany({
      where: { userId: req.user!.id },
      orderBy: { weekStart: "desc" },
      take: 12,
    });
    res.json({
      reviews: reviews.map((r: any) => ({
        ...r,
        recommendedAdjustment: parseAdjustment(r.recommendedAdjustment),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const saveWeeklyReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const timezone = timezoneFromHeaders(req);
    const computed = await buildReview(req.user!.id, timezone);
    const body = req.body ?? {};
    const clamp = (v: unknown) =>
      v == null || v === "" ? null : Math.min(5, Math.max(1, Number(v)));

    const review = await (prisma as any).weeklyReview.upsert({
      where: { userId_weekStart: { userId: req.user!.id, weekStart: computed.weekStart } },
      update: {
        ...computed,
        recommendedAdjustment: JSON.stringify(computed.recommendedAdjustment),
        fatigue: clamp(body.fatigue),
        soreness: clamp(body.soreness),
        hunger: clamp(body.hunger),
        sleepQuality: clamp(body.sleepQuality),
        stress: clamp(body.stress),
        perceivedPerformance: clamp(body.perceivedPerformance),
      },
      create: {
        ...computed,
        recommendedAdjustment: JSON.stringify(computed.recommendedAdjustment),
        fatigue: clamp(body.fatigue),
        soreness: clamp(body.soreness),
        hunger: clamp(body.hunger),
        sleepQuality: clamp(body.sleepQuality),
        stress: clamp(body.stress),
        perceivedPerformance: clamp(body.perceivedPerformance),
      },
    });

    res.status(201).json({
      review: { ...review, recommendedAdjustment: parseAdjustment(review.recommendedAdjustment) },
    });
  } catch (error) {
    next(error);
  }
};

export const applyWeeklyReviewAdjustment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const review = await (prisma as any).weeklyReview.findFirst({
      where: { id: Number(req.params.id), userId: req.user!.id },
    });
    if (!review) return next(createError("Weekly review not found", 404));

    await (prisma as any).weeklyReview.update({
      where: { id: review.id },
      data: { adjustmentStatus: "applied" },
    });

    res.json({ message: "Weekly review adjustment marked as applied" });
  } catch (error) {
    next(error);
  }
};
