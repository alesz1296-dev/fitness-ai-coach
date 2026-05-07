import { Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import { writeAuditLog } from "../lib/audit.js";

const db = prisma as any;

function parsePermissionFlags(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const getAdminSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      users,
      coaches,
      admins,
      links,
      invites,
      proposals,
      templates,
      mealPlans,
      signups7d,
      workouts7d,
      foodLogs7d,
      weights7d,
      chats7d,
      activeGoals,
      calendarDays30d,
      pendingCoachLinks,
    ] =
      await Promise.all([
        prisma.user.count(),
        db.user.count({ where: { role: "coach" } }),
        db.user.count({ where: { role: { in: ["admin", "developer"] } } }),
        db.coachClientLink.count(),
        db.coachInvite.count({ where: { status: "invited" } }),
        db.coachProposal.count({ where: { status: "pending" } }),
        prisma.workoutTemplate.count(),
        db.mealPlan.count(),
        prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.workout.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.foodLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.weightLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.conversation.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.calorieGoal.count({ where: { active: true } }),
        db.workoutCalendarDay.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        db.coachClientLink.count({ where: { status: "invited" } }),
      ]);

    await writeAuditLog({
      req,
      action: "internal.summary.viewed",
      metadata: { metricsWindowDays: 7, calendarWindowDays: 30 },
    });

    res.json({
      stats: { users, coaches, admins, links, invites, proposals, templates, mealPlans },
      metrics: {
        signups7d,
        workouts7d,
        foodLogs7d,
        weights7d,
        chats7d,
        activeGoals,
        calendarDays30d,
        pendingCoachLinks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = String(req.query.q ?? "").trim();
    const users = await db.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissionFlags: true,
        createdAt: true,
      },
    });
    res.json({
      users: users.map((user: any) => ({
        ...user,
        permissionFlags: parsePermissionFlags(user.permissionFlags),
      })),
    });
    await writeAuditLog({
      req,
      action: "internal.users.searched",
      metadata: { query: q, resultCount: users.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserDetail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = Number(req.params.userId);
    const [user, workoutCount, foodCount, weightCount, goalCount] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          permissionFlags: true,
          goal: true,
          weight: true,
          trainingDaysPerWeek: true,
          createdAt: true,
        },
      }),
      prisma.workout.count({ where: { userId } }),
      prisma.foodLog.count({ where: { userId } }),
      prisma.weightLog.count({ where: { userId } }),
      prisma.calorieGoal.count({ where: { userId } }),
    ]);
    if (!user) return next(createError("User not found", 404));
    res.json({
      user: {
        ...user,
        permissionFlags: parsePermissionFlags(user.permissionFlags),
      },
      stats: { workoutCount, foodCount, weightCount, goalCount },
    });
    await writeAuditLog({
      req,
      action: "internal.user.detail_viewed",
      targetType: "user",
      targetId: userId,
      targetUserId: userId,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserWorkspace = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = Number(req.params.userId);
    const today = new Date();
    const nutritionWindowStart = new Date(today);
    nutritionWindowStart.setDate(today.getDate() - 6);
    const calendarWindowEnd = new Date(today);
    calendarWindowEnd.setDate(today.getDate() + 27);

    const [
      user,
      workoutCount,
      foodCount,
      weightCount,
      goalCount,
      recentWorkouts,
      activeGoal,
      recentWeights,
      recentFoods,
      mealPlans,
      proposals,
      coachLinks,
      calendarDays,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          permissionFlags: true,
          goal: true,
          weight: true,
          height: true,
          fitnessLevel: true,
          activityLevel: true,
          trainingDaysPerWeek: true,
          trainingHoursPerDay: true,
          createdAt: true,
        },
      }),
      prisma.workout.count({ where: { userId } }),
      prisma.foodLog.count({ where: { userId } }),
      prisma.weightLog.count({ where: { userId } }),
      prisma.calorieGoal.count({ where: { userId } }),
      prisma.workout.findMany({
        where: { userId },
        include: { exercises: true },
        orderBy: { date: "desc" },
        take: 8,
      }),
      prisma.calorieGoal.findFirst({
        where: { userId, active: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.foodLog.findMany({
        where: {
          userId,
          date: { gte: nutritionWindowStart, lte: today },
        },
        orderBy: { date: "desc" },
        take: 30,
      }),
      db.mealPlan.findMany({
        where: { userId },
        include: {
          days: {
            include: {
              entries: {
                orderBy: [{ meal: "asc" }, { order: "asc" }],
              },
            },
            orderBy: { dayIndex: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
      db.coachProposal.findMany({
        where: { clientId: userId },
        include: {
          coach: {
            select: { id: true, username: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      db.coachClientLink.findMany({
        where: {
          OR: [{ coachId: userId }, { clientId: userId }],
        },
        include: {
          coach: {
            select: { id: true, username: true, firstName: true, lastName: true, email: true },
          },
          client: {
            select: { id: true, username: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      db.workoutCalendarDay.findMany({
        where: {
          userId,
          date: {
            gte: today.toISOString().slice(0, 10),
            lte: calendarWindowEnd.toISOString().slice(0, 10),
          },
        },
        orderBy: { date: "asc" },
        take: 20,
      }),
    ]);

    if (!user) return next(createError("User not found", 404));

    const nutritionSummary = recentFoods.reduce(
      (acc: { calories: number; protein: number; carbs: number; fats: number; entries: number }, row) => {
        acc.calories += Number(row.calories ?? 0);
        acc.protein += Number(row.protein ?? 0);
        acc.carbs += Number(row.carbs ?? 0);
        acc.fats += Number(row.fats ?? 0);
        acc.entries += 1;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, entries: 0 },
    );

    res.json({
      user: {
        ...user,
        permissionFlags: parsePermissionFlags(user.permissionFlags),
      },
      stats: { workoutCount, foodCount, weightCount, goalCount },
      recentWorkouts,
      activeGoal,
      recentWeights,
      recentFoods,
      nutritionSummary,
      mealPlans,
      pendingProposals: proposals.map((proposal: any) => ({
        ...proposal,
        coach: proposal.coach
          ? {
              ...proposal.coach,
            }
          : undefined,
      })),
      relationships: coachLinks,
      calendarDays: calendarDays.map((day: any) => ({
        ...day,
        muscleGroups: parseJsonArray<string>(day.muscleGroups),
      })),
      windows: {
        nutritionStart: nutritionWindowStart.toISOString(),
        nutritionEnd: today.toISOString(),
        calendarEnd: calendarWindowEnd.toISOString(),
      },
    });
    await writeAuditLog({
      req,
      action: "internal.user.workspace_viewed",
      targetType: "user",
      targetId: userId,
      targetUserId: userId,
      metadata: {
        workoutsShown: recentWorkouts.length,
        foodsShown: recentFoods.length,
        proposalsShown: proposals.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = Number(req.params.userId);
    const { role, permissionFlags } = req.body;
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, permissionFlags: true },
    });
    const user = await db.user.update({
      where: { id: userId },
      data: {
        role,
        permissionFlags: JSON.stringify(permissionFlags ?? []),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissionFlags: true,
      },
    });
    res.json({
      user: {
        ...user,
        permissionFlags: parsePermissionFlags(user.permissionFlags),
      },
    });
    await writeAuditLog({
      req,
      action: "internal.user.role_updated",
      targetType: "user",
      targetId: userId,
      targetUserId: userId,
      metadata: {
        previousRole: existing?.role ?? null,
        nextRole: role,
        previousPermissionFlags: parsePermissionFlags(existing?.permissionFlags),
        nextPermissionFlags: permissionFlags ?? [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listRelationships = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const relationships = await db.coachClientLink.findMany({
      include: {
        coach: { select: { id: true, username: true, email: true } },
        client: { select: { id: true, username: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    res.json({ relationships });
    await writeAuditLog({
      req,
      action: "internal.relationships.viewed",
      metadata: { resultCount: relationships.length },
    });
  } catch (error) {
    next(error);
  }
};

export const listAuditLogs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const logs = await db.auditLog.findMany({
      include: {
        actor: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    res.json({
      logs: logs.map((log: any) => ({
        ...log,
        metadata: parseJsonValue<Record<string, unknown> | null>(log.metadata, null),
      })),
    });
    await writeAuditLog({
      req,
      action: "internal.audit.viewed",
      metadata: { resultCount: logs.length },
    });
  } catch (error) {
    next(error);
  }
};

export const startImpersonation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actorUserId = req.user?.actualUserId ?? req.user?.id;
    const targetUserId = Number(req.body.userId);
    if (!actorUserId || !Number.isInteger(targetUserId) || targetUserId < 1) {
      return next(createError("Invalid target user", 400));
    }
    if (actorUserId === targetUserId) {
      return next(createError("You are already this user", 400));
    }

    const target = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        permissionFlags: true,
        goal: true,
        weight: true,
        trainingDaysPerWeek: true,
        trainingHoursPerDay: true,
        createdAt: true,
      },
    });
    if (!target) return next(createError("User not found", 404));

    await db.impersonationSession.updateMany({
      where: { actorUserId, status: "active" },
      data: { status: "ended", endedAt: new Date() },
    });

    const token = crypto.randomUUID();
    await db.impersonationSession.create({
      data: {
        token,
        actorUserId,
        targetUserId,
      },
    });

    const parsedTarget = {
      ...target,
      permissionFlags: parsePermissionFlags(target.permissionFlags),
    };

    await writeAuditLog({
      req,
      action: "internal.impersonation.started",
      targetType: "user",
      targetId: targetUserId,
      targetUserId,
      metadata: { tokenIssued: true },
    });

    res.json({ token, user: parsedTarget });
  } catch (error) {
    next(error);
  }
};

export const stopImpersonation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actorUserId = req.user?.actualUserId ?? req.user?.id;
    const token = req.user?.impersonationSessionToken ?? String(req.body?.token ?? "");
    if (!actorUserId || !token) {
      return next(createError("No active impersonation session", 400));
    }
    await db.impersonationSession.updateMany({
      where: { actorUserId, token, status: "active" },
      data: { status: "ended", endedAt: new Date() },
    });
    await writeAuditLog({
      req,
      action: "internal.impersonation.stopped",
      metadata: { token },
    });
    res.json({ message: "Impersonation ended" });
  } catch (error) {
    next(error);
  }
};

export const listFeatureFlags = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const flags = await db.featureFlag.findMany({
      orderBy: { key: "asc" },
    });
    await writeAuditLog({
      req,
      action: "internal.feature_flags.viewed",
      metadata: { count: flags.length },
    });
    res.json({ flags });
  } catch (error) {
    next(error);
  }
};

export const upsertFeatureFlag = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actorUserId = req.user?.actualUserId ?? req.user?.id ?? null;
    const { key, label, description, enabled } = req.body;
    const flag = await db.featureFlag.upsert({
      where: { key },
      update: {
        label,
        description: description ?? null,
        enabled: Boolean(enabled),
        updatedByUserId: actorUserId,
      },
      create: {
        key,
        label,
        description: description ?? null,
        enabled: Boolean(enabled),
        updatedByUserId: actorUserId,
      },
    });
    await writeAuditLog({
      req,
      action: "internal.feature_flag.updated",
      targetType: "feature_flag",
      metadata: { key, enabled: Boolean(enabled) },
    });
    res.json({ flag });
  } catch (error) {
    next(error);
  }
};

export const getContentSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [foodItems, exerciseItems, systemTemplates, customTemplates, customFoods, customExercises] =
      await Promise.all([
        db.foodItem.count(),
        db.exerciseItem.count(),
        db.workoutTemplate.count({ where: { isSystem: true } }),
        db.workoutTemplate.count({ where: { isSystem: false } }),
        db.customFood.count(),
        db.customExercise.count(),
      ]);
    await writeAuditLog({
      req,
      action: "internal.content_summary.viewed",
      metadata: { foodItems, exerciseItems, systemTemplates, customTemplates },
    });
    res.json({
      summary: {
        foodItems,
        exerciseItems,
        systemTemplates,
        customTemplates,
        customFoods,
        customExercises,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const runRepairAction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { action, userId } = req.body as { action: string; userId?: number };
    if (action === "sync_profile_weight") {
      const targetUserId = Number(userId);
      if (!Number.isInteger(targetUserId) || targetUserId < 1) {
        return next(createError("Invalid user id", 400));
      }
      const latest = await prisma.weightLog.findFirst({
        where: { userId: targetUserId },
        orderBy: { date: "desc" },
      });
      if (!latest) return next(createError("No weight logs found for user", 404));
      await prisma.user.update({
        where: { id: targetUserId },
        data: { weight: latest.weight },
      });
      await writeAuditLog({
        req,
        action: "internal.repair.sync_profile_weight",
        targetType: "user",
        targetId: targetUserId,
        targetUserId: targetUserId,
        metadata: { latestWeight: latest.weight },
      });
      res.json({ message: "Profile weight synced", latestWeight: latest.weight });
      return;
    }

    if (action === "cleanup_expired_invites") {
      const result = await db.coachInvite.updateMany({
        where: {
          status: "invited",
          expiresAt: { lt: new Date() },
        },
        data: { status: "revoked", updatedAt: new Date() },
      });
      await writeAuditLog({
        req,
        action: "internal.repair.cleanup_expired_invites",
        metadata: { updated: result.count },
      });
      res.json({ message: "Expired invites cleaned", updated: result.count });
      return;
    }

    return next(createError("Unknown repair action", 400));
  } catch (error) {
    next(error);
  }
};
