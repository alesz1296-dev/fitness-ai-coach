import type { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/calendar?month=YYYY-MM
// Returns all WorkoutCalendarDay entries for the user in a given month.
// ─────────────────────────────────────────────────────────────────────────────
export const getCalendarMonth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    // Validate month format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month must be in YYYY-MM format" });
    }

    const [year, mon] = month.split("-").map(Number);
    const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
    // Last day of month
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const days = await prisma.workoutCalendarDay.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    return res.json({ days, month });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar/populate
// Populates a month by applying template days to specific weekdays.
// Body: {
//   month: "YYYY-MM",
//   assignments: Array<{ dayOfWeek: 0-6, workoutName: string, muscleGroups: string[], templateId?: number }>,
//   overwrite?: boolean  // default false — skips days already planned
// }
// dayOfWeek: 0=Monday … 6=Sunday  (ISO week convention)
// ─────────────────────────────────────────────────────────────────────────────
export const populateCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { month, assignments, overwrite = false } = req.body as {
      month: string;
      assignments: Array<{
        dayOfWeek: number;      // 0=Mon … 6=Sun
        workoutName: string;
        muscleGroups?: string[];
        templateId?: number;
        isRestDay?: boolean;
      }>;
      overwrite?: boolean;
    };

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month must be in YYYY-MM format" });
    }
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: "assignments must be a non-empty array" });
    }

    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();

    // Build map: dayOfWeek → assignment
    const assignmentMap = new Map<number, (typeof assignments)[0]>();
    for (const a of assignments) {
      assignmentMap.set(a.dayOfWeek, a);
    }

    // If not overwriting, fetch existing dates so we can skip them
    const existingSet = new Set<string>();
    if (!overwrite) {
      const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
      const endDate   = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const existing  = await prisma.workoutCalendarDay.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        select: { date: true },
      });
      for (const e of existing) existingSet.add(e.date);
    }

    const upserts: Promise<unknown>[] = [];

    for (let day = 1; day <= lastDay; day++) {
      const dateObj = new Date(year, mon - 1, day);
      // JS getDay(): 0=Sun…6=Sat → convert to Mon=0…Sun=6
      const jsDay   = dateObj.getDay();
      const isoDay  = (jsDay + 6) % 7; // Mon=0, Sun=6

      const assignment = assignmentMap.get(isoDay);
      if (!assignment) continue;

      const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      if (!overwrite && existingSet.has(dateStr)) continue;

      upserts.push(
        prisma.workoutCalendarDay.upsert({
          where:  { userId_date: { userId, date: dateStr } },
          update: {
            workoutName:  assignment.workoutName,
            muscleGroups: assignment.muscleGroups ? JSON.stringify(assignment.muscleGroups) : null,
            templateId:   assignment.templateId ?? null,
            isRestDay:    assignment.isRestDay ?? false,
            updatedAt:    new Date(),
          },
          create: {
            userId,
            date:         dateStr,
            workoutName:  assignment.workoutName,
            muscleGroups: assignment.muscleGroups ? JSON.stringify(assignment.muscleGroups) : null,
            templateId:   assignment.templateId ?? null,
            isRestDay:    assignment.isRestDay ?? false,
          },
        })
      );
    }

    await Promise.all(upserts);

    return res.json({ message: `Populated ${upserts.length} day(s) for ${month}`, count: upserts.length });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/calendar/:date
// Update a single calendar day.
// Body: { workoutName?, muscleGroups?, templateId?, isRestDay?, notes? }
// ─────────────────────────────────────────────────────────────────────────────
export const updateCalendarDay = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId  = req.user!.id;
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    const { workoutName, muscleGroups, templateId, isRestDay, notes } = req.body;

    const day = await prisma.workoutCalendarDay.upsert({
      where:  { userId_date: { userId, date } },
      update: {
        ...(workoutName  !== undefined && { workoutName }),
        ...(muscleGroups !== undefined && { muscleGroups: JSON.stringify(muscleGroups) }),
        ...(templateId   !== undefined && { templateId: templateId ?? null }),
        ...(isRestDay    !== undefined && { isRestDay }),
        ...(notes        !== undefined && { notes }),
        updatedAt: new Date(),
      },
      create: {
        userId,
        date,
        workoutName:  workoutName  ?? null,
        muscleGroups: muscleGroups ? JSON.stringify(muscleGroups) : null,
        templateId:   templateId   ?? null,
        isRestDay:    isRestDay    ?? false,
        notes:        notes        ?? null,
      },
    });

    return res.json({ day });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/calendar/:date
// Remove the planned day entry (turns the day back to unplanned).
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCalendarDay = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId  = req.user!.id;
    const { date } = req.params;

    await prisma.workoutCalendarDay.deleteMany({
      where: { userId, date },
    });

    return res.json({ message: "Day cleared" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/calendar/swap
// Swap the plan between two dates.
// Body: { date1: "YYYY-MM-DD", date2: "YYYY-MM-DD" }
// ─────────────────────────────────────────────────────────────────────────────
export const swapCalendarDays = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { date1, date2 } = req.body as { date1: string; date2: string };

    if (!date1 || !date2) {
      return res.status(400).json({ error: "date1 and date2 are required" });
    }
    if (date1 === date2) {
      return res.status(400).json({ error: "date1 and date2 must be different" });
    }

    const [day1, day2] = await Promise.all([
      prisma.workoutCalendarDay.findUnique({ where: { userId_date: { userId, date: date1 } } }),
      prisma.workoutCalendarDay.findUnique({ where: { userId_date: { userId, date: date2 } } }),
    ]);

    // Helper to extract the mutable fields from a day (or nulls if no entry)
    const fields = (d: typeof day1) => ({
      workoutName:  d?.workoutName  ?? null,
      muscleGroups: d?.muscleGroups ?? null,
      templateId:   d?.templateId   ?? null,
      isRestDay:    d?.isRestDay    ?? false,
      notes:        d?.notes        ?? null,
    });

    const f1 = fields(day1);
    const f2 = fields(day2);

    const upsert = (date: string, f: ReturnType<typeof fields>) =>
      prisma.workoutCalendarDay.upsert({
        where:  { userId_date: { userId, date } },
        update: { ...f, updatedAt: new Date() },
        create: { userId, date, ...f },
      });

    await Promise.all([upsert(date1, f2), upsert(date2, f1)]);

    return res.json({ message: "Days swapped" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/calendar/clear?month=YYYY-MM
// Remove all planned days for a given month.
// ─────────────────────────────────────────────────────────────────────────────
export const clearCalendarMonth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month must be in YYYY-MM format" });
    }

    const [year, mon] = month.split("-").map(Number);
    const startDate   = `${year}-${String(mon).padStart(2, "0")}-01`;
    const lastDay     = new Date(year, mon, 0).getDate();
    const endDate     = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { count } = await prisma.workoutCalendarDay.deleteMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    });

    return res.json({ message: `Cleared ${count} day(s) for ${month}`, count });
  } catch (err) {
    next(err);
  }
};
