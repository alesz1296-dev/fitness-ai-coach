import crypto from "crypto";
import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { writeAuditLog } from "../lib/audit.js";

const db = prisma as any;

type CoachProposalPayload = {
  mode?: "quick" | "custom" | "existing" | "scratch";
  weekdays?: number[];
  months?: number;
  durationWeeks?: number;
  overwrite?: boolean;
  days?: Array<{
    date: string;
    workoutName?: string;
    muscleGroups?: string[];
    templateId?: number | null;
    isRestDay?: boolean;
    notes?: string;
  }>;
  mealPlan?: {
    name: string;
    weekStart: string;
    durationWeeks: number;
    days: Array<{
      dayIndex: number;
      meals: Array<{
        meal: "breakfast" | "lunch" | "dinner" | "snack";
        items: Array<{
          foodName: string;
          calories?: number;
          protein?: number;
          carbs?: number;
          fats?: number;
          quantity?: number;
          unit?: string;
        }>;
      }>;
    }>;
  };
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getMonthRange(startMonth: string, count: number): string[] {
  const [year, month] = startMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

async function ensureCoachClientAccess(coachId: number, clientId: number) {
  const link = await db.coachClientLink.findFirst({
    where: { coachId, clientId, status: "active" },
  });
  if (!link) throw createError("Client relationship not found", 404);
  return link;
}

async function applyWorkoutSchedule(
  clientId: number,
  templateId: number,
  workoutName: string,
  muscleGroups: string[],
  payload: { weekdays?: number[]; months?: number; overwrite?: boolean } | null,
) {
  const weekdays = Array.isArray(payload?.weekdays) && payload!.weekdays!.length > 0
    ? payload!.weekdays!
    : [0];
  const months = Math.min(3, Math.max(1, Number(payload?.months ?? 1)));
  const overwrite = Boolean(payload?.overwrite);
  const startMonth = new Date().toISOString().slice(0, 7);

  for (const month of getMonthRange(startMonth, months)) {
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const existing = new Set<string>();
    if (!overwrite) {
      const rows = await db.workoutCalendarDay.findMany({
        where: {
          userId: clientId,
          date: {
            gte: `${month}-01`,
            lte: `${month}-${String(lastDay).padStart(2, "0")}`,
          },
        },
        select: { date: true },
      });
      rows.forEach((r: { date: string }) => existing.add(r.date));
    }
    for (let day = 1; day <= lastDay; day++) {
      const dateObj = new Date(year, mon - 1, day);
      const isoDay = (dateObj.getDay() + 6) % 7;
      if (!weekdays.includes(isoDay)) continue;
      const date = `${month}-${String(day).padStart(2, "0")}`;
      if (!overwrite && existing.has(date)) continue;
      await db.workoutCalendarDay.upsert({
        where: { userId_date: { userId: clientId, date } },
        update: {
          workoutName,
          muscleGroups: JSON.stringify(muscleGroups),
          templateId,
          isRestDay: false,
          updatedAt: new Date(),
        },
        create: {
          userId: clientId,
          date,
          workoutName,
          muscleGroups: JSON.stringify(muscleGroups),
          templateId,
          isRestDay: false,
        },
      });
    }
  }
}

async function applyCustomWorkoutSchedule(
  clientId: number,
  payload: CoachProposalPayload | null,
) {
  const days = Array.isArray(payload?.days) ? payload!.days! : [];
  if (days.length === 0) throw createError("No custom workout days provided", 400);
  const overwrite = Boolean(payload?.overwrite);
  let appliedCount = 0;

  for (const day of days) {
    if (!overwrite) {
      const existing = await db.workoutCalendarDay.findUnique({
        where: { userId_date: { userId: clientId, date: day.date } },
        select: { id: true },
      });
      if (existing) continue;
    }

    await db.workoutCalendarDay.upsert({
      where: { userId_date: { userId: clientId, date: day.date } },
      update: {
        workoutName: day.isRestDay ? null : day.workoutName,
        muscleGroups: JSON.stringify(day.muscleGroups ?? []),
        templateId: day.templateId ?? null,
        isRestDay: Boolean(day.isRestDay),
        notes: day.notes ?? null,
        updatedAt: new Date(),
      },
      create: {
        userId: clientId,
        date: day.date,
        workoutName: day.isRestDay ? null : day.workoutName,
        muscleGroups: JSON.stringify(day.muscleGroups ?? []),
        templateId: day.templateId ?? null,
        isRestDay: Boolean(day.isRestDay),
        notes: day.notes ?? null,
      },
    });
    appliedCount += 1;
  }

  return appliedCount;
}

function normalizeDurationWeeks(value: unknown, fallback: number) {
  return Math.min(52, Math.max(1, Number(value ?? fallback)));
}

function buildMealPlanDaysFromPattern(payload: NonNullable<CoachProposalPayload["mealPlan"]>) {
  const durationWeeks = normalizeDurationWeeks(payload.durationWeeks, 1);
  const pattern = payload.days.length > 0 ? payload.days : [{ dayIndex: 0, meals: [] }];

  return Array.from({ length: durationWeeks * 7 }, (_, dayIndex) => {
    const sourceDay =
      pattern.find((day) => day.dayIndex === dayIndex % 7) ?? pattern[dayIndex % pattern.length];
    const entries = (sourceDay?.meals ?? []).flatMap((meal) =>
      meal.items.map((item, order) => ({
        meal: meal.meal,
        foodName: item.foodName,
        calories: Number(item.calories ?? 0),
        protein: Number(item.protein ?? 0),
        carbs: Number(item.carbs ?? 0),
        fats: Number(item.fats ?? 0),
        quantity: Number(item.quantity ?? 1),
        unit: item.unit ?? "serving",
        order,
      })),
    );

    return { dayIndex, entries: { create: entries } };
  });
}

function buildClonedMealPlanDays(sourceDays: any[], durationWeeks: number) {
  const pattern = sourceDays.length > 0 ? sourceDays : [{ entries: [] }];
  return Array.from({ length: durationWeeks * 7 }, (_, dayIndex) => {
    const sourceDay = pattern[dayIndex % pattern.length];
    return {
      dayIndex,
      notes: sourceDay?.notes ?? null,
      entries: {
        create: (sourceDay?.entries ?? []).map((entry: any) => ({
          meal: entry.meal,
          foodName: entry.foodName,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fats: entry.fats,
          quantity: entry.quantity,
          unit: entry.unit,
          order: entry.order,
        })),
      },
    };
  });
}

export const getMyClients = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const links = await db.coachClientLink.findMany({
      where: { coachId: req.user!.id, status: "active" },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            weight: true,
            goal: true,
            trainingDaysPerWeek: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ clients: links });
  } catch (error) {
    next(error);
  }
};

