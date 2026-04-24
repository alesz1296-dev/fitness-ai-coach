import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useAuthStore } from "../../store/authStore";
import { dashboardApi } from "../../api";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import WeeklyPlanWidget from "../../components/WeeklyPlanWidget";
import type { DashboardData } from "../../types";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: string;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// ── Macro bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, target, color }: {
  label: string; value: number; target?: number; color: string;
}) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-800 font-semibold">
          {Math.round(value)}g{target ? ` / ${Math.round(target)}g` : ""}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then((res) => setData(res.data))
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

  const weightChartData = weightLogs.map((l) => ({
    date:   format(parseISO(l.date), "MMM d"),
    weight: l.weight,
  }));

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayName = user?.firstName || user?.username;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {displayName} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/nutrition")}>
            + Log Food
          </Button>
          <Button size="sm" onClick={() => navigate("/workouts")}>
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
        />
        <StatCard
          label="Protein Today"
          value={`${Math.round(today.totals.protein ?? 0)}g`}
          sub={activeGoal ? `of ${Math.round(activeGoal.proteinGrams)}g target` : "today"}
          color="bg-gradient-to-br from-blue-500 to-blue-700"
          icon="💪"
        />
        <StatCard
          label="Current Weight"
          value={weightLogs.at(-1) ? `${weightLogs.at(-1)!.weight}kg` : "—"}
          sub={activeGoal ? `target: ${activeGoal.targetWeight}kg` : "log your weight"}
          color="bg-gradient-to-br from-purple-500 to-purple-700"
          icon="⚖️"
        />
        <StatCard
          label="Workouts This Week"
          value={weeklyWorkoutCount}
          sub="in the last 7 days"
          color="bg-gradient-to-br from-brand-500 to-brand-700"
          icon="🏋️"
        />
      </div>

      {/* Streak + Water row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workout streak */}
        <div className="rounded-2xl bg-white border border-gray-100 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-orange-500 font-bold text-lg">
            🔥 {streaks?.workout ?? 0}
            <span className="text-sm font-normal text-gray-500">day streak</span>
          </div>
          <p className="text-xs text-gray-400">Workout streak</p>
          {(streaks?.workoutBest ?? 0) > 0 && (
            <p className="text-xs text-gray-400">Best: {streaks!.workoutBest} days</p>
          )}
        </div>

        {/* Nutrition streak */}
        <div className="rounded-2xl bg-white border border-gray-100 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
            🥗 {streaks?.nutrition ?? 0}
            <span className="text-sm font-normal text-gray-500">day streak</span>
          </div>
          <p className="text-xs text-gray-400">On-target nutrition</p>
          {(streaks?.cheatMealsThisWeek ?? 0) > 0 && (
            <p className="text-xs text-gray-400">🍕 {streaks!.cheatMealsThisWeek} cheat meal{streaks!.cheatMealsThisWeek > 1 ? "s" : ""} this week</p>
          )}
        </div>

        {/* Rest days */}
        <div className="rounded-2xl bg-white border border-gray-100 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-lg">
            😴 {streaks?.restDays != null ? streaks!.restDays : "—"}
            <span className="text-sm font-normal text-gray-500">day{streaks?.restDays !== 1 ? "s" : ""} rest</span>
          </div>
          <p className="text-xs text-gray-400">Since last workout</p>
          {today.hasWorkout && <p className="text-xs text-green-600 font-medium">✅ Trained today</p>}
        </div>

        {/* Water intake */}
        <div className="rounded-2xl bg-white border border-gray-100 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-bold text-lg">
              💧 {Math.round((water?.totalMl ?? 0) / 100) / 10}L
            </span>
            <span className="text-xs text-gray-400">/ {Math.round((water?.targetMl ?? 2000) / 100) / 10}L</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-400 transition-all"
              style={{ width: `${Math.min(100, ((water?.totalMl ?? 0) / (water?.targetMl ?? 2000)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">Water today</p>
        </div>
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
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="10" />
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
                <span className="text-2xl font-bold text-gray-900">{caloriePct}%</span>
                <span className="text-xs text-gray-500">consumed</span>
              </div>
            </div>
            <p className="mt-3 text-gray-800 font-semibold text-lg">{Math.round(calories)} kcal</p>
            <p className="text-gray-400 text-sm">of {Math.round(calorieTarget)} kcal</p>
            <p className={`text-sm font-medium mt-1 ${calorieTarget - calories < 0 ? "text-red-500" : "text-brand-600"}`}>
              {calorieTarget - calories > 0
                ? `${Math.round(calorieTarget - calories)} kcal remaining`
                : `${Math.round(Math.abs(calorieTarget - calories))} kcal over`}
            </p>
          </div>

          {/* Macros */}
          <div className="space-y-3 mt-2 border-t border-gray-100 pt-4">
            <MacroBar label="Protein" value={today.totals.protein ?? 0} target={activeGoal?.proteinGrams} color="bg-blue-500" />
            <MacroBar label="Carbs"   value={today.totals.carbs   ?? 0} target={activeGoal?.carbsGrams}   color="bg-yellow-400" />
            <MacroBar label="Fats"    value={today.totals.fats    ?? 0} target={activeGoal?.fatsGrams}    color="bg-red-400" />
          </div>
        </Card>

        {/* Weight chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weight Trend"
            subtitle="Last 14 days"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/progress")}>
                View all →
              </Button>
            }
          />
          {weightChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weightChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                  formatter={(v: number) => [`${v} kg`, "Weight"]}
                />
                <Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ fill: "#22c55e", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
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
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600 font-bold text-sm">
                      {w.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{w.name}</p>
                      <p className="text-xs text-gray-400">
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
                    <p className="font-semibold text-gray-800">{activeGoal.name || "My Goal"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
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
                    <span className="text-gray-400">
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
                    <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{item.value}</p>
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
                  className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left text-sm font-medium text-gray-700"
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
