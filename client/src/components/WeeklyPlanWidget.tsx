import { useState, useEffect, useCallback } from "react";
import { startOfWeek, addDays, format, isToday, parseISO } from "date-fns";
import { weeklyPlanApi } from "../api";
import type { WeeklyPlan, WeeklyPlanDay } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── helpers ───────────────────────────────────────────────────────────────────
function getThisMonday(): string {
  const d = startOfWeek(new Date(), { weekStartsOn: 1 });
  return format(d, "yyyy-MM-dd");
}

function getDayDate(monday: string, dayIndex: number): Date {
  return addDays(parseISO(monday), dayIndex);
}

// ── Setup modal — pick which days + target calories ───────────────────────────
interface DayConfig {
  dayIndex: number;
  active: boolean;
  label: string;
  targetCalories: string;
}

function SetupModal({
  existingPlan,
  onSave,
  onClose,
}: {
  existingPlan: WeeklyPlan | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const initDays = (): DayConfig[] =>
    DAY_LABELS.map((_, i) => {
      const existing = existingPlan?.days.find((d) => d.dayIndex === i);
      return {
        dayIndex: i,
        active: !!existing,
        label: existing?.label ?? DAY_LABELS[i] + " Training",
        targetCalories: existing?.targetCalories ? String(existing.targetCalories) : "",
      };
    });

  const [days, setDays] = useState<DayConfig[]>(initDays);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">Select which days you plan to train this week, add a label and optional calorie target for each.</p>

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
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
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
        <Button className="flex-1" loading={loading} disabled={activeDays.length === 0} onClick={save}>
          Save Plan
        </Button>
      </div>
    </div>
  );
}

// ── Log calories modal (when marking a day complete) ──────────────────────────
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
    // If marking complete and day isn't done yet, ask for calories
    if (!day.completed) {
      setLoggingDay(day);
      return;
    }
    // Un-marking — just toggle
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
      const res = await weeklyPlanApi.toggleDay(loggingDay.id, cal !== undefined ? { actualCalories: cal } : undefined);
      setPlan((prev) =>
        prev ? { ...prev, days: prev.days.map((d) => d.id === loggingDay.id ? res.data.day : d) } : prev
      );
    } finally { setToggling(null); }
  };

  // Stats
  const completed = plan?.days.filter((d) => d.completed).length ?? 0;
  const total = plan?.days.length ?? 0;
  const avgCal = plan?.days.filter((d) => d.completed && d.actualCalories)
    .reduce((sum, d, _, arr) => sum + (d.actualCalories ?? 0) / arr.length, 0) ?? 0;

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse h-40" />
  );

  if (apiError) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-900">Weekly Training Plan</h2>
      </div>
      <div className="text-center py-4">
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
          ⚠️ Run <code className="font-mono">npx prisma migrate dev --name weekly_plan</code> to enable this feature
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Weekly Training Plan</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Week of {format(parseISO(weekStart), "MMM d")}
          </p>
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
          <p className="text-sm text-gray-400 mb-3">No plan set for this week</p>
          <Button size="sm" onClick={() => setShowSetup(true)}>Plan This Week</Button>
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
                  <p className={`text-xs font-semibold ${day.completed ? "text-green-700" : isCurrentDay ? "text-brand-700" : "text-gray-600"}`}>
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

          {/* Legend */}
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