export const createInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const expiresInDays = Number(req.body.expiresInDays ?? 7);
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const invite = await db.coachInvite.create({
      data: {
        coachId: req.user!.id,
        code,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      },
    });
    await writeAuditLog({
      req,
      action: "coach.invite.created",
      targetType: "coach_invite",
      targetId: invite.id,
      metadata: { code: invite.code, expiresInDays },
    });
    res.status(201).json({ invite });
  } catch (error) {
    next(error);
  }
};

export const acceptInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code } = req.body;
    const invite = await db.coachInvite.findFirst({
      where: { code, status: "invited" },
    });
    if (!invite) return next(createError("Invite not found", 404));
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return next(createError("Invite expired", 400));
    }
    if (invite.coachId === req.user!.id) {
      return next(createError("You cannot accept your own coach invite", 400));
    }
    await prisma.$transaction(async (tx) => {
      await (tx as any).coachInvite.update({
        where: { id: invite.id },
        data: {
          status: "active",
          usedByClientId: req.user!.id,
          updatedAt: new Date(),
        },
      });
      await (tx as any).coachClientLink.upsert({
        where: {
          coachId_clientId: {
            coachId: invite.coachId,
            clientId: req.user!.id,
          },
        },
        update: { status: "active", updatedAt: new Date() },
        create: {
          coachId: invite.coachId,
          clientId: req.user!.id,
          status: "active",
        },
      });
    });
    await writeAuditLog({
      req,
      action: "coach.invite.accepted",
      targetType: "coach_invite",
      targetId: invite.id,
      targetUserId: req.user!.id,
      metadata: { coachId: invite.coachId },
    });
    res.json({ message: "Coach link activated" });
  } catch (error) {
    next(error);
  }
};

