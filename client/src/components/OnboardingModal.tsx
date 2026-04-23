import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usersApi, calorieGoalsApi, templatesApi } from "../api";
import { useAuthStore } from "../store/authStore";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import type { WorkoutTemplate } from "../types";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────
type GoalKey = "lose_fat" | "build_muscle" | "maintain" | "performance" | "body_recomp";
type Step = "goal" | "stats" | "plan";

interface Stats {
  weight: string; height: string; age: string;
  sex: "male" | "female" | "";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active" | "";
  trainingDays: number;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

const GOAL_OBJECTIVE: Record<GoalKey, string> = {
  lose_fat: "fat_loss", build_muscle: "hypertrophy",
  maintain: "general",  performance:  "endurance",
  body_recomp: "hypertrophy",
};

// ─────────────────────────────────────────────────────────────────────────────
// Projection helpers
// ─────────────────────────────────────────────────────────────────────────────
interface ProjectionPoint { week: number; weight: number; label: string }

function computeProjection(
  currentWeight: number,
  targetWeight: number,
  durationDays: number,
): ProjectionPoint[] {
  const totalWeeks = Math.max(1, Math.ceil(durationDays / 7));
  const weeklyDelta = (targetWeight - currentWeight) / totalWeeks;
  const today = new Date();
  return Array.from({ length: totalWeeks + 1 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i * 7);
    return {
      week:   i,
      weight: Math.round((currentWeight + i * weeklyDelta) * 10) / 10,
      label:  i === 0 ? "Now" : `W${i}`,
    };
  });
}

