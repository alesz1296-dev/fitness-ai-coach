import crypto from "crypto";
import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { writeAuditLog } from "../lib/audit.js";
import { parseCoachVisibility } from "../lib/coachPrivacy.js";

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

async function ensureCoachClientAccess(coachId: number, clientId: number, role?: string) {
  if (role === "admin" || role === "developer") return null;
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

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekdayList(days?: number[]) {
  if (!Array.isArray(days) || days.length === 0) return "unspecified days";
  return days
    .map((day) => WEEKDAY_LABELS[Math.max(0, Math.min(6, Number(day)))])
    .join(", ");
}

function formatMonthsOrWeeks(weeks: number) {
  if (weeks % 4 === 0) {
    const months = weeks / 4;
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

function buildProposalDiffSummary(
  proposal: any,
  payload: CoachProposalPayload | null,
  source: any | null,
): string[] {
  const summary: string[] = [];

  if (proposal.type === "workout") {
    if (payload?.mode === "custom") {
      summary.push(`Custom calendar draft`);
      summary.push(`Days included: ${Array.isArray(payload.days) ? payload.days.length : 0}`);
      if (payload.overwrite !== undefined) {
        summary.push(`Overwrite existing calendar days: ${payload.overwrite ? "Yes" : "No"}`);
      }
      return summary;
    }

    summary.push(`Template: ${source?.name ?? `#${proposal.sourceId}`}`);
    if (source?.splitType) summary.push(`Split: ${source.splitType}`);
    if (source?.objective) summary.push(`Objective: ${source.objective}`);
    if (source?.muscleGroups) {
      const muscleGroups = parseJson<string[]>(source.muscleGroups, []);
      if (muscleGroups.length > 0) summary.push(`Muscle groups: ${muscleGroups.join(", ")}`);
    }
    if (payload?.weekdays?.length) summary.push(`Schedule: ${weekdayList(payload.weekdays)}`);
    if (payload?.months) summary.push(`Duration: ${formatMonthsOrWeeks(Math.min(12, Math.max(1, Number(payload.months))) * 4)}`);
    if (payload?.overwrite !== undefined) {
      summary.push(`Overwrite existing calendar days: ${payload.overwrite ? "Yes" : "No"}`);
    }
    return summary;
  }

  if (proposal.type === "meal") {
    if (payload?.mode === "scratch" && payload.mealPlan) {
      summary.push(`Scratch meal plan: ${payload.mealPlan.name}`);
      summary.push(`Duration: ${formatMonthsOrWeeks(normalizeDurationWeeks(payload.mealPlan.durationWeeks, 1))}`);
      summary.push(`Days: ${payload.mealPlan.days.length}`);
      return summary;
    }

    summary.push(`Meal plan: ${source?.name ?? `#${proposal.sourceId}`}`);
    const sourceWeeks = Number(source?.durationWeeks ?? 1);
    const targetWeeks = normalizeDurationWeeks(payload?.durationWeeks, sourceWeeks);
    if (targetWeeks !== sourceWeeks) {
      summary.push(`Duration override: ${formatMonthsOrWeeks(sourceWeeks)} -> ${formatMonthsOrWeeks(targetWeeks)}`);
    } else {
      summary.push(`Duration: ${formatMonthsOrWeeks(targetWeeks)}`);
    }
    return summary;
  }

  if (proposal.type === "goal") {
    summary.push(`Goal: ${source?.name ?? `#${proposal.sourceId}`}`);
    if (source?.dailyCalories != null) summary.push(`Daily calories: ${Math.round(Number(source.dailyCalories))}`);
    if (source?.proteinGrams != null || source?.carbsGrams != null || source?.fatsGrams != null) {
      summary.push(
        `Macros: ${Math.round(Number(source.proteinGrams ?? 0))}P / ${Math.round(Number(source.carbsGrams ?? 0))}C / ${Math.round(Number(source.fatsGrams ?? 0))}F`,
      );
    }
    if (source?.targetDate) {
      const targetDate = source.targetDate instanceof Date
        ? source.targetDate.toISOString().slice(0, 10)
        : String(source.targetDate).slice(0, 10);
      summary.push(`Target date: ${targetDate}`);
    }
  }

  return summary;
}

async function enrichCoachProposals(proposals: any[]) {
  const workoutSourceIds = [...new Set(proposals.filter((proposal) => proposal.type === "workout").map((proposal) => Number(proposal.sourceId)).filter((id) => Number.isInteger(id) && id > 0))];
  const mealSourceIds = [...new Set(proposals.filter((proposal) => proposal.type === "meal").map((proposal) => Number(proposal.sourceId)).filter((id) => Number.isInteger(id) && id > 0))];
  const goalSourceIds = [...new Set(proposals.filter((proposal) => proposal.type === "goal").map((proposal) => Number(proposal.sourceId)).filter((id) => Number.isInteger(id) && id > 0))];

  const [workoutSources, mealSources, goalSources] = await Promise.all([
    workoutSourceIds.length > 0 ? db.workoutTemplate.findMany({
      where: { id: { in: workoutSourceIds } },
      select: { id: true, name: true, splitType: true, objective: true, muscleGroups: true },
    }) : Promise.resolve([]),
    mealSourceIds.length > 0 ? db.mealPlan.findMany({
      where: { id: { in: mealSourceIds } },
      select: { id: true, name: true, durationWeeks: true, weekStart: true },
    }) : Promise.resolve([]),
    goalSourceIds.length > 0 ? db.calorieGoal.findMany({
      where: { id: { in: goalSourceIds } },
      select: {
        id: true,
        name: true,
        dailyCalories: true,
        proteinGrams: true,
        carbsGrams: true,
        fatsGrams: true,
        targetDate: true,
      },
    }) : Promise.resolve([]),
  ]);

  const workoutMap = new Map(workoutSources.map((source: any) => [source.id, source]));
  const mealMap = new Map(mealSources.map((source: any) => [source.id, source]));
  const goalMap = new Map(goalSources.map((source: any) => [source.id, source]));

  return proposals.map((proposal) => {
    const payload = parseJson<CoachProposalPayload | null>(proposal.payload, null);
    const source =
      proposal.type === "workout"
        ? workoutMap.get(proposal.sourceId)
        : proposal.type === "meal"
          ? mealMap.get(proposal.sourceId)
          : goalMap.get(proposal.sourceId);
    return {
      ...proposal,
      diffSummary: buildProposalDiffSummary(proposal, payload, source ?? null),
      comments: (proposal.comments ?? []).map((comment: any) => ({
        ...comment,
        author: comment.author
          ? {
              id: comment.author.id,
              username: comment.author.username,
              firstName: comment.author.firstName,
              lastName: comment.author.lastName,
              role: comment.author.role,
            }
          : null,
      })),
    };
  });
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

function coachClientDisplayName(client: any): string {
  return [client?.firstName, client?.lastName].filter(Boolean).join(" ").trim() || client?.username || "Client";
}

function weekStartFromIso(weekStart: string): Date {
  const parsed = new Date(`${weekStart}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export const getCoachDashboard = async (
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
            goal: true,
            weight: true,
            trainingDaysPerWeek: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const clientIds = links.map((link: any) => link.client?.id).filter(Boolean) as number[];
    const [weeklyReviews, pendingProposals, recentAuditLogs] = await Promise.all([
      clientIds.length > 0
        ? db.weeklyReview.findMany({
            where: { userId: { in: clientIds } },
            orderBy: [{ userId: "asc" }, { weekStart: "desc" }],
          })
        : Promise.resolve([]),
      clientIds.length > 0
      ? db.coachProposal.findMany({
            where: { clientId: { in: clientIds }, status: "pending" },
            include: {
              client: {
                select: { id: true, username: true, firstName: true, lastName: true },
              },
              coach: {
                select: { id: true, username: true, firstName: true, lastName: true },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      db.auditLog.findMany({
        where: {
          OR: [
            { actorUserId: req.user!.id },
            { targetUserId: { in: clientIds } },
          ],
          action: { startsWith: "coach." },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    const latestByClient = new Map<number, any>();
    for (const review of weeklyReviews as any[]) {
      if (!latestByClient.has(review.userId)) latestByClient.set(review.userId, review);
    }
    const pendingByClient = new Map<number, number>();
    for (const proposal of pendingProposals as any[]) {
      pendingByClient.set(proposal.clientId, (pendingByClient.get(proposal.clientId) ?? 0) + 1);
    }

    const attentionClients = links
      .map((link: any) => {
        const client = link.client;
        if (!client) return null;
        const latestReview = latestByClient.get(client.id) ?? null;
        const reasons: string[] = [];
        const pendingCount = pendingByClient.get(client.id) ?? 0;
        const latestWeekStart = latestReview?.weekStart ?? null;
        const latestWeekDate = latestWeekStart ? weekStartFromIso(latestWeekStart) : null;
        const daysSinceReview = latestWeekDate
          ? Math.floor((Date.now() - latestWeekDate.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        const workoutAdherence = latestReview?.plannedWorkouts
          ? Math.round((Number(latestReview.workoutsCompleted ?? 0) / Number(latestReview.plannedWorkouts)) * 100)
          : null;
        const weightDelta = latestReview?.averageWeight != null && client.weight != null
          ? Math.round((Number(latestReview.averageWeight) - Number(client.weight)) * 10) / 10
          : null;

        if (pendingCount > 0) reasons.push(`${pendingCount} pending proposal${pendingCount === 1 ? "" : "s"}`);
        if (daysSinceReview == null || daysSinceReview >= 7) reasons.push("weekly check-in due");
        if (workoutAdherence != null && workoutAdherence < 75) reasons.push("workout adherence low");
        if (latestReview?.proteinAdherence != null && latestReview.proteinAdherence < 80) reasons.push("protein adherence low");
        if (latestReview?.calorieAdherence != null && latestReview.calorieAdherence < 75) reasons.push("calorie adherence low");
        if (weightDelta != null && Math.abs(weightDelta) >= 1) reasons.push("weight trend shifted");

        if (reasons.length === 0) return null;
        return {
          client: { ...client },
          pendingProposals: pendingCount,
          workoutAdherence,
          proteinAdherence: latestReview?.proteinAdherence ?? null,
          calorieAdherence: latestReview?.calorieAdherence ?? null,
          weightDelta,
          latestWeekStart,
          reasons,
        };
      })
      .filter(Boolean)
      .slice(0, 6);

    const notifications = [
      ...pendingProposals.slice(0, 4).map((proposal: any) => ({
        id: `proposal-${proposal.id}`,
        type: "proposal" as const,
        title: `${coachClientDisplayName(proposal.client)} needs review`,
        body: `${proposal.type} proposal is waiting for acceptance.`,
        clientId: proposal.clientId,
        clientName: coachClientDisplayName(proposal.client),
        createdAt: proposal.createdAt,
        action: "coach.proposal.pending",
      })),
      ...recentAuditLogs.slice(0, 4).map((log: any) => ({
        id: `audit-${log.id}`,
        type: "client" as const,
        title: log.action.replace("coach.", "").replaceAll("_", " "),
        body: "Recent coach activity logged.",
        clientId: log.targetUserId ?? null,
        clientName: null,
        createdAt: log.createdAt,
        action: log.action,
      })),
      ...attentionClients.slice(0, 2).map((entry: any) => ({
        id: `attention-${entry.client.id}`,
        type: "checkin" as const,
        title: `${coachClientDisplayName(entry.client)} needs attention`,
        body: entry.reasons.join(" · "),
        clientId: entry.client.id,
        clientName: coachClientDisplayName(entry.client),
        createdAt: new Date().toISOString(),
        action: "coach.client.attention",
      })),
    ]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 8);

    res.json({
      totalClients: links.length,
      pendingProposals: pendingProposals.length,
      needsAttention: attentionClients.length,
      overdueCheckIns: attentionClients.filter((item: any) => item.reasons.some((reason: string) => reason.includes("check-in due"))).length,
      recentNotifications: notifications,
      attentionClients,
    });
  } catch (error) {
    next(error);
  }
};

export const getCoachLibrary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [favorites, templates, mealPlans] = await Promise.all([
      db.coachLibraryFavorite.findMany({
        where: { coachId: req.user!.id },
        orderBy: { createdAt: "desc" },
      }),
      db.workoutTemplate.findMany({
        where: { userId: req.user!.id },
        orderBy: { updatedAt: "desc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      }),
      db.mealPlan.findMany({
        where: { userId: req.user!.id },
        orderBy: { updatedAt: "desc" },
        include: {
          days: {
            orderBy: { dayIndex: "asc" },
            include: { entries: { orderBy: [{ meal: "asc" }, { order: "asc" }] } },
          },
        },
      }),
    ]);
    res.json({ favorites, templates, mealPlans });
  } catch (error) {
    next(error);
  }
};

export const toggleCoachLibraryFavorite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const itemType = String(req.body?.itemType ?? "");
    const sourceId = Number(req.body?.sourceId);
    if (!["template", "meal"].includes(itemType) || !Number.isInteger(sourceId) || sourceId < 1) {
      return next(createError("Invalid library favorite", 400));
    }

    const existing = await db.coachLibraryFavorite.findUnique({
      where: {
        coachId_itemType_sourceId: {
          coachId: req.user!.id,
          itemType,
          sourceId,
        },
      },
    });

    if (existing) {
      await db.coachLibraryFavorite.delete({ where: { id: existing.id } });
      await writeAuditLog({
        req,
        action: "coach.library.unfavorited",
        targetType: "coach_library_favorite",
        targetId: existing.id,
        metadata: { itemType, sourceId },
      });
      res.json({ favorite: null });
      return;
    }

    const favorite = await db.coachLibraryFavorite.create({
      data: {
        coachId: req.user!.id,
        itemType,
        sourceId,
      },
    });
    await writeAuditLog({
      req,
      action: "coach.library.favorited",
      targetType: "coach_library_favorite",
      targetId: favorite.id,
      metadata: { itemType, sourceId },
    });
    res.status(201).json({ favorite });
  } catch (error) {
    next(error);
  }
};

export const updateWeeklyReviewNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const clientId = Number(req.params.clientId);
    const weekStart = String(req.params.weekStart ?? "").trim();
    const coachNote = String(req.body?.coachNote ?? "").trim();
    await ensureCoachClientAccess(req.user!.id, clientId, req.user?.role);
    if (!weekStart) return next(createError("Week start is required", 400));

    const review = await db.weeklyReview.findUnique({
      where: { userId_weekStart: { userId: clientId, weekStart } },
    });
    if (!review) return next(createError("Weekly review not found", 404));

    const updated = await db.weeklyReview.update({
      where: { id: review.id },
      data: {
        coachNote: coachNote || null,
      },
    });

    await writeAuditLog({
      req,
      action: "coach.weekly_review.note_updated",
      targetType: "weekly_review",
      targetId: updated.id,
      targetUserId: clientId,
      metadata: { weekStart, coachNoteLength: coachNote.length },
    });

    res.json({ review: updated });
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
    await ensureCoachClientAccess(req.user!.id, clientId, req.user?.role);
    const calendarWindowEnd = new Date();
    calendarWindowEnd.setDate(calendarWindowEnd.getDate() + 27);
    const [client, recentWorkouts, activeGoal, weightLogs, foods, plans, proposalsRaw, weeklyReviewsRaw, calendarDays] =
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
            coachVisibility: true,
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
          include: {
            coach: {
              select: { id: true, username: true, firstName: true, lastName: true, email: true },
            },
            comments: {
              include: {
                author: {
                  select: { id: true, username: true, firstName: true, lastName: true, role: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        db.weeklyReview.findMany({
          where: { userId: clientId },
          orderBy: { weekStart: "desc" },
          take: 6,
        }),
        db.workoutCalendarDay.findMany({
          where: {
            userId: clientId,
            date: {
              gte: new Date().toISOString().slice(0, 10),
              lte: calendarWindowEnd.toISOString().slice(0, 10),
            },
          },
          orderBy: { date: "asc" },
          take: 20,
        }),
      ]);

    const coachVisibility = parseCoachVisibility((client as any).coachVisibility);
    const visibleWorkouts = coachVisibility.workouts;
    const visibleNutrition = coachVisibility.nutrition;
    const visibleWeight = coachVisibility.weight;
    const visibleGoals = coachVisibility.goals;
    const visibleMealPlans = coachVisibility.mealPlans;
    const visibleCalendar = coachVisibility.calendar;
    const weeklyReviews = weeklyReviewsRaw.map((review: any) => ({
      ...review,
      averageWeight: visibleWeight ? review.averageWeight : null,
      calorieAdherence: visibleNutrition && visibleGoals ? review.calorieAdherence : null,
      proteinAdherence: visibleNutrition && visibleGoals ? review.proteinAdherence : null,
      workoutsCompleted: visibleWorkouts ? review.workoutsCompleted : 0,
      plannedWorkouts: visibleWorkouts ? review.plannedWorkouts : null,
    }));
    const latestWeeklyReview = weeklyReviews[0] ?? null;
    const newestWeight = weightLogs[0]?.weight != null ? Number(weightLogs[0].weight) : null;
    const oldestWeight = weightLogs.length > 1 && weightLogs[weightLogs.length - 1]?.weight != null
      ? Number(weightLogs[weightLogs.length - 1].weight)
      : null;
    const weightDelta = visibleWeight && newestWeight != null && oldestWeight != null
      ? Math.round((newestWeight - oldestWeight) * 10) / 10
      : null;
    const workoutAdherence = latestWeeklyReview?.plannedWorkouts
      ? Math.round((Number(latestWeeklyReview.workoutsCompleted ?? 0) / Number(latestWeeklyReview.plannedWorkouts)) * 100)
      : null;

    const nutritionSummary = foods.reduce(
      (acc: { calories: number; protein: number }, row: any) => {
        acc.calories += Number(row.calories ?? 0);
        acc.protein += Number(row.protein ?? 0);
        return acc;
      },
      { calories: 0, protein: 0 },
    );

    res.json({
      client: { ...client, coachVisibility },
      recentWorkouts: visibleWorkouts ? recentWorkouts : [],
      activeGoal: visibleGoals ? activeGoal : null,
      weightLogs: visibleWeight ? weightLogs : [],
      nutritionSummary: visibleNutrition ? nutritionSummary : { calories: 0, protein: 0 },
      plans: visibleMealPlans ? plans : [],
      proposals: await enrichCoachProposals(proposalsRaw),
      calendarDays: visibleCalendar ? calendarDays : [],
      visibility: coachVisibility,
      weeklyReviews,
      adherenceSummary: {
        latestWeekStart: latestWeeklyReview?.weekStart ?? null,
        averageWeight: latestWeeklyReview?.averageWeight ?? null,
        weightDelta,
        calorieAdherence: latestWeeklyReview?.calorieAdherence ?? null,
        proteinAdherence: latestWeeklyReview?.proteinAdherence ?? null,
        workoutAdherence,
        workoutsCompleted: latestWeeklyReview?.workoutsCompleted ?? 0,
        plannedWorkouts: latestWeeklyReview?.plannedWorkouts ?? null,
        checkInCount: weeklyReviews.length,
      },
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
    await ensureCoachClientAccess(req.user!.id, Number(clientId), req.user?.role);

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
    await ensureCoachClientAccess(req.user!.id, clientId, req.user?.role);
    const proposals = await db.coachProposal.findMany({
      where: { clientId },
      include: {
        coach: {
          select: { id: true, username: true, firstName: true, lastName: true, email: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, username: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ proposals: await enrichCoachProposals(proposals) });
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
          select: { id: true, username: true, firstName: true, lastName: true, email: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, username: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ proposals: await enrichCoachProposals(proposals) });
  } catch (error) {
    next(error);
  }
};

export const addProposalComment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const proposalId = Number(req.params.id);
    const body = String(req.body?.body ?? "").trim();
    if (!body) return next(createError("Comment body is required", 400));

    const proposal = await db.coachProposal.findFirst({
      where: {
        id: proposalId,
        OR: [
          { clientId: req.user!.id },
          { coachId: req.user!.id },
        ],
      },
    });
    if (!proposal && req.user?.role !== "admin" && req.user?.role !== "developer") {
      return next(createError("Proposal not found", 404));
    }

    const comment = await db.coachProposalComment.create({
      data: {
        proposalId,
        authorUserId: req.user!.id,
        body,
      },
      include: {
        author: {
          select: { id: true, username: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    await writeAuditLog({
      req,
      action: "coach.proposal.comment_created",
      targetType: "coach_proposal",
      targetId: proposalId,
      targetUserId: proposal?.clientId ?? req.user!.id,
      metadata: { bodyLength: body.length },
    });

    res.status(201).json({ comment });
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
