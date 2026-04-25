import { Response, NextFunction } from "express";
import bcryptjs from "bcryptjs";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { createError } from "../middleware/errorHandler.js";
import logger from "../lib/logger.js";

// GET /api/users/profile
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await (prisma.user.findUnique as any)({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
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
        profileComplete: true,
        proteinMultiplier: true,
        trainingDaysPerWeek: true,
        trainingHoursPerDay: true,
        injuries: true,
        periodStart: true,
        cycleLength: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as any;

    if (!user) {
      return next(createError("User not found", 404));
    }

    // Parse injuries JSON before sending
    const userOut = {
      ...user,
      injuries: user.injuries ? JSON.parse(user.injuries as string) : [],
    };

    res.json({ user: userOut });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      firstName,
      lastName,
      age,
      weight,
      height,
      sex,
      activityLevel,
      fitnessLevel,
      goal,
      proteinMultiplier,
      trainingDaysPerWeek,
      trainingHoursPerDay,
      injuries,
      periodStart,
      cycleLength,
    } = req.body;

    const updated = await (prisma.user.update as any)({
      where: { id: req.user!.id },
      data: {
        ...(firstName         !== undefined && { firstName }),
        ...(lastName          !== undefined && { lastName }),
        ...(age               !== undefined && { age: Number(age) }),
        ...(weight            !== undefined && { weight: Number(weight) }),
        ...(height            !== undefined && { height: Number(height) }),
        ...(sex               !== undefined && { sex }),
        ...(activityLevel     !== undefined && { activityLevel }),
        ...(fitnessLevel      !== undefined && { fitnessLevel }),
        ...(goal              !== undefined && { goal }),
        // Mark profile as complete whenever a goal is explicitly set
        ...(goal != null && { profileComplete: true }),
        ...(proteinMultiplier !== undefined && {
          proteinMultiplier: Math.min(3.0, Math.max(0.8, Number(proteinMultiplier))),
        }),
        ...(trainingDaysPerWeek !== undefined && {
          trainingDaysPerWeek: trainingDaysPerWeek === null ? null : Math.min(7, Math.max(1, Number(trainingDaysPerWeek))),
        }),
        ...(trainingHoursPerDay !== undefined && {
          trainingHoursPerDay: trainingHoursPerDay === null ? null : Math.min(4, Math.max(0.25, Number(trainingHoursPerDay))),
        }),
        ...(injuries !== undefined && {
          injuries: Array.isArray(injuries) ? JSON.stringify(injuries) : null,
        }),
        ...(periodStart !== undefined && { periodStart: periodStart || null }),
        ...(cycleLength !== undefined && {
          cycleLength: cycleLength === null ? null : Math.min(45, Math.max(20, Number(cycleLength))),
        }),
      },
      select: {
        id: true,
        email: true,
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
        profileComplete: true,
        proteinMultiplier: true,
        trainingDaysPerWeek: true,
        trainingHoursPerDay: true,
        injuries: true,
        periodStart: true,
        cycleLength: true,
        updatedAt: true,
      },
    }) as any;

    // Parse injuries JSON before sending
    const updatedOut = {
      ...updated,
      injuries: updated.injuries ? JSON.parse(updated.injuries as string) : [],
    };

    logger.info(`Profile updated for user ${req.user!.id}`);
    res.json({ message: "Profile updated", user: updatedOut });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(createError("Current and new password are required", 400));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user) {
      return next(createError("User not found", 404));
    }

    const passwordMatch = await bcryptjs.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return next(createError("Current password is incorrect", 401));
    }

    const hashedNew = await bcryptjs.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedNew },
    });

    logger.info(`Password changed for user ${req.user!.id}`);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/account
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    logger.info(`Account deleted for user ${req.user!.id}`);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
};