export const getClientOverview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const clientId = Number(req.params.clientId);
    await ensureCoachClientAccess(req.user!.id, clientId);
    const [client, recentWorkouts, activeGoal, weightLogs, foods, plans, proposals] =
      await Promise.all([
        db.user.findUnique({
          where: { id: clientId },
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            weight: true,
            height: true,
            goal: true,
            fitnessLevel: true,
            activityLevel: true,
            trainingDaysPerWeek: true,
            trainingHoursPerDay: true,
            createdAt: true,
          },
        }),
        prisma.workout.findMany({
          where: { userId: clientId },
          include: { exercises: true },
          orderBy: { date: "desc" },
          take: 8,
        }),
        prisma.calorieGoal.findFirst({
          where: { userId: clientId, active: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.weightLog.findMany({
          where: { userId: clientId },
          orderBy: { date: "desc" },
          take: 14,
        }),
        prisma.foodLog.findMany({
          where: { userId: clientId },
          orderBy: { date: "desc" },
          take: 20,
        }),
        db.mealPlan.findMany({
          where: { userId: clientId },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        db.coachProposal.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    const nutritionSummary = foods.reduce(
      (acc: { calories: number; protein: number }, row: any) => {
        acc.calories += Number(row.calories ?? 0);
        acc.protein += Number(row.protein ?? 0);
        return acc;
      },
      { calories: 0, protein: 0 },
    );

    res.json({
      client,
      recentWorkouts,
      activeGoal,
      weightLogs,
      nutritionSummary,
      plans,
      proposals,
    });
  } catch (error) {
    next(error);
  }
};

export const createProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { clientId, type, sourceId = 0, note, payload } = req.body as {
      clientId: number;
      type: "workout" | "meal" | "goal";
      sourceId?: number;
      note?: string;
      payload?: CoachProposalPayload;
    };
    await ensureCoachClientAccess(req.user!.id, Number(clientId));

    if (type === "workout") {
      if (payload?.mode === "custom") {
        if (!Array.isArray(payload.days) || payload.days.length === 0) {
          return next(createError("Custom workout days are required", 400));
        }
      } else {
        const template = await prisma.workoutTemplate.findFirst({
          where: {
            id: Number(sourceId),
            OR: [{ userId: req.user!.id }, { isSystem: true }],
          },
        });
        if (!template) return next(createError("Workout template not found", 404));
      }
    } else if (type === "meal") {
      if (payload?.mode === "scratch") {
        if (!payload.mealPlan) return next(createError("Meal plan payload is required", 400));
      } else {
        const plan = await db.mealPlan.findFirst({
          where: { id: Number(sourceId), userId: req.user!.id },
        });
        if (!plan) return next(createError("Meal plan not found", 404));
      }
    } else if (type === "goal") {
      const goal = await prisma.calorieGoal.findFirst({
        where: { id: Number(sourceId), userId: req.user!.id },
      });
      if (!goal) return next(createError("Calorie goal not found", 404));
    }

    const proposal = await db.coachProposal.create({
      data: {
        coachId: req.user!.id,
        clientId: Number(clientId),
        type,
        sourceId: Number(sourceId),
        note: note || null,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });
    await writeAuditLog({
      req,
      action: "coach.proposal.created",
      targetType: "coach_proposal",
      targetId: proposal.id,
      targetUserId: Number(clientId),
      metadata: { type, sourceId: Number(sourceId) },
    });
    res.status(201).json({ proposal });
  } catch (error) {
    next(error);
  }
};

export const listProposalsForClient = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const clientId = Number(req.params.clientId);
    await ensureCoachClientAccess(req.user!.id, clientId);
    const proposals = await db.coachProposal.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ proposals });
  } catch (error) {
    next(error);
  }
};

export const listMyPendingProposals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const proposals = await db.coachProposal.findMany({
      where: { clientId: req.user!.id, status: "pending" },
      include: {
        coach: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ proposals });
  } catch (error) {
    next(error);
  }
};

