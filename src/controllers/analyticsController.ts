import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";

// Returns the Monday-week label "Mon Apr 7" for a given date
function weekLabel(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function weekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// GET /api/analytics?days=90
export const getAnalytics = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const days    = Math.min(Math.max(Number(req.query.days) || 90, 7), 365);
    const userId  = req.user!.id;
    const since   = new Date();
    since.setDate(since.getDate() - days);

    const [workouts, foodLogs, weightLogs] = await Promise.all([
      prisma.workout.findMany({
        where:   { userId, date: { gte: since } },
        select:  { date: true, duration: true, caloriesBurned: true },
        orderBy: { date: "asc" },
      }),
      prisma.foodLog.findMany({
        where:   { userId, date: { gte: since } },
        select:  { date: true, calories: true, protein: true, carbs: true, fats: true },
        orderBy: { date: "asc" },
      }),
      (prisma as any).weightLog ? (prisma as any).weightLog.findMany({
        where:   { userId, date: { gte: since } },
        select:  { date: true, weight: true },
        orderBy: { date: "asc" },
      }).catch(() => []) : Promise.resolve([]),
    ]);

    // ── Workout trend — grouped by calendar week ──────────────────────────────
    const byWeek: Record<string, { key: string; label: string; count: number; totalDuration: number; burned: number }> = {};
    for (const w of workouts) {
      const key   = weekKey(w.date);
      const label = weekLabel(w.date);
      if (!byWeek[key]) byWeek[key] = { key, label, count: 0, totalDuration: 0, burned: 0 };
      byWeek[key].count++;
      byWeek[key].totalDuration += w.duration ?? 0;
      byWeek[key].burned        += w.caloriesBurned ?? 0;
    }
    const workoutTrend = Object.values(byWeek)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key: _k, ...rest }) => rest);

    // ── Calorie balance — grouped by day ──────────────────────────────────────
    const burnedByDay: Record<string, number> = {};
    for (const w of workouts) {
      const day = w.date.toISOString().split("T")[0];
      burnedByDay[day] = (burnedByDay[day] ?? 0) + (w.caloriesBurned ?? 0);
    }

    // ── Macro trend — grouped by day ──────────────────────────────────────────
    const macroByDay: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {};
    for (const f of foodLogs) {
      const day = f.date.toISOString().split("T")[0];
      if (!macroByDay[day]) macroByDay[day] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      macroByDay[day].calories += f.calories;
      macroByDay[day].protein  += f.protein ?? 0;
      macroByDay[day].carbs    += f.carbs ?? 0;
      macroByDay[day].fats     += f.fats ?? 0;
    }

    // Build combined daily series
    const allDays = new Set([...Object.keys(burnedByDay), ...Object.keys(macroByDay)]);
    const dailySeries = Array.from(allDays)
      .sort()
      .map((date) => {
        const m = macroByDay[date] ?? { calories: 0, protein: 0, carbs: 0, fats: 0 };
        return {
          date,
          label:    new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          calories: Math.round(m.calories),
          protein:  Math.round(m.protein),
          carbs:    Math.round(m.carbs),
          fats:     Math.round(m.fats),
          burned:   Math.round(burnedByDay[date] ?? 0),
          net:      Math.round(m.calories - (burnedByDay[date] ?? 0)),
        };
      });

    // 7-day rolling average for calories
    const withRolling = dailySeries.map((d, i, arr) => {
      const window = arr.slice(Math.max(0, i - 6), i + 1);
      const avg7   = Math.round(window.reduce((s, x) => s + x.calories, 0) / window.length);
      return { ...d, avg7 };
    });

    // Summary stats
    const tracked = dailySeries.filter((d) => d.calories > 0);
    const avgCalories = tracked.length
      ? Math.round(tracked.reduce((s, d) => s + d.calories, 0) / tracked.length)
      : 0;
    const avgProtein = tracked.length
      ? Math.round(tracked.reduce((s, d) => s + d.protein, 0) / tracked.length)
      : 0;
    const totalWorkouts = workouts.length;
    const totalBurned   = workouts.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);

    // Build weight series
    const weightSeries = (weightLogs as any[]).map((w: any) => ({
      label:  new Date(w.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: Number(w.weight),
    }));

    res.json({
      days,
      dailySeries:   withRolling,
      workoutTrend,
      weightSeries,
      summary: { avgCalories, avgProtein, totalWorkouts, totalBurned: Math.round(totalBurned) },
    });
  } catch (error) { next(error); }
};
