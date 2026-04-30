import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../api";
import { useAuthStore } from "../../store/authStore";

interface SummaryData {
  goalType: string | null;
  dailyCalories: number | null;
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFats: number;
  bodyFatPct: number | null;
}

export function ProfileSummaryBar() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    if (!user) return;
    dashboardApi.get().then((r) => {
      const d = r.data;
      const goal = d.activeGoal;
      // Estimate body fat from weight/height/age/sex if all available
      let bf: number | null = null;
      if (user.weight && user.height && user.age && user.sex) {
        const bmi = user.weight / ((user.height / 100) ** 2);
        bf = user.sex === "male"
          ? Math.round((1.20 * bmi + 0.23 * user.age - 16.2) * 10) / 10
          : Math.round((1.20 * bmi + 0.23 * user.age - 5.4) * 10) / 10;
        if (bf < 3 || bf > 60) bf = null;
      }
      setData({
        goalType:      goal?.type ?? null,
        dailyCalories: goal?.dailyCalories ?? null,
        todayCalories: d.today.totals.calories,
        todayProtein:  d.today.totals.protein,
        todayCarbs:    d.today.totals.carbs,
        todayFats:     d.today.totals.fats,
        bodyFatPct:    bf,
      });
    }).catch(() => {});
  }, [user]);

  if (!data) return null;

  const GOAL_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
    cut:      { label: "Cut",      emoji: "🔥", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800" },
    bulk:     { label: "Bulk",     emoji: "💪", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
    maintain: { label: "Maintain", emoji: "⚖️", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
  };

  const goalInfo = data.goalType ? GOAL_LABELS[data.goalType] : null;
  const calPct   = data.dailyCalories && data.dailyCalories > 0
    ? Math.round((data.todayCalories / data.dailyCalories) * 100)
    : null;
  const calColor = calPct != null && calPct > 100 ? "text-red-600" : calPct != null && calPct >= 80 ? "text-amber-600" : "text-gray-700 dark:text-gray-200";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-2 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex items-center gap-2 flex-wrap">

        {/* Active goal pill → Progress tab */}
        {goalInfo && (
          <button
            onClick={() => navigate("/progress")}
            title="View your active goal in Progress & Goals"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all hover:opacity-80 ${goalInfo.color}`}
          >
            <span>{goalInfo.emoji}</span>
            <span>{goalInfo.label}</span>
            {data.dailyCalories && (
              <span className="opacity-70">· {Math.round(data.dailyCalories)} kcal</span>
            )}
          </button>
        )}

        {/* Body fat pill → Progress tab */}
        {data.bodyFatPct != null && (
          <button
            onClick={() => navigate("/progress")}
            title="View body composition in Progress & Goals"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 text-xs font-medium hover:opacity-80 transition-all"
          >
            <span>🫀</span>
            <span>~{data.bodyFatPct}% BF</span>
          </button>
        )}

        {/* Today calories → Nutrition tab */}
        <button
          onClick={() => navigate("/nutrition")}
          title="View today's nutrition log"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium hover:opacity-80 transition-all"
        >
          <span>🔥</span>
          <span className={calColor}>
            {Math.round(data.todayCalories)} kcal
            {calPct != null && <span className="ml-1 opacity-60">({calPct}%)</span>}
          </span>
        </button>

        {/* Today macros → Nutrition tab */}
        <button
          onClick={() => navigate("/nutrition")}
          title="View today's macros in Nutrition"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 hover:opacity-80 transition-all"
        >
          <span className="text-blue-500">P</span>
          <span>{Math.round(data.todayProtein)}g</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-amber-500">C</span>
          <span>{Math.round(data.todayCarbs)}g</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-red-500">F</span>
          <span>{Math.round(data.todayFats)}g</span>
        </button>

      </div>
    </div>
  );
}