export const actOnProposal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const proposalId = Number(req.params.id);
    const { action } = req.body as { action: "accept" | "reject" };
    const proposal = await db.coachProposal.findFirst({
      where: { id: proposalId, clientId: req.user!.id },
    });
    if (!proposal) return next(createError("Proposal not found", 404));
    if (proposal.status !== "pending") {
      return next(createError("Proposal already handled", 400));
    }

    if (action === "reject") {
      const updated = await db.coachProposal.update({
        where: { id: proposalId },
        data: { status: "rejected", rejectedAt: new Date(), updatedAt: new Date() },
      });
      await writeAuditLog({
        req,
        action: "coach.proposal.rejected",
        targetType: "coach_proposal",
        targetId: proposalId,
        targetUserId: req.user!.id,
        metadata: { type: proposal.type },
      });
      res.json({ proposal: updated });
      return;
    }

    const payload = parseJson<CoachProposalPayload | null>(
      proposal.payload,
      null,
    );

    const result = await prisma.$transaction(async (tx) => {
      let appliedId: number | null = null;

      if (proposal.type === "workout") {
        if (payload?.mode === "custom") {
          const appliedCount = await applyCustomWorkoutSchedule(req.user!.id, payload);
          return (tx as any).coachProposal.update({
            where: { id: proposal.id },
            data: {
              status: "accepted",
              acceptedAt: new Date(),
              updatedAt: new Date(),
              appliedId: appliedCount,
            },
          });
        }

        const source = await tx.workoutTemplate.findFirst({
          where: { id: proposal.sourceId },
          include: { exercises: { orderBy: { order: "asc" } } },
        });
        if (!source) throw createError("Source workout template not found", 404);
        const template = await (tx.workoutTemplate as any).create({
          data: {
            userId: req.user!.id,
            name: source.name,
            description: source.description,
            splitType: source.splitType,
            objective: source.objective,
            frequency: source.frequency,
            dayLabel: source.dayLabel,
            muscleGroups: source.muscleGroups,
            aiGenerated: false,
            provenanceRole: "coach",
            provenanceSourceUserId: proposal.coachId,
            sourceProposalId: proposal.id,
            exercises: {
              create: source.exercises.map((ex) => ({
                exerciseName: ex.exerciseName,
                sets: ex.sets,
                reps: ex.reps,
                restSeconds: ex.restSeconds,
                notes: ex.notes,
                order: ex.order,
              })),
            },
          },
        });
        appliedId = template.id;
        await applyWorkoutSchedule(
          req.user!.id,
          template.id,
          template.dayLabel || template.name,
          parseJson<string[]>(template.muscleGroups, []),
          payload,
        );
      } else if (proposal.type === "meal") {
        let plan: any;
        if (payload?.mode === "scratch" && payload.mealPlan) {
          const durationWeeks = normalizeDurationWeeks(payload.mealPlan.durationWeeks, 1);
          plan = await (tx as any).mealPlan.create({
            data: {
              userId: req.user!.id,
              name: payload.mealPlan.name,
              weekStart: payload.mealPlan.weekStart,
              durationWeeks,
              provenanceRole: "coach",
              provenanceSourceUserId: proposal.coachId,
              sourceProposalId: proposal.id,
              days: { create: buildMealPlanDaysFromPattern(payload.mealPlan) },
            },
          });
        } else {
          const source = await (tx as any).mealPlan.findFirst({
            where: { id: proposal.sourceId },
            include: {
              days: {
                include: { entries: { orderBy: [{ meal: "asc" }, { order: "asc" }] } },
                orderBy: { dayIndex: "asc" },
              },
            },
          });
          if (!source) throw createError("Source meal plan not found", 404);
          const durationWeeks = normalizeDurationWeeks(payload?.durationWeeks, source.durationWeeks);
          plan = await (tx as any).mealPlan.create({
            data: {
              userId: req.user!.id,
              name: source.name,
              weekStart: source.weekStart,
              durationWeeks,
              provenanceRole: "coach",
              provenanceSourceUserId: proposal.coachId,
              sourceProposalId: proposal.id,
              days: { create: buildClonedMealPlanDays(source.days, durationWeeks) },
            },
          });
        }
        appliedId = plan.id;
      } else if (proposal.type === "goal") {
        const source = await tx.calorieGoal.findFirst({
          where: { id: proposal.sourceId },
        });
        if (!source) throw createError("Source goal not found", 404);
        await tx.calorieGoal.updateMany({
          where: { userId: req.user!.id, active: true },
          data: { active: false },
        });
        const goal = await (tx.calorieGoal as any).create({
          data: {
            userId: req.user!.id,
            name: source.name,
            type: source.type,
            currentWeight: source.currentWeight,
            targetWeight: source.targetWeight,
            targetDate: source.targetDate,
            dailyCalories: source.dailyCalories,
            proteinGrams: source.proteinGrams,
            carbsGrams: source.carbsGrams,
            fatsGrams: source.fatsGrams,
            weeklyChange: source.weeklyChange,
            tdee: source.tdee,
            active: true,
            feasible: source.feasible,
            warning: source.warning,
            aiGenerated: false,
            notes: source.notes,
            macrosCycling: source.macrosCycling,
            trainDayCalories: source.trainDayCalories,
            trainDayProtein: source.trainDayProtein,
            trainDayCarbs: source.trainDayCarbs,
            trainDayFats: source.trainDayFats,
            restDayCalories: source.restDayCalories,
            restDayProtein: source.restDayProtein,
            restDayCarbs: source.restDayCarbs,
            restDayFats: source.restDayFats,
            provenanceRole: "coach",
            provenanceSourceUserId: proposal.coachId,
            sourceProposalId: proposal.id,
          },
        });
        appliedId = goal.id;
        await tx.user.update({
          where: { id: req.user!.id },
          data: { goal: goal.name ?? source.type },
        });
      }

      return (tx as any).coachProposal.update({
        where: { id: proposal.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
          updatedAt: new Date(),
          appliedId,
        },
      });
    });

    res.json({ proposal: result });
    await writeAuditLog({
      req,
      action: "coach.proposal.accepted",
      targetType: "coach_proposal",
      targetId: proposalId,
      targetUserId: req.user!.id,
      metadata: { type: proposal.type, appliedId: (result as any).appliedId ?? null },
    });
  } catch (error) {
    next(error);
  }
};
