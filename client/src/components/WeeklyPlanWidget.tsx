import { useState, useEffect, useCallback } from "react";
import { startOfWeek, addDays, format, isToday, parseISO } from "date-fns";
import { weeklyPlanApi } from "../api";
import type { WeeklyPlan, WeeklyPlanDay } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Workout plan templates ────────────────────────────────────────────────────

interface PlanTemplate {
  id: string;
  name: string;
  level: "intermediate" | "advanced";
  days: number;
  splitType: string;
  description: string;
  tags: string[];
  schedule: { dayIndex: number; label: string }[];
}

const PLAN_TEMPLATES: PlanTemplate[] = [
  // ── 2 days ──────────────────────────────────────────────────────────────────
  {
    id: "2-int",
    name: "Full Body x2",
    level: "intermediate",
    days: 2,
    splitType: "Full Body",
    description: "Two full-body sessions hitting every muscle group twice per week. Ideal for busy schedules.",
    tags: ["Full Body", "Compound lifts", "2×/week"],
    schedule: [
      { dayIndex: 1, label: "Full Body A" },
      { dayIndex: 4, label: "Full Body B" },
    ],
  },
  {
    id: "2-adv",
    name: "Upper / Lower",
    level: "advanced",
    days: 2,
    splitType: "Upper/Lower",
    description: "Upper body day focused on push/pull strength, lower day on squat and hinge patterns.",
    tags: ["Upper/Lower", "Strength focus", "2×/week"],
    schedule: [
      { dayIndex: 1, label: "Upper Body" },
      { dayIndex: 4, label: "Lower Body" },
    ],
  },

  // ── 3 days ──────────────────────────────────────────────────────────────────
  {
    id: "3-int",
    name: "Full Body 3×",
    level: "intermediate",
    days: 3,
    splitType: "Full Body",
    description: "Classic 3-day full body routine with alternating A/B/C sessions. Great for building a base.",
    tags: ["Full Body", "Alternating", "Mon/Wed/Fri"],
    schedule: [
      { dayIndex: 0, label: "Full Body A" },
      { dayIndex: 2, label: "Full Body B" },
      { dayIndex: 4, label: "Full Body C" },
    ],
  },
  {
    id: "3-adv",
    name: "Push / Pull / Legs",
    level: "advanced",
    days: 3,
    splitType: "PPL",
    description: "The classic PPL split. Push focuses on chest/shoulders/triceps, Pull on back/biceps, Legs covers the full lower body.",
    tags: ["PPL", "Hypertrophy", "Mon/Wed/Fri"],
    schedule: [
      { dayIndex: 0, label: "Push — Chest · Shoulders · Triceps" },
      { dayIndex: 2, label: "Pull — Back · Biceps" },
      { dayIndex: 4, label: "Legs — Quads · Hamstrings · Glutes" },
    ],
  },

  // ── 4 days ──────────────────────────────────────────────────────────────────
  {
    id: "4-int",
    name: "Upper / Lower Split",
    level: "intermediate",
    days: 4,
    splitType: "Upper/Lower",
    description: "4-day Upper/Lower split — each muscle group trained twice a week with alternating strength and hypertrophy sessions.",
    tags: ["Upper/Lower", "4×/week", "Twice per muscle"],
    schedule: [
      { dayIndex: 0, label: "Upper A — Strength" },
      { dayIndex: 1, label: "Lower A — Strength" },
      { dayIndex: 3, label: "Upper B — Hypertrophy" },
      { dayIndex: 4, label: "Lower B — Hypertrophy" },
    ],
  },
  {
    id: "4-adv",
    name: "PPL + Full Body",
    level: "advanced",
    days: 4,
    splitType: "PPL",
    description: "Three PPL sessions plus a full body power day on Saturday. High frequency with a strength emphasis.",
    tags: ["PPL", "Power", "High frequency"],
    schedule: [
      { dayIndex: 0, label: "Push — Chest · Shoulders · Triceps" },
      { dayIndex: 1, label: "Pull — Back · Biceps" },
      { dayIndex: 3, label: "Legs — Quads · Hamstrings · Glutes" },
      { dayIndex: 5, label: "Full Body Power" },
    ],
  },

  // ── 5 days ──────────────────────────────────────────────────────────────────
  {
    id: "5-int",
    name: "Upper / Lower + Core",
    level: "intermediate",
    days: 5,
    splitType: "Upper/Lower",
    description: "Two upper, two lower sessions, plus a dedicated arms & core day mid-week. Balanced and progressive.",
    tags: ["Upper/Lower", "Core", "5×/week"],
    schedule: [
      { dayIndex: 0, label: "Upper A — Strength" },
      { dayIndex: 1, label: "Lower A — Strength" },
      { dayIndex: 2, label: "Arms & Core" },
      { dayIndex: 3, label: "Upper B — Hypertrophy" },
      { dayIndex: 4, label: "Lower B — Hypertrophy" },
    ],
  },
  {
    id: "5-adv",
    name: "PPL + Upper / Lower",
    level: "advanced",
    days: 5,
    splitType: "PPL",
    description: "The 5-day PPL+UL hybrid. High weekly volume, each muscle hit 1.5–2× per week. For experienced lifters.",
    tags: ["PPL", "Upper/Lower", "High volume"],
    schedule: [
      { dayIndex: 0, label: "Push — Chest · Shoulders · Triceps" },
      { dayIndex: 1, label: "Pull — Back · Biceps" },
      { dayIndex: 2, label: "Legs — Quads · Hamstrings · Glutes" },
      { dayIndex: 3, label: "Upper — Strength Focus" },
      { dayIndex: 4, label: "Lower — Strength Focus" },
    ],
  },

  // ── 6 days ──────────────────────────────────────────────────────────────────
  {
    id: "6-int",
    name: "PPL x2 (Double)",
    level: "intermediate",
    days: 6,
    splitType: "PPL",
    description: "Push/Pull/Legs run twice per week. Each muscle group gets 2 sessions. Sunday off for recovery.",
    tags: ["PPL", "2× frequency", "6×/week"],
    schedule: [
      { dayIndex: 0, label: "Push A — Chest · Shoulders · Triceps" },
      { dayIndex: 1, label: "Pull A — Back · Biceps" },
      { dayIndex: 2, label: "Legs A — Quads · Hamstrings" },
      { dayIndex: 3, label: "Push B — Shoulders · Chest · Triceps" },
      { dayIndex: 4, label: "Pull B — Back · Biceps · Rear Delts" },
      { dayIndex: 5, label: "Legs B — Glutes · Hamstrings · Calves" },
    ],
  },
  {
    id: "6-adv",
    name: "Bro Split 6-Day",
    level: "advanced",
    days: 6,
    splitType: "Bro Split",
    description: "Classic bodybuilder split with dedicated sessions per muscle group. Maximum per-session volume. Sunday off.",
    tags: ["Bro Split", "Isolation", "Maximum volume"],
    schedule: [
      { dayIndex: 0, label: "Chest Day" },
      { dayIndex: 1, label: "Back Day" },
      { dayIndex: 2, label: "Shoulders Day" },
      { dayIndex: 3, label: "Arms — Biceps & Triceps" },
      { dayIndex: 4, label: "Legs Day" },
      { dayIndex: 5, label: "Full Body & Weak Points" },
    ],
  },

  // ── 7 days ──────────────────────────────────────────────────────────────────
  {
    id: "7-int",
    name: "PPL x2 + Recovery",
    level: "intermediate",
    days: 7,
    splitType: "PPL",
    description: "6-day PPL double with a light active recovery session on Sunday. Keeps momentum while managing fatigue.",
    tags: ["PPL", "Active recovery", "7×/week"],
    schedule: [
      { dayIndex: 0, label: "Push A — Chest · Shoulders · Triceps" },
      { dayIndex: 1, label: "Pull A — Back · Biceps" },
      { dayIndex: 2, label: "Legs A — Quads · Hamstrings" },
      { dayIndex: 3, label: "Push B — Shoulders · Chest · Triceps" },
      { dayIndex: 4, label: "Pull B — Back · Biceps · Rear Delts" },
      { dayIndex: 5, label: "Legs B — Glutes · Hamstrings · Calves" },
      { dayIndex: 6, label: "Active Recovery — Mobility & Stretching" },
    ],
  },
  {
    id: "7-adv",
    name: "Daily Undulating Periodization",
    level: "advanced",
    days: 7,
    splitType: "Full Body",
    description: "Advanced DUP protocol — each session varies intensity (strength, hypertrophy, power) across upper/lower/full body splits. Requires excellent recovery.",
    tags: ["DUP", "Periodization", "Elite level"],
    schedule: [
      { dayIndex: 0, label: "Strength Upper" },
      { dayIndex: 1, label: "Hypertrophy Lower" },
      { dayIndex: 2, label: "Power Full Body" },
      { dayIndex: 3, label: "Strength Lower" },
      { dayIndex: 4, label: "Hypertrophy Upper" },
      { dayIndex: 5, label: "Power Full Body" },
      { dayIndex: 6, label: "Mobility & Recovery" },
    ],
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function getThisMonday(): string {
  const d = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(d, "yyyy-MM-dd");
}

function getDayDate(monday: string, dayIndex: number): Date {
  return addDays(parseISO(monday), dayIndex);
}

// ── DayConfig type ────────────────────────────────────────────────────────────
interface DayConfig {
  dayIndex: number;
  active: boolean;
  label: string;
  targetCalories: string;
}

function initDayConfigs(existingPlan: WeeklyPlan | null): DayConfig[] {
  return DAY_LABELS.map((_, i) => {
    const existing = existingPlan?.days.find((d) => d.dayIndex === i);
    return {
      dayIndex: i,
      active: !!existing,
      label: existing?.label ?? DAY_LABELS[i] + " Training",
      targetCalories: existing?.targetCalories ? String(existing.targetCalories) : "",
    };
  });
}

// ── Plan template card ────────────────────────────────────────────────────────
function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PlanTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const levelColor = plan.level === "advanced"
    ? "text-purple-700 bg-purple-50 border-purple-200"
    : "text-blue-700 bg-blue-50 border-blue-200";

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-gray-100 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-gray-900">{plan.name}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${levelColor}`}>
          {plan.level === "advanced" ? "Advanced" : "Intermediate"}
        </span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">{plan.description}</p>
      <div className="flex flex-wrap gap-1">
        {plan.tags.map((t) => (
          <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
        ))}
      </div>
      {/* Mini schedule preview */}
      <div className="mt-3 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label, i) => {
          const active = plan.schedule.some((s) => s.dayIndex === i);
          return (
            <div
              key={i}
              className={`text-center py-1 rounded-lg text-xs font-medium ${
                active
                  ? selected ? "bg-brand-500 text-white" : "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-300"
              }`}
            >
              {label[0]}
            </div>
          );
        })}
      </div>
    </button>
  );
}

