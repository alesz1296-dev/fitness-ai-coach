import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend,
} from "recharts";
import { format, parseISO, addWeeks } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { dashboardApi, calorieGoalsApi, weightApi } from "../../api";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import WeeklyPlanWidget from "../../components/WeeklyPlanWidget";
import { useIsDark } from "../../hooks/useDarkMode";
import type { DashboardData } from "../../types";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, onClick }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={`rounded-2xl p-5 text-white ${color} w-full text-left${onClick ? " hover:opacity-90 active:opacity-80 transition-opacity cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
      {onClick && <p className="text-[10px] opacity-50 mt-2 text-right">tap to view →</p>}
    </Tag>
  );
}

// ── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, target, color }: {
  label: string; value: number; target?: number; color: string;
}) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;

  // Glow: blue at >=70%, green at >=100%
  const fillClass  = pct >= 100 ? "bg-green-500" : color;
  const glowStyle: React.CSSProperties =
    pct >= 100
      ? { boxShadow: "0 0 8px 2px rgba(34,197,94,0.45)" }
      : pct >= 70
      ? { boxShadow: "0 0 8px 2px rgba(59,130,246,0.40)" }
      : {};

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-300 font-medium">{label}</span>
        <span className={pct >= 100 ? "text-green-500 font-semibold" : "text-gray-800 dark:text-gray-100 font-semibold"}>
          {Math.round(value)}g{target ? ` / ${Math.round(target)}g` : ""}
          {pct >= 100 && <span className="ml-1">✓</span>}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden" style={glowStyle}>
        <div className={`h-full rounded-full transition-all duration-500 ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  const [data,       setData]       = useState<DashboardData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [projection, setProjection] = useState<{ projected: any[]; actual: any[] } | null>(null);

  // ── Weight FAB ───────────────────────────────────────────────────────────────
  const [showWeightFab,  setShowWeightFab]  = useState(false);
  const [weightVal,      setWeightVal]      = useState("");
  const [savingWeight,   setSavingWeight]   = useState(false);
  const [weightSaved,    setWeightSaved]    = useState(false);

  // ── Weight log manager (edit / delete past entries) ──────────────────────────
  const [showWeightManager, setShowWeightManager] = useState(false);
  const [editingLog, setEditingLog]   = useState<{ id: number; weight: number; date: string } | null>(null);
  const [editVal,    setEditVal]      = useState("");
  const [savingEdit, setSavingEdit]   = useState(false);

  const refreshDash = () => dashboardApi.get().then((r) => setData(r.data)).catch(() => {});

  const handleDeleteWeight = async (id: number) => {
    if (!confirm("Delete this weight entry?")) return;
    try { await weightApi.delete(id); refreshDash(); } catch { /* silent */ }
  };
  const handleEditWeight = async () => {
    if (!editingLog) return;
    const w = parseFloat(editVal);
    if (isNaN(w) || w <= 0) return;
    setSavingEdit(true);
    try {
      await weightApi.update(editingLog.id, { weight: w });
      setEditingLog(null);
      refreshDash();
    } catch { /* silent */ }
    finally { setSavingEdit(false); }
  };

  // ── Dark mode (must be before any early return — Rules of Hooks) ─────────────
  const isDark = useIsDark();

  // Dynamic chart colors that adapt to dark mode
  const chartColors = {
    grid:    isDark ? "#374151" : "#f0f0f0",   // gray-700 vs light gray
    tick:    isDark ? "#9ca3af" : "#9ca3af",   // same gray-400 both modes
    tooltip: isDark ? { background: "#1f2937", border: "#374151", color: "#f3f4f6" }
                    : { background: "#ffffff", border: "#e5e7eb", color: "#111827" },
    ring:    isDark ? "#374151" : "#f3f4f6",   // track ring color
  };

  const handleLogWeight = async () => {
    const w = parseFloat(weightVal);
    if (isNaN(w) || w <= 0) return;
    setSavingWeight(true);
    try {
      await weightApi.log({ weight: w });
      setWeightSaved(true);
      setWeightVal("");
      setTimeout(() => { setShowWeightFab(false); setWeightSaved(false); }, 800);
      // Refresh dashboard data
      dashboardApi.get().then((r) => setData(r.data)).catch(() => {});
    } catch { /* silent */ }
    finally { setSavingWeight(false); }
  };

  useEffect(() => {
    dashboardApi.get()
      .then((res) => {
        setData(res.data);
        // Load projection if there's an active goal
        if (res.data.activeGoal) {
          calorieGoalsApi.getProjection(res.data.activeGoal.id)
            .then((pr) => setProjection({ projected: pr.data.projected, actual: pr.data.actual }))
            .catch(() => { /* no projection available */ });
        }
      })
      .catch(() => { /* silently fail — show empty state */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const {
    today, weightLogs, recentWorkouts, weeklyWorkoutCount, activeGoal,
    effectiveCalorieTarget, water, streaks,
  } = data ?? {
    today: { totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, logs: [], date: "", hasWorkout: false },
    weightLogs: [], recentWorkouts: [], weeklyWorkoutCount: 0, activeGoal: null,
    effectiveCalorieTarget: null,
    water: { totalMl: 0, targetMl: 2000, logs: [] },
    streaks: { workout: 0, workoutBest: 0, nutrition: 0, restDays: null, cheatMealsThisWeek: 0 },
  };

  const calories      = today.totals.calories;
  const calorieTarget = effectiveCalorieTarget ?? activeGoal?.dailyCalories ?? 2000;
  const caloriePct    = Math.min(100, Math.round((calories / calorieTarget) * 100));

  // Calories burned from today's workouts (sum from recentWorkouts matching today's date)
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const caloriesBurnedToday = recentWorkouts
    .filter((w) => w.date.startsWith(todayStr) && w.caloriesBurned)
    .reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0);

  // Net = consumed - burned (how much net you've eaten after exercise)
  const netCalories = calories - caloriesBurnedToday;

  // Build merged chart data: actual weight logs + projection overlay
  const weightChartData = (() => {
    // Map actual logs by date string for merging
    const actualMap: Record<string, number> = {};
    weightLogs.forEach((l) => {
      const key = format(parseISO(l.date), "MMM d");
      actualMap[key] = l.weight;
    });

    // Collect all date keys (actual + projected)
    const allKeys = new Set<string>(Object.keys(actualMap));

    if (projection?.projected?.length) {
      // Project data has { week, date, projectedWeight } - show up to 8 weeks out
      projection.projected.slice(0, 8).forEach((p: any) => {
        // Accept both "date" field (ISO) and "week" offset
        const d = p.date ? format(parseISO(p.date), "MMM d")
                         : format(addWeeks(new Date(), p.week), "MMM d");
        allKeys.add(d);
      });
    }

    // Build projection map
    const projMap: Record<string, number> = {};
    if (projection?.projected?.length) {
      projection.projected.slice(0, 8).forEach((p: any) => {
        const d = p.date ? format(parseISO(p.date), "MMM d")
                         : format(addWeeks(new Date(), p.week), "MMM d");
        projMap[d] = p.projectedWeight;
      });
    }

    // Merge: sort chronologically by using original log order then projected future dates
    const actualPoints = weightLogs.map((l) => {
      const key = format(parseISO(l.date), "MMM d");
      return { date: key, weight: l.weight, projected: projMap[key] ?? undefined };
    });

    const actualKeys = new Set(actualPoints.map((p) => p.date));
    const futurePoints = projection?.projected
      ?.slice(0, 8)
      .map((p: any) => {
        const key = p.date ? format(parseISO(p.date), "MMM d")
                           : format(addWeeks(new Date(), p.week), "MMM d");
        return { date: key, projected: p.projectedWeight, weight: undefined };
      })
      .filter((p) => !actualKeys.has(p.date)) ?? [];

    return [...actualPoints, ...futurePoints];
  })();

  const hasProjection = projection?.projected && projection.projected.length > 0;

  // ── Projection status badge ────────────────────────────────────────────────
  const projectionStatus = (() => {
    if (!hasProjection || !activeGoal || weightLogs.length === 0) return null;
    const currentWeight = weightLogs.at(-1)!.weight;

    // Find projected weight point closest to today
    const projectedPoints = projection!.projected;
    let closest: any = null;
    let closestDiff = Infinity;
    for (const p of projectedPoints) {
      const pDate = p.date
        ? p.date.substring(0, 10)
        : format(addWeeks(new Date(), p.week), "yyyy-MM-dd");
      const diff = Math.abs(new Date(pDate).getTime() - new Date(todayStr).getTime());
      if (diff < closestDiff) { closestDiff = diff; closest = p; }
    }
    if (!closest) return null;

    const expectedWeight = closest.projectedWeight;
    const delta = currentWeight - expectedWeight; // positive = heavier than expected

    // "ahead" for cut means losing faster (actual < expected, delta < 0)
    // "ahead" for bulk means gaining faster (actual > expected, delta > 0)
    const threshold = 0.5;
    const isAhead  = activeGoal.type === "cut"  ? delta < -threshold : delta > threshold;
    const isBehind = activeGoal.type === "cut"  ? delta > threshold  : delta < -threshold;

    if (isAhead)  return { label: "🚀 Ahead of Schedule", cls: "bg-green-100 text-green-700" };
    if (isBehind) return { label: "⚠️ Slightly Behind",   cls: "bg-amber-100  text-amber-700" };
    return           { label: "✅ On Track",               cls: "bg-blue-100   text-blue-700"  };
  })();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayName = user?.firstName || user?.username;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {displayName} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/nutrition")} className="flex-1 sm:flex-none">
            + Log Food
          </Button>
          <Button size="sm" onClick={() => navigate("/workouts")} className="flex-1 sm:flex-none">
            + Log Workout
          </Button>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Calories Today"
          value={Math.round(calories)}
          sub={`of ${Math.round(calorieTarget)} kcal target`}
          color="bg-gradient-to-br from-orange-400 to-orange-600"
          icon="🔥"
          onClick={() => navigate("/nutrition")}
        />
        <StatCard
          label="Protein Today"
          value={`${Math.round(today.totals.protein ?? 0)}g`}
          sub={activeGoal ? `of ${Math.round(activeGoal.proteinGrams)}g target` : "today"}
          color="bg-gradient-to-br from-blue-500 to-blue-700"
          icon="💪"
          onClick={() => navigate("/nutrition")}
        />
        <StatCard
          label="Current Weight"
          value={weightLogs.at(-1) ? `${weightLogs.at(-1)!.weight}kg` : "—"}
          sub={activeGoal ? `target: ${activeGoal.targetWeight}kg` : "log your weight"}
          color="bg-gradient-to-br from-purple-500 to-purple-700"
          icon="⚖️"
          onClick={() => setShowWeightManager((v) => !v)}
        />
        <StatCard
          label="Workouts This Week"
          value={weeklyWorkoutCount}
          sub="in the last 7 days"
          color="bg-gradient-to-br from-brand-500 to-brand-700"
          icon="🏋️"
          onClick={() => navigate("/workouts")}
        />
      </div>

      {/* Streak + Water row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workout streak */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-orange-500 font-bold text-lg">
            🔥 {streaks?.workout ?? 0}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">day streak</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Workout streak</p>
          {(streaks?.workoutBest ?? 0) > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Best: {streaks!.workoutBest} days</p>
          )}
        </div>

        {/* Nutrition streak */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
            🥗 {streaks?.nutrition ?? 0}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">day streak</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">On-target nutrition</p>
          {(streaks?.cheatMealsThisWeek ?? 0) > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">🍕 {streaks!.cheatMealsThisWeek} cheat meal{streaks!.cheatMealsThisWeek > 1 ? "s" : ""} this week</p>
          )}
        </div>

        {/* Rest days */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-lg">
            😴 {streaks?.restDays != null ? streaks!.restDays : "—"}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">day{streaks?.restDays !== 1 ? "s" : ""} rest</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Since last workout</p>
          {today.hasWorkout && <p className="text-xs text-green-600 font-medium">✅ Trained today</p>}
        </div>

        {/* Water intake */}
        <button
          onClick={() => navigate("/nutrition#water")}
          className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col gap-2 text-left hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer w-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-bold text-lg">
              💧 {Math.round((water?.totalMl ?? 0) / 100) / 10}L
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">/ {Math.round((water?.targetMl ?? 2000) / 100) / 10}L</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-400 transition-all"
              style={{ width: `${Math.min(100, ((water?.totalMl ?? 0) / (water?.targetMl ?? 2000)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">Water today · tap to log →</p>
        </button>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calorie progress */}
        <Card className="lg:col-span-1">
          <CardHeader title="Today's Calories" subtitle={format(new Date(), "MMMM d")} />
          <div className="flex flex-col items-center py-4">
            {/* Ring */}
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke={chartColors.ring} strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={caloriePct >= 100 ? "#ef4444" : "#22c55e"}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - caloriePct / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{caloriePct}%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">consumed</span>
              </div>
            </div>
            <p className="mt-3 text-gray-800 dark:text-gray-100 font-semibold text-lg">{Math.round(calories)} kcal</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">of {Math.round(calorieTarget)} kcal</p>
            <p className={`text-sm font-medium mt-1 ${calorieTarget - calories < 0 ? "text-red-500" : "text-brand-600"}`}>
              {calorieTarget - calories > 0
                ? `${Math.round(calorieTarget - calories)} kcal remaining`
                : `${Math.round(Math.abs(calorieTarget - calories))} kcal over`}
            </p>

            {/* No-goal CTA nudge */}
            {!activeGoal && (
              <button
                onClick={() => navigate("/goals")}
                className="mt-3 w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center justify-between hover:bg-amber-100 transition-colors text-left"
              >
                <div>
                  <p className="text-xs font-semibold text-amber-700">No calorie goal set</p>
                  <p className="text-xs text-amber-600 mt-0.5">Set a goal to track your progress</p>
                </div>
                <span className="text-amber-500 font-bold text-base ml-2">→</span>
              </button>
            )}

            {/* Burned calories row — only shown if today has workout calories */}
            {caloriesBurnedToday > 0 && (
              <div className="mt-3 w-full bg-orange-50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-orange-600 font-medium">🔥 Burned today</span>
                <span className="text-orange-700 font-bold">−{Math.round(caloriesBurnedToday)} kcal</span>
              </div>
            )}
            {caloriesBurnedToday > 0 && (
              <div className="mt-1 w-full bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Net calories</span>
                <span className={`font-bold ${netCalories > calorieTarget ? "text-red-600" : "text-gray-700 dark:text-gray-200"}`}>
                  {Math.round(netCalories)} kcal
                </span>
              </div>
            )}
          </div>

          {/* Macros */}
          <div className="space-y-3 mt-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            <MacroBar label="Protein" value={today.totals.protein ?? 0} target={activeGoal?.proteinGrams} color="bg-blue-500" />
            <MacroBar label="Carbs"   value={today.totals.carbs   ?? 0} target={activeGoal?.carbsGrams}   color="bg-yellow-400" />
            <MacroBar label="Fats"    value={today.totals.fats    ?? 0} target={activeGoal?.fatsGrams}    color="bg-red-400" />
          </div>

          {/* Macro cycling day type badge */}
          {activeGoal?.macrosCycling && (
            <div className="mt-3 flex justify-center">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                today.hasWorkout
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {today.hasWorkout ? "🏋️ Training Day Macros" : "😴 Rest Day Macros"}
              </span>
            </div>
          )}
        </Card>

        {/* Weight chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weight Trend"
            subtitle={hasProjection ? "Actual + projected to goal" : "Last 14 days"}
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/progress")}>
                View all →
              </Button>
            }
          />
          {weightChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={weightChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartColors.tick }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: chartColors.tick }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: `1px solid ${chartColors.tooltip.border}`, fontSize: "13px", backgroundColor: chartColors.tooltip.background, color: chartColors.tooltip.color }}
                    formatter={(v: number, name: string) => [
                      v != null ? `${Number(v).toFixed(1)} kg` : null,
                      name === "weight" ? "Actual" : "Projected",
                    ]}
                  />
                  {hasProjection && <Legend iconType="line" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />}
                  <Area
                    type="monotone"
                    dataKey="weight"
                    name="weight"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fill="url(#weightGrad)"
                    dot={{ fill: "#22c55e", r: 3 }}
                    connectNulls={false}
                  />
                  {hasProjection && (
                    <Line
                      type="monotone"
                      dataKey="projected"
                      name="projected"
                      stroke="#818cf8"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      connectNulls
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
              {hasProjection && activeGoal && (
                <div className="flex items-center justify-between mt-2 px-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Target: <span className="font-semibold text-gray-700 dark:text-gray-200">{activeGoal.targetWeight} kg</span>
                  </span>
                  <span>
                    by <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {format(parseISO(activeGoal.targetDate), "MMM d, yyyy")}
                    </span>
                  </span>
                  {weightLogs.length > 0 && (
                    <span className={`font-semibold ${
                      (activeGoal.type === "cut"
                        ? weightLogs.at(-1)!.weight < activeGoal.targetWeight
                        : weightLogs.at(-1)!.weight > activeGoal.targetWeight)
                        ? "text-green-600" : "text-gray-700 dark:text-gray-200"
                    }`}>
                      {Math.abs(weightLogs.at(-1)!.weight - activeGoal.targetWeight).toFixed(1)} kg to go
                    </span>
                  )}
                </div>
              )}
              {/* On-track status badge */}
              {projectionStatus && (
                <div className="flex justify-center mt-3">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${projectionStatus.cls}`}>
                    {projectionStatus.label}
                  </span>
                </div>
              )}

              {/* ── Weight log history: edit / delete ── */}
              <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                <button
                  onClick={() => setShowWeightManager((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full justify-between"
                >
                  <span className="font-medium">📋 Weight Log History ({weightLogs.length} entries)</span>
                  <span>{showWeightManager ? "▲ Hide" : "▼ Show"}</span>
                </button>
                {showWeightManager && (
                  <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {[...weightLogs].reverse().map((log) => {
                      const isEditing = editingLog?.id === log.id;
                      const dateStr   = typeof log.date === "string"
                        ? log.date.split("T")[0]
                        : new Date(log.date).toISOString().split("T")[0];
                      return (
                        <div key={log.id} className="flex items-center gap-2 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-400 dark:text-gray-500 w-22 flex-shrink-0">{dateStr}</span>
                          {isEditing ? (
                            <>
                              <input
                                type="number" step="0.1" min="20" max="400"
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleEditWeight(); if (e.key === "Escape") setEditingLog(null); }}
                                autoFocus
                                className="flex-1 border border-brand-300 dark:border-brand-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
                              />
                              <span className="text-[10px] text-gray-400">kg</span>
                              <button onClick={handleEditWeight} disabled={savingEdit} className="px-2 py-1 rounded-lg bg-brand-500 text-white text-[10px] font-semibold hover:bg-brand-600 disabled:opacity-50">
                                {savingEdit ? "…" : "Save"}
                              </button>
                              <button onClick={() => setEditingLog(null)} className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-[10px] hover:bg-gray-300 dark:hover:bg-gray-500">
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{log.weight} kg</span>
                              <button
                                onClick={() => { setEditingLog({ id: log.id, weight: log.weight, date: dateStr }); setEditVal(String(log.weight)); setShowWeightManager(true); }}
                                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 transition-colors"
                              >Edit</button>
                              <button
                                onClick={() => handleDeleteWeight(log.id)}
                                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors"
                              >Delete</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-3">⚖️</span>
              <p className="text-sm">No weight data yet</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate("/progress")}>
                Log your weight
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* ── Weight FAB ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-28 right-4 z-50 flex flex-col items-end gap-3 md:bottom-8 md:right-8">
        {showWeightFab && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 w-56 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">⚖️ Log Weight</p>
            {weightSaved ? (
              <p className="text-center text-green-600 font-medium text-sm py-1">✅ Saved!</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="400"
                    placeholder="e.g. 80.5"
                    value={weightVal}
                    onChange={(e) => setWeightVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogWeight()}
                    className="flex-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">kg</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => { setShowWeightFab(false); setWeightVal(""); }}>
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1" loading={savingWeight} onClick={handleLogWeight}>
                    Save
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        <button
          onClick={() => setShowWeightFab((v) => !v)}
          className="w-14 h-14 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors"
          title="Log today's weight"
        >
          ⚖️
        </button>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent workouts */}
        <Card>
          <CardHeader
            title="Recent Workouts"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/workouts")}>
                View all →
              </Button>
            }
          />
          {recentWorkouts.length > 0 ? (
            <div className="space-y-3">
              {recentWorkouts.slice(0, 4).map((w) => (
                <div
                  key={w.id}
                  onClick={() => navigate(`/workouts/${w.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 font-bold text-sm">
                      {w.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{w.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {format(parseISO(w.date), "MMM d")} · {w.duration}min · {w.exercises.length} exercises
                      </p>
                    </div>
                  </div>
                  {w.caloriesBurned && (
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                      {Math.round(w.caloriesBurned)} kcal
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-3">🏋️</span>
              <p className="text-sm">No workouts logged yet</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate("/workouts")}>
                Log your first workout
              </Button>
            </div>
          )}
        </Card>

        {/* Active goal + quick actions */}
        <div className="space-y-4">
          {/* Active calorie goal */}
          <Card>
            <CardHeader
              title="Active Goal"
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate("/goals")}>
                  Manage →
                </Button>
              }
            />
            {activeGoal ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{activeGoal.name || "My Goal"}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {activeGoal.currentWeight}kg → {activeGoal.targetWeight}kg ·{" "}
                      {activeGoal.type === "cut" ? "Cutting" : activeGoal.type === "bulk" ? "Bulking" : "Maintaining"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    activeGoal.type === "cut"  ? "bg-blue-100 text-blue-700" :
                    activeGoal.type === "bulk" ? "bg-green-100 text-green-700" :
                                                  "bg-gray-100 text-gray-600"
                  }`}>
                    {activeGoal.type === "cut" ? "Cut" : activeGoal.type === "bulk" ? "Bulk" : "Maintain"}
                  </span>
                </div>
                {activeGoal.macrosCycling && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      🔄 Macro Cycling
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {today.hasWorkout ? "🏋️ Train day" : "😴 Rest day"} active
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Calories", value: `${Math.round(effectiveCalorieTarget ?? activeGoal.dailyCalories)} kcal` },
                    { label: "Protein",  value: `${Math.round(activeGoal.proteinGrams)}g` },
                    { label: "Weekly",   value: `${activeGoal.weeklyChange > 0 ? "+" : ""}${activeGoal.weeklyChange}kg` },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5">
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No active goal set</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate("/goals")}>
                  Set a goal
                </Button>
              </div>
            )}
          </Card>

          {/* Weekly Plan */}
          <WeeklyPlanWidget />

          {/* Quick actions */}
          <Card>
            <CardHeader title="Quick Actions" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Chat with AI Coach",  icon: "🤖", to: "/chat?agent=coach" },
                { label: "Nutrition Advice",    icon: "🥗", to: "/chat?agent=nutritionist" },
                { label: "Browse Templates",    icon: "📋", to: "/templates" },
                { label: "Monthly Report",      icon: "📊", to: "/reports" },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-400 transition-colors text-left text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  <span>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