function computePlan(goal: GoalKey, stats: Stats) {
  const w = Number(stats.weight); const h = Number(stats.height);
  const a = Number(stats.age);   const sex = stats.sex;
  if (!w || !h || !a || !sex || !stats.activityLevel) return null;

  const bmr = sex === "male"
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;

  const tdee     = Math.round(bmr * ACTIVITY_MULTIPLIERS[stats.activityLevel]);
  const adj      = goal === "lose_fat" ? 0.8 : goal === "build_muscle" ? 1.1 : goal === "performance" ? 1.05 : 1.0;
  const target   = Math.round(tdee * adj);
  const protein  = Math.round(w * 2.0);
  const fats     = Math.round(target * 0.25 / 9);
  const carbs    = Math.max(0, Math.round((target - protein * 4 - fats * 9) / 4));
  return { tdee, target, protein, carbs, fats };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Goal selection
// ─────────────────────────────────────────────────────────────────────────────
const GOALS: { key: GoalKey; icon: string; label: string; desc: string; color: string }[] = [
  { key: "lose_fat",      icon: "🔥", label: "Lose Fat",                    desc: "Calorie deficit + cardio focus",          color: "border-orange-300 bg-orange-50 text-orange-700" },
  { key: "build_muscle",  icon: "💪", label: "Build Muscle",                desc: "Calorie surplus + progressive overload",   color: "border-blue-300 bg-blue-50 text-blue-700" },
  { key: "body_recomp",   icon: "🔄", label: "Gain Muscle, Maintain Fat %", desc: "Body recomposition — eat at TDEE",         color: "border-cyan-300 bg-cyan-50 text-cyan-700" },
  { key: "maintain",      icon: "⚖️", label: "Maintain Weight",             desc: "Balance calories and stay active",         color: "border-green-300 bg-green-50 text-green-700" },
  { key: "performance",   icon: "⚡", label: "Performance",                 desc: "Endurance, speed, and athletic goals",     color: "border-purple-300 bg-purple-50 text-purple-700" },
];

function GoalStep({ onSelect }: { onSelect: (g: GoalKey) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-2xl mb-2">👋</p>
        <h2 className="text-xl font-bold text-gray-900">Welcome to FitAI Coach!</h2>
        <p className="text-sm text-gray-500 mt-1">Let's set up your plan in 2 minutes. What's your primary goal?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((g) => (
          <button
            key={g.key}
            onClick={() => onSelect(g.key)}
            className={`border-2 rounded-xl p-4 text-left transition-all hover:shadow-md ${g.color}`}
          >
            <div className="text-2xl mb-2">{g.icon}</div>
            <p className="font-semibold text-sm">{g.label}</p>
            <p className="text-xs opacity-75 mt-0.5">{g.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Stats
// ─────────────────────────────────────────────────────────────────────────────
function StatsStep({ stats, setStats, onBack, onNext }: {
  stats: Stats; setStats: (s: Stats) => void;
  onBack: () => void; onNext: () => void;
}) {
  const update = (field: keyof Stats, val: string | number) =>
    setStats({ ...stats, [field]: val });

  const ACTIVITY_OPTIONS = [
    { value: "sedentary",   label: "Sedentary (desk job, little exercise)" },
    { value: "light",       label: "Light (1-3 days/week)" },
    { value: "moderate",    label: "Moderate (3-5 days/week)" },
    { value: "active",      label: "Active (6-7 days/week)" },
    { value: "very_active", label: "Very Active (twice daily / physical job)" },
  ];

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">About You</h2>
        <p className="text-sm text-gray-500 mt-0.5">Used to calculate your personalised targets. All optional.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Weight (kg)" type="number" value={stats.weight}
          onChange={(e) => update("weight", e.target.value)} placeholder="75" />
        <Input label="Height (cm)" type="number" value={stats.height}
          onChange={(e) => update("height", e.target.value)} placeholder="175" />
        <Input label="Age" type="number" value={stats.age}
          onChange={(e) => update("age", e.target.value)} placeholder="25" />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sex</label>
          <div className="flex gap-2">
            {(["male", "female"] as const).map((s) => (
              <button
                key={s}
                onClick={() => update("sex", s)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  stats.sex === s
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-gray-200 text-gray-600 hover:border-brand-400"
                }`}
              >
                {s === "male" ? "♂ Male" : "♀ Female"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Activity Level</label>
        <select
          value={stats.activityLevel}
          onChange={(e) => update("activityLevel", e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select activity level…</option>
          {ACTIVITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Training Days / Week</label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              onClick={() => update("trainingDays", d)}
              className={`w-10 h-10 rounded-xl text-sm font-semibold border transition-colors ${
                stats.trainingDays === d
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-gray-200 text-gray-600 hover:border-brand-400"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onBack}>← Back</Button>
        <Button className="flex-1" onClick={onNext}>See Your Plan →</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Plan preview
// ─────────────────────────────────────────────────────────────────────────────
function PlanStep({ goal, stats, onBack, onComplete, onSkip }: {
  goal: GoalKey; stats: Stats;
  onBack: () => void; onComplete: () => void; onSkip: () => void;
}) {
  const plan      = computePlan(goal, stats);
  const goalEntry = GOALS.find((g) => g.key === goal)!;

  const [template,   setTemplate]   = useState<WorkoutTemplate | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [projection, setProjection] = useState<ProjectionPoint[]>([]);

  useEffect(() => {
    // Fetch a relevant recommended template
    templatesApi.getRecommended().then((res) => {
      const all: WorkoutTemplate[] = res.data.all || Object.values(res.data.grouped).flat();
      const objective = GOAL_OBJECTIVE[goal];
      const match = all.find((t) => t.objective === objective && t.isSystem) ?? all[0] ?? null;
      setTemplate(match);
    }).catch(() => {});
  }, [goal]);

  // Compute projection whenever we have enough data
  useEffect(() => {
    const w = Number(stats.weight);
    if (!w || !plan) { setProjection([]); return; }
    const durationDays = goal === "lose_fat" || goal === "build_muscle" ? 90 : 60;
    const targetWeight =
      goal === "lose_fat"     ? Math.max(w - 8, 40)
      : goal === "build_muscle" ? w + 5
      : w;
    setProjection(computeProjection(w, targetWeight, durationDays));
  }, [goal, stats.weight, plan]);

  const handleAccept = async () => {
    setSaving(true);
    try {
      // 1. Save profile
      const profileData: Record<string, any> = {
        goal: goalEntry.label,
        ...(stats.weight     && { weight:        Number(stats.weight) }),
        ...(stats.height     && { height:        Number(stats.height) }),
        ...(stats.age        && { age:           Number(stats.age) }),
        ...(stats.sex        && { sex:           stats.sex }),
        ...(stats.activityLevel && { activityLevel: stats.activityLevel }),
      };
      await usersApi.updateProfile(profileData);

      // 2. Create calorie goal if we have enough data
      if (plan && stats.weight) {
        const today      = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (goal === "lose_fat" || goal === "build_muscle" ? 90 : 60));
        const targetWeight =
          goal === "lose_fat"     ? Math.max(Number(stats.weight) - 8, 40)
          : goal === "build_muscle" ? Number(stats.weight) + 5
          : Number(stats.weight);

        await calorieGoalsApi.create({
          currentWeight: Number(stats.weight),
          targetWeight,
          targetDate: targetDate.toISOString().split("T")[0],
          name: `${goalEntry.label} Plan`,
          aiGenerated: false,
        });
      }

      onComplete();
    } catch { /* best-effort — profile might partially save */ onComplete(); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Your Starting Plan</h2>
        <p className="text-sm text-gray-500 mt-0.5">Based on your goal: <strong>{goalEntry.icon} {goalEntry.label}</strong></p>
      </div>

      {plan ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
            <p className="text-xs text-brand-600 font-medium mb-1">Daily Calorie Target</p>
            <p className="text-3xl font-bold text-brand-700">{plan.target} <span className="text-base font-normal">kcal</span></p>
            <p className="text-xs text-brand-500 mt-0.5">TDEE: {plan.tdee} kcal</p>
          </div>
          {[
            { label: "Protein",        value: `${plan.protein}g`,  color: "text-blue-600" },
            { label: "Carbohydrates",  value: `${plan.carbs}g`,    color: "text-yellow-600" },
            { label: "Fats",           value: `${plan.fats}g`,     color: "text-red-500" },
            { label: "Training Days",  value: `${stats.trainingDays}×/wk`, color: "text-gray-700" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl px-4 py-5 text-center text-sm text-gray-400">
          Complete your stats to see personalised calorie targets.
        </div>
      )}

      {/* Weight projection chart */}
      {projection.length > 1 && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 font-medium mb-2">WEIGHT PROJECTION</p>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={projection} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(v: number) => [`${v} kg`, "Weight"]}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <ReferenceLine
                y={projection[projection.length - 1].weight}
                stroke="#6366f1"
                strokeDasharray="4 3"
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#projGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {Number(stats.weight)} kg → {projection[projection.length - 1].weight} kg
            &nbsp;over {projection.length - 1} weeks
          </p>
        </div>
      )}

      {/* Recommended template */}
      {template && (
        <div className="border border-gray-200 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1 font-medium">RECOMMENDED WORKOUT SPLIT</p>
          <p className="font-semibold text-gray-800">{template.name}</p>
          <p className="text-xs text-gray-500">{template.dayLabel} · {template.frequency}×/week · {template.objective}</p>
          {template.description && (
            <p className="text-xs text-gray-400 mt-1">{template.description}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
        <Button variant="secondary" className="flex-1" onClick={onSkip}>Skip for now</Button>
        <Button className="flex-1" loading={saving} onClick={handleAccept}>
          Start with this plan ✓
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal wrapper
// ─────────────────────────────────────────────────────────────────────────────
export function OnboardingModal({ open, onComplete, onSkip }: {
  open: boolean; onComplete: () => void; onSkip: () => void;
}) {
  const navigate      = useNavigate();
  const { updateUser } = useAuthStore();
  const [step,  setStep]  = useState<Step>("goal");
  const [goal,  setGoal]  = useState<GoalKey | null>(null);
  const [stats, setStats] = useState<Stats>({
    weight: "", height: "", age: "", sex: "", activityLevel: "", trainingDays: 3,
  });

  // Reset when opened
  useEffect(() => {
    if (open) { setStep("goal"); setGoal(null); }
  }, [open]);

  const handleGoalSelect = (g: GoalKey) => { setGoal(g); setStep("stats"); };
  const handleComplete   = async () => {
    // Re-fetch user profile so the store reflects saved data
    try {
      const res = await usersApi.getProfile();
      updateUser(res.data.user);
    } catch { /* ignore */ }
    onComplete();
    navigate("/workouts?tab=templates");
  };

  if (!open) return null;

  // Progress dots
  const steps: Step[] = ["goal", "stats", "plan"];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i <= stepIdx ? "w-8 bg-brand-600" : "w-4 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === "goal" && (
          <GoalStep onSelect={handleGoalSelect} />
        )}
        {step === "stats" && goal && (
          <StatsStep
            stats={stats}
            setStats={setStats}
            onBack={() => setStep("goal")}
            onNext={() => setStep("plan")}
          />
        )}
        {step === "plan" && goal && (
          <PlanStep
            goal={goal}
            stats={stats}
            onBack={() => setStep("stats")}
            onComplete={handleComplete}
            onSkip={onSkip}
          />
        )}

        {/* Skip link */}
        {step === "goal" && (
          <p className="text-center mt-4">
            <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Skip setup for now
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