// ── Setup modal ───────────────────────────────────────────────────────────────
function SetupModal({
  existingPlan,
  onSave,
  onClose,
}: {
  existingPlan: WeeklyPlan | null;
  onSave: () => void;
  onClose: () => void;
}) {
  // step: "pick" = choose a template, "customize" = edit days manually
  const [step, setStep] = useState<"pick" | "customize">(existingPlan ? "customize" : "pick");
  const [selectedDays, setSelectedDays] = useState(3);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [days, setDays] = useState<DayConfig[]>(initDayConfigs(existingPlan));
  const [loading, setLoading] = useState(false);

  const filteredPlans = PLAN_TEMPLATES.filter((p) => p.days === selectedDays);

  // Apply a template to the day config array
  const applyTemplate = (template: PlanTemplate) => {
    setSelectedTemplateId(template.id);
    setDays(
      DAY_LABELS.map((_, i) => {
        const slot = template.schedule.find((s) => s.dayIndex === i);
        return {
          dayIndex: i,
          active: !!slot,
          label: slot?.label ?? DAY_LABELS[i] + " Training",
          targetCalories: "",
        };
      })
    );
  };

  const handleTemplateSelect = (template: PlanTemplate) => {
    applyTemplate(template);
  };

  const handleNext = () => {
    if (!selectedTemplateId) {
      // Custom: activate the right number of days
      const activeDayIndices = [0, 1, 2, 3, 4, 5, 6].slice(0, selectedDays);
      setDays(
        DAY_LABELS.map((label, i) => ({
          dayIndex: i,
          active: activeDayIndices.includes(i),
          label: label + " Training",
          targetCalories: "",
        }))
      );
    }
    setStep("customize");
  };

  const toggleDay = (i: number) =>
    setDays((prev) => prev.map((d) => d.dayIndex === i ? { ...d, active: !d.active } : d));

  const updateDay = (i: number, field: "label" | "targetCalories", val: string) =>
    setDays((prev) => prev.map((d) => d.dayIndex === i ? { ...d, [field]: val } : d));

  const save = async () => {
    const activeDays = days.filter((d) => d.active);
    if (!activeDays.length) return;
    setLoading(true);
    try {
      await weeklyPlanApi.upsert({
        days: activeDays.map((d) => ({
          dayIndex: d.dayIndex,
          label: d.label || DAY_LABELS[d.dayIndex] + " Training",
          targetCalories: d.targetCalories ? Number(d.targetCalories) : null,
        })),
      });
      onSave();
    } finally { setLoading(false); }
  };

  const activeDays = days.filter((d) => d.active);

  // ── Step 1: Pick a plan ──────────────────────────────────────────────────────
  if (step === "pick") {
    return (
      <div className="space-y-5">
        {/* Day count selector */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">How many days per week will you train?</p>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                onClick={() => { setSelectedDays(n); setSelectedTemplateId(null); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedDays === n
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Suggested plans for {selectedDays} days</p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedTemplateId === plan.id}
                onSelect={() => handleTemplateSelect(plan)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => { setSelectedTemplateId(null); handleNext(); }}
          >
            Custom
          </Button>
          <Button
            className="flex-1"
            disabled={!selectedTemplateId}
            onClick={handleNext}
          >
            Use This Plan →
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2: Customize days ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Back to plan picker */}
      {!existingPlan && (
        <button
          onClick={() => setStep("pick")}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
        >
          ← Back to plan suggestions
        </button>
      )}

      <p className="text-sm text-gray-500">
        Toggle days on/off, edit labels, and optionally set a calorie target for each session.
      </p>

      {/* Day toggles */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <button
            key={d.dayIndex}
            onClick={() => toggleDay(d.dayIndex)}
            className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
              d.active
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {DAY_LABELS[d.dayIndex]}
          </button>
        ))}
      </div>

      {/* Per-day config */}
      {activeDays.length > 0 && (
        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
          {activeDays.map((d) => (
            <div key={d.dayIndex} className="flex gap-2 items-end">
              <div className="w-10 text-xs font-semibold text-brand-600 pt-6 text-center">
                {DAY_LABELS[d.dayIndex]}
              </div>
              <div className="flex-1">
                <Input
                  label="Label"
                  value={d.label}
                  onChange={(e) => updateDay(d.dayIndex, "label", e.target.value)}
                  placeholder="e.g. Push Day"
                />
              </div>
              <div className="w-28">
                <Input
                  label="Target kcal"
                  type="number"
                  value={d.targetCalories}
                  onChange={(e) => updateDay(d.dayIndex, "targetCalories", e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeDays.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Select at least one training day</p>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button
          className="flex-1"
          loading={loading}
          disabled={activeDays.length === 0}
          onClick={save}
        >
          Save Plan
        </Button>
      </div>
    </div>
  );
}

// ── Log calories modal ────────────────────────────────────────────────────────
function LogCaloriesModal({
  day,
  onConfirm,
  onClose,
}: {
  day: WeeklyPlanDay;
  onConfirm: (cal: number | undefined) => void;
  onClose: () => void;
}) {
  const [cal, setCal] = useState(day.actualCalories ? String(day.actualCalories) : "");

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Great work on <span className="font-semibold">{day.label}</span>!
        {day.targetCalories && (
          <span className="text-gray-400"> (target: {day.targetCalories} kcal)</span>
        )}
      </p>
      <Input
        label="Calories burned (optional)"
        type="number"
        value={cal}
        onChange={(e) => setCal(e.target.value)}
        placeholder="e.g. 420"
      />
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => onConfirm(undefined)}>
          Skip
        </Button>
        <Button className="flex-1" onClick={() => onConfirm(cal ? Number(cal) : undefined)}>
          Mark Complete
        </Button>
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function WeeklyPlanWidget() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [weekStart, setWeekStart] = useState<string>(getThisMonday());
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [loggingDay, setLoggingDay] = useState<WeeklyPlanDay | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [apiError, setApiError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const res = await weeklyPlanApi.get(weekStart);
      setPlan(res.data.plan);
      setWeekStart(res.data.weekStart.split("T")[0]);
    } catch {
      setApiError(true);
    } finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (day: WeeklyPlanDay) => {
    if (!day.completed) {
      setLoggingDay(day);
      return;
    }
    setToggling(day.id);
    try {
      const res = await weeklyPlanApi.toggleDay(day.id);
      setPlan((prev) =>
        prev ? { ...prev, days: prev.days.map((d) => d.id === day.id ? res.data.day : d) } : prev
      );
    } finally { setToggling(null); }
  };

  const confirmComplete = async (cal: number | undefined) => {
    if (!loggingDay) return;
    setToggling(loggingDay.id);
    setLoggingDay(null);
    try {
      const res = await weeklyPlanApi.toggleDay(
        loggingDay.id,
        cal !== undefined ? { actualCalories: cal } : undefined
      );
      setPlan((prev) =>
        prev ? { ...prev, days: prev.days.map((d) => d.id === loggingDay.id ? res.data.day : d) } : prev
      );
    } finally { setToggling(null); }
  };

  const completed = plan?.days.filter((d) => d.completed).length ?? 0;
  const total     = plan?.days.length ?? 0;
  const avgCal    = plan?.days
    .filter((d) => d.completed && d.actualCalories)
    .reduce((sum, d, _, arr) => sum + (d.actualCalories ?? 0) / arr.length, 0) ?? 0;

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse h-40" />
  );

  if (apiError) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Weekly Training Plan</h2>
      <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 text-center">
        ⚠️ Run <code className="font-mono">npx prisma migrate dev --name weekly_plan</code> to enable this feature
      </p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Weekly Training Plan</h2>
          <p className="text-xs text-gray-400 mt-0.5">Week of {format(parseISO(weekStart), "MMM d")}</p>
        </div>
        <div className="flex items-center gap-2">
          {plan && total > 0 && (
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
              {completed}/{total} days
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={() => setShowSetup(true)}>
            {plan ? "Edit" : "Set Up"}
          </Button>
        </div>
      </div>

      {!plan || total === 0 ? (
        <div className="text-center py-6">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm font-medium text-gray-700 mb-1">No plan for this week</p>
          <p className="text-xs text-gray-400 mb-4">Choose from beginner-friendly to advanced templates</p>
          <Button size="sm" onClick={() => setShowSetup(true)}>Browse Plans</Button>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
              />
            </div>
            {avgCal > 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                Avg calories burned: <span className="font-medium text-gray-600">{Math.round(avgCal)} kcal</span>
              </p>
            )}
          </div>

          {/* Day cards */}
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const day = plan.days.find((d) => d.dayIndex === i);
              const date = getDayDate(weekStart, i);
              const isCurrentDay = isToday(date);

              if (!day) {
                return (
                  <div key={i} className={`rounded-xl p-2 text-center ${isCurrentDay ? "bg-gray-50 ring-1 ring-gray-200" : ""}`}>
                    <p className={`text-xs font-medium ${isCurrentDay ? "text-gray-700" : "text-gray-300"}`}>{label}</p>
                    <p className="text-xs text-gray-300 mt-1">{format(date, "d")}</p>
                    <div className="mt-2 h-5" />
                  </div>
                );
              }

              return (
                <button
                  key={i}
                  onClick={() => handleToggle(day)}
                  disabled={toggling === day.id}
                  className={`rounded-xl p-2 text-center transition-all ${
                    day.completed
                      ? "bg-green-50 ring-1 ring-green-200"
                      : isCurrentDay
                      ? "bg-brand-50 ring-1 ring-brand-300 hover:bg-brand-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <p className={`text-xs font-semibold ${
                    day.completed ? "text-green-700" : isCurrentDay ? "text-brand-700" : "text-gray-600"
                  }`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-400">{format(date, "d")}</p>
                  <div className="mt-1.5 flex justify-center">
                    {toggling === day.id ? (
                      <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    ) : day.completed ? (
                      <span className="text-green-500 text-sm">✓</span>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  {day.actualCalories && (
                    <p className="text-xs text-green-600 font-medium mt-0.5">{day.actualCalories}</p>
                  )}
                  {!day.actualCalories && day.targetCalories && (
                    <p className="text-xs text-gray-400 mt-0.5">{day.targetCalories}</p>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Tap a day to mark it complete · Numbers show kcal
          </p>
        </>
      )}

      <Modal open={showSetup} onClose={() => setShowSetup(false)} title="Plan Your Week" size="md">
        <SetupModal
          existingPlan={plan}
          onSave={() => { setShowSetup(false); load(); }}
          onClose={() => setShowSetup(false)}
        />
      </Modal>

      <Modal open={!!loggingDay} onClose={() => setLoggingDay(null)} title="Log Completion" size="sm">
        {loggingDay && (
          <LogCaloriesModal
            day={loggingDay}
            onConfirm={confirmComplete}
            onClose={() => setLoggingDay(null)}
          />
        )}
      </Modal>
    </div>
  );
}
