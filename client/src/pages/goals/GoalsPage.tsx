import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceLine,
} from "recharts";
import { fmtMonthDayYear } from "../../lib/dateFormat";
import { analyticsApi, calorieGoalsApi, predictionsApi } from "../../api";
import { useTranslation, t as _t } from "../../i18n";
import type { CalorieGoal } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { useAuthStore } from "../../store/authStore";
import { emitDataChanged } from "../../lib/appEvents";
// ── Shared goal components (single source of truth) ───────────────────────────
import { ProjectionChart } from "../../components/goals/ProjectionChart";
import { GoalValidator }   from "../../components/goals/GoalValidator";
import { ImpactPanel }     from "../../components/goals/ImpactPanel";
import { GoalPresets }     from "../../components/goals/GoalPresets";
import {
  addWeeks,
  weeksUntil,
  computeGoalType,
  type GoalPreset,
  type ProjectionPoint,
  type GoalPreviewResponse,
} from "../../components/goals/goalCalc";

// ── Active goal projection: fetches live data, merges projected + actual ───────
function ActiveGoalChart({ goalId, targetWeight }: { goalId: number; targetWeight: number }) {
  const { t } = useTranslation();
  const [points, setPoints] = useState<ProjectionPoint[]>([]);

  useEffect(() => {
    calorieGoalsApi.getProjection(goalId)
      .then((r) => {
        const { projected, actual } = r.data as {
          projected: { date: string; projectedWeight: number }[];
          actual:    { date: string; actual: number }[];
        };
        setPoints(
          projected.map((p) => ({
            date:            p.date,
            projectedWeight: p.projectedWeight,
            actual:          actual.find((a) => a.date === p.date)?.actual ?? null,
          })),
        );
      })
      .catch(() => {});
  }, [goalId]);

  if (points.length === 0) {
    return <div className="animate-pulse h-40 bg-gray-100 dark:bg-gray-700 rounded-xl" />;
  }
  return <ProjectionChart data={points} targetWeight={targetWeight} height={200} showActual />;
}

type ForecastSeries = {
  actual: boolean;
  ideal: boolean;
  adaptive: boolean;
  preview: boolean;
  calories: boolean;
  burned: boolean;
  protein: boolean;
  carbs: boolean;
  fats: boolean;
};

const DEFAULT_FORECAST_SERIES: ForecastSeries = {
  actual: true,
  ideal: true,
  adaptive: true,
  preview: true,
  calories: false,
  burned: false,
  protein: false,
  carbs: false,
  fats: false,
};

const formatChartDate = (value: string) => {
  try { return format(parseISO(value), "MMM d"); }
  catch { return value; }
};

function normalizeSeries<T extends Record<string, any>>(rows: T[], keys: string[]): T[] {
  const ranges = keys.reduce<Record<string, { min: number; max: number }>>((acc, key) => {
    const values = rows.map((row) => Number(row[key])).filter((v) => Number.isFinite(v));
    if (values.length) acc[key] = { min: Math.min(...values), max: Math.max(...values) };
    return acc;
  }, {});
  return rows.map((row) => {
    const next: Record<string, any> = { ...row };
    for (const key of keys) {
      const value = Number(row[key]);
      const range = ranges[key];
      next[`${key}Norm`] =
        Number.isFinite(value) && range && range.max !== range.min
          ? Math.round(((value - range.min) / (range.max - range.min)) * 100)
          : Number.isFinite(value) && range
            ? 50
            : null;
    }
    return next as T;
  });
}

function GoalsForecastChart({
  prediction,
  analytics,
  preview,
  targetWeight,
  visible,
  onToggle,
}: {
  prediction: any | null;
  analytics: any | null;
  preview: any | null;
  targetWeight: number;
  visible: ForecastSeries;
  onToggle: (key: keyof ForecastSeries) => void;
}) {
  const dateRows = new Map<string, any>();
  const put = (date: string, values: Record<string, any>) => {
    if (!date) return;
    dateRows.set(date, { ...(dateRows.get(date) ?? { date }), ...values });
  };

  (prediction?.actualPath ?? []).forEach((p: any) => put(p.date, { actual: p.weight }));
  (prediction?.smoothedActualPath ?? []).forEach((p: any) => put(p.date, { actualTrend: p.weight }));
  (prediction?.idealPath ?? []).forEach((p: any) => put(p.date, { ideal: p.weight }));
  (prediction?.adaptivePath ?? []).forEach((p: any) => put(p.date, { adaptive: p.weight }));
  (preview?.previewPath ?? []).forEach((p: any) => put(p.date, { preview: p.weight }));
  (analytics?.dailySeries ?? []).forEach((p: any) => put(p.date, {
    calories: p.calories,
    burned: p.burned,
    protein: p.protein,
    carbs: p.carbs,
    fats: p.fats,
  }));

  const chartData = normalizeSeries(
    Array.from(dateRows.values()).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    ["calories", "burned", "protein", "carbs", "fats"],
  );
  const hasMetrics = visible.calories || visible.burned || visible.protein || visible.carbs || visible.fats;

  if (!prediction?.hasEnoughData || chartData.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="font-semibold text-gray-700 dark:text-gray-200">Not enough forecast data yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Keep logging weight, meals, and workouts to unlock an adaptive goal forecast.
        </p>
      </div>
    );
  }

  const toggleItems: Array<{ key: keyof ForecastSeries; label: string }> = [
    { key: "actual", label: "Actual weight" },
    { key: "ideal", label: "Ideal plan" },
    { key: "adaptive", label: "Adaptive forecast" },
    { key: "preview", label: "What-if preview" },
    { key: "calories", label: "Calories eaten" },
    { key: "burned", label: "Calories burned" },
    { key: "protein", label: "Protein" },
    { key: "carbs", label: "Carbs" },
    { key: "fats", label: "Fats" },
  ];

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.22)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={formatChartDate} interval="preserveStartEnd" axisLine={false} tickLine={false} />
          <YAxis yAxisId="weight" tick={{ fontSize: 10, fill: "#9ca3af" }} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
          {hasMetrics && <YAxis yAxisId="metric" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />}
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e5e7eb" }}
            labelFormatter={(v) => formatChartDate(String(v))}
            formatter={(value: any, name: string, props: any) => {
              const dataKey = String(props?.dataKey ?? "");
              const rawKey = dataKey.replace("Norm", "");
              const rawValue = props?.payload?.[rawKey];
              if (dataKey.endsWith("Norm")) {
                const unit = rawKey === "protein" || rawKey === "carbs" || rawKey === "fats" ? "g" : "kcal";
                return [rawValue != null ? `${Math.round(rawValue)} ${unit}` : "--", name];
              }
              return [value != null ? `${Number(value).toFixed(1)} kg` : "--", name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine yAxisId="weight" y={targetWeight} stroke="#22c55e" strokeDasharray="4 2" />
          {visible.ideal && <Line yAxisId="weight" type="monotone" dataKey="ideal" name="Ideal plan" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 3" />}
          {visible.adaptive && <Line yAxisId="weight" type="monotone" dataKey="adaptive" name="Adaptive forecast" stroke="#14b8a6" strokeWidth={2.5} dot={false} />}
          {visible.actual && <Line yAxisId="weight" type="monotone" dataKey="actualTrend" name="Actual trend" stroke="#111827" strokeWidth={2.5} dot={false} connectNulls />}
          {visible.actual && <Line yAxisId="weight" type="monotone" dataKey="actual" name="Logged weight" stroke="#22c55e" strokeWidth={0} dot={{ r: 3, fill: "#22c55e" }} connectNulls={false} />}
          {visible.preview && preview?.previewPath && <Line yAxisId="weight" type="monotone" dataKey="preview" name="What-if preview" stroke="#f97316" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />}
          {visible.calories && <Line yAxisId="metric" type="monotone" dataKey="caloriesNorm" name="Calories eaten" stroke="#f97316" strokeWidth={1.8} dot={false} />}
          {visible.burned && <Line yAxisId="metric" type="monotone" dataKey="burnedNorm" name="Calories burned" stroke="#ef4444" strokeWidth={1.8} dot={false} />}
          {visible.protein && <Line yAxisId="metric" type="monotone" dataKey="proteinNorm" name="Protein" stroke="#2563eb" strokeWidth={1.8} dot={false} />}
          {visible.carbs && <Line yAxisId="metric" type="monotone" dataKey="carbsNorm" name="Carbs" stroke="#d97706" strokeWidth={1.8} dot={false} />}
          {visible.fats && <Line yAxisId="metric" type="monotone" dataKey="fatsNorm" name="Fats" stroke="#db2777" strokeWidth={1.8} dot={false} />}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-2">
        {toggleItems.map((item) => (
          <label key={item.key} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={visible[item.key]} onChange={() => onToggle(item.key)} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600" />
            {item.label}
          </label>
        ))}
      </div>
      {hasMetrics && (
        <p className="text-xs text-gray-400">
          Nutrition and workout overlays are normalized to 0-100 so they can be compared without distorting the weight scale.
        </p>
      )}
    </div>
  );
}

// ── Goal Creator Form ─────────────────────────────────────────────────────────
function GoalForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [currentWeight, setCurrentWeight] = useState(String(user?.weight ?? ""));
  const [targetWeight,  setTargetWeight]  = useState("");
  const [targetDate,    setTargetDate]    = useState(() => addWeeks(12));
  const [name,          setName]          = useState("");
  const [preview,       setPreview]       = useState<GoalPreviewResponse | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [activePreset,  setActivePreset]  = useState<string | null>(null);
  const [macrosCycling, setMacrosCycling] = useState(false);

  const getPreview = async (overrides?: { cw?: string; tw?: string; td?: string }) => {
    const cw = overrides?.cw ?? currentWeight;
    const tw = overrides?.tw ?? targetWeight;
    const td = overrides?.td ?? targetDate;
    if (!cw || !tw || !td) { setError("Fill in all fields to preview"); return; }
    setLoading(true); setError(""); setPreview(null);
    try {
      const res = await calorieGoalsApi.preview({
        currentWeight:       Number(cw),
        targetWeight:        Number(tw),
        targetDate:          td,
        macrosCycling,
        trainingDaysPerWeek: user?.trainingDaysPerWeek,
      });
      setPreview(res.data as GoalPreviewResponse);
    } catch (e: any) {
      setError(
        e.response?.data?.error ||
        "Preview failed. Check your profile has age, height and activity level set.",
      );
    } finally { setLoading(false); }
  };

  const applyPreset = (preset: GoalPreset) => {
    const cw = Number(currentWeight) || Number(user?.weight) || 75;
    const tw = Math.round(cw * (1 + preset.weightPct / 100) * 10) / 10;
    const td = addWeeks(preset.weeks);
    setCurrentWeight(String(cw));
    setTargetWeight(String(tw));
    setTargetDate(td);
    setName(preset.goalName);
    setActivePreset(preset.key);
    getPreview({ cw: String(cw), tw: String(tw), td });
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      await calorieGoalsApi.create({
        name:                name || undefined,
        currentWeight:       Number(currentWeight),
        targetWeight:        Number(targetWeight),
        targetDate,
        macrosCycling,
        trainingDaysPerWeek: user?.trainingDaysPerWeek,
      });
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save goal");
    } finally { setSaving(false); }
  };

  const hasProfile  = !!(user?.age && user?.height && user?.activityLevel && user?.sex);
  const durationWks = weeksUntil(targetDate);

  return (
    <div className="space-y-5">
      {/* ── Preset templates ── */}
      <GoalPresets
        activePreset={activePreset}
        onSelect={applyPreset}
        hasProfile={hasProfile}
      />

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide -mb-1">
          Customise
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <Input
          label="Goal Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("goals.goalNamePlaceholder")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Current Weight (kg)" type="number" step="0.1"
            value={currentWeight}
            onChange={(e) => { setCurrentWeight(e.target.value); setPreview(null); setActivePreset(null); }}
            placeholder="75"
          />
          <Input
            label="Target Weight (kg)" type="number" step="0.1"
            value={targetWeight}
            onChange={(e) => { setTargetWeight(e.target.value); setPreview(null); setActivePreset(null); }}
            placeholder="70"
          />
        </div>
        <Input
          label="Target Date" type="date"
          value={targetDate}
          onChange={(e) => { setTargetDate(e.target.value); setPreview(null); setActivePreset(null); }}
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* ── Macro cycling toggle ── */}
      <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-2 bg-gray-50 dark:bg-gray-700/50">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => { setMacrosCycling((v) => !v); setPreview(null); }}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              macrosCycling ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                macrosCycling ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            🔄 Enable Macro Cycling
          </span>
        </label>
        {macrosCycling && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
            Eat more on training days (~+350 kcal) and less on rest days, keeping your weekly
            average the same. Great for performance and body composition.
            {user?.trainingDaysPerWeek
              ? ` Based on your ${user.trainingDaysPerWeek} training days/week.`
              : " Set training days/week in Settings for best accuracy."}
          </p>
        )}
      </div>

      {/* ── Preview / Save section ── */}
      {!preview ? (
        <Button className="w-full" variant="secondary" loading={loading} onClick={() => getPreview()}>
          {loading ? "Calculating…" : "Preview Plan"}
        </Button>
      ) : (
        <div className="space-y-4">
          {/* Macro impact tiles */}
          <ImpactPanel
            calculation={preview.calculation}
            cyclingSplit={preview.cyclingSplit}
          />

          {/* Evidence-based validation warnings */}
          <GoalValidator
            calculation={preview.calculation}
            durationWeeks={durationWks}
            currentWeight={Number(currentWeight)}
          />

          {/* Weight projection mini-chart */}
          {preview.projection?.length > 0 && (
            <ProjectionChart
              data={preview.projection}
              targetWeight={Number(targetWeight)}
              height={144}
            />
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPreview(null)}>
              Back
            </Button>
            <Button className="flex-1" loading={saving} onClick={save}>
              Save Goal
            </Button>
          </div>
        </div>
      )}

      {!preview && (
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      )}
    </div>
  );
}

// ── Edit Goal Modal ───────────────────────────────────────────────────────────
function EditGoalModal({
  goal,
  onSave,
  onClose,
}: {
  goal:    CalorieGoal;
  onSave:  () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [name,          setName]          = useState(goal.name || "");
  const [targetWeight,  setTargetWeight]  = useState(String(goal.targetWeight));
  const [currentWeight, setCurrentWeight] = useState(String(goal.currentWeight));
  const [targetDate,    setTargetDate]    = useState(goal.targetDate.split("T")[0]);
  const [dailyCalories, setDailyCalories] = useState(String(Math.round(goal.dailyCalories)));
  const [protein,       setProtein]       = useState(String(Math.round(goal.proteinGrams)));
  const [carbs,         setCarbs]         = useState(String(Math.round(goal.carbsGrams)));
  const [fats,          setFats]          = useState(String(Math.round(goal.fatsGrams)));
  const [saving,        setSaving]        = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error,         setError]         = useState("");
  // After clicking "Recalculate": holds the full preview response
  const [calcPreview,   setCalcPreview]   = useState<GoalPreviewResponse | null>(null);

  const recalculate = async () => {
    const cw = Number(currentWeight);
    const tw = Number(targetWeight);
    if (!cw || !tw || !targetDate) {
      setError("Fill current weight, target weight and target date");
      return;
    }
    setRecalcLoading(true); setError(""); setCalcPreview(null);
    try {
      const res = await calorieGoalsApi.preview({
        currentWeight:       cw,
        targetWeight:        tw,
        targetDate,
        macrosCycling:       goal.macrosCycling,
        trainingDaysPerWeek: user?.trainingDaysPerWeek,
      });
      const data = res.data as GoalPreviewResponse;
      setCalcPreview(data);
      // Auto-populate manual fields so user can fine-tune before saving
      const calc = data.calculation;
      setDailyCalories(String(Math.round(calc.dailyCalories)));
      setProtein(String(Math.round(calc.proteinGrams)));
      setCarbs(String(Math.round(calc.carbsGrams)));
      setFats(String(Math.round(calc.fatsGrams)));
    } catch (e: any) {
      setError(e.response?.data?.error || "Recalculation failed");
    } finally { setRecalcLoading(false); }
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      await calorieGoalsApi.update(goal.id, {
        name:          name || undefined,
        targetWeight:  Number(targetWeight),
        currentWeight: Number(currentWeight),
        targetDate,
        dailyCalories: Number(dailyCalories),
        proteinGrams:  Number(protein),
        carbsGrams:    Number(carbs),
        fatsGrams:     Number(fats),
        type:          computeGoalType(Number(currentWeight), Number(targetWeight)),
      });
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save");
    } finally { setSaving(false); }
  };

  const durationWks = weeksUntil(targetDate);

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <Input
        label="Goal Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("goals.goalNamePlaceholder")}
      />

      {/* ── Targets ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Targets
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Current Weight (kg)" type="number" step="0.1"
            value={currentWeight}
            onChange={(e) => { setCurrentWeight(e.target.value); setCalcPreview(null); }}
          />
          <Input
            label="Target Weight (kg)" type="number" step="0.1"
            value={targetWeight}
            onChange={(e) => { setTargetWeight(e.target.value); setCalcPreview(null); }}
          />
        </div>
        <Input
          label="Target Date" type="date"
          value={targetDate}
          onChange={(e) => { setTargetDate(e.target.value); setCalcPreview(null); }}
          min={new Date().toISOString().split("T")[0]}
        />
        <button
          onClick={recalculate}
          disabled={recalcLoading}
          className="w-full py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50"
        >
          {recalcLoading ? "Recalculating…" : "🔄 Recalculate macros from these targets"}
        </button>
      </div>

      {/* ── Impact panel + validator after recalculate ── */}
      {calcPreview && (
        <div className="space-y-3">
          <ImpactPanel
            calculation={calcPreview.calculation}
            cyclingSplit={calcPreview.cyclingSplit}
            compact
          />
          <GoalValidator
            calculation={calcPreview.calculation}
            durationWeeks={durationWks}
            currentWeight={Number(currentWeight)}
            compact
          />
          {calcPreview.projection?.length > 0 && (
            <ProjectionChart
              data={calcPreview.projection}
              targetWeight={Number(targetWeight)}
              height={120}
            />
          )}
        </div>
      )}

      {/* ── Manual macro override ── */}
      <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Daily Targets{calcPreview ? " (auto-filled — edit to override)" : " (edit manually)"}
        </p>
        <Input
          label="Daily Calories (kcal)" type="number"
          value={dailyCalories}
          onChange={(e) => setDailyCalories(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input label="Protein (g)" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
          <Input label="Carbs (g)"   type="number" value={carbs}   onChange={(e) => setCarbs(e.target.value)} />
          <Input label="Fats (g)"    type="number" value={fats}    onChange={(e) => setFats(e.target.value)} />
        </div>
        {protein && carbs && fats && (() => {
          const fromMacros = Math.round(Number(protein) * 4 + Number(carbs) * 4 + Number(fats) * 9);
          const delta      = Math.abs(fromMacros - Number(dailyCalories));
          return (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {fromMacros} kcal from macros{delta > 50 ? " ⚠️ doesn't match calorie target" : " ✓"}
            </p>
          );
        })()}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <Button className="flex-1" loading={saving} onClick={save}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ── Main Goals page ───────────────────────────────────────────────────────────
export default function GoalsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const [goals,        setGoals]       = useState<CalorieGoal[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [showForm,     setShowForm]    = useState(false);
  const [editingGoal,  setEditingGoal] = useState<CalorieGoal | null>(null);
  const [prediction,   setPrediction]  = useState<any | null>(null);
  const [analytics,    setAnalytics]   = useState<any | null>(null);
  const [forecastSeries, setForecastSeries] = useState<ForecastSeries>(DEFAULT_FORECAST_SERIES);
  const [previewInputs, setPreviewInputs] = useState({
    dailyCalories: "",
    caloriesBurned: "0",
    proteinGrams: "",
    carbsGrams: "",
    fatsGrams: "",
    workoutDaysPerWeek: "",
    workoutMinutesPerWeek: "",
    targetDate: "",
  });
  const [whatIfPreview, setWhatIfPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyingPreview, setApplyingPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await calorieGoalsApi.getAll();
      setGoals(res.data.goals);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    predictionsApi.get().then((r) => setPrediction(r.data)).catch(() => setPrediction(null));
    analyticsApi.get(90).then((r) => setAnalytics(r.data)).catch(() => setAnalytics(null));
  }, []);
  useEffect(() => {
    const handler = () => {
      predictionsApi.get().then((r) => setPrediction(r.data)).catch(() => setPrediction(null));
      analyticsApi.get(90).then((r) => setAnalytics(r.data)).catch(() => setAnalytics(null));
    };
    window.addEventListener("fitai:data-changed", handler);
    return () => window.removeEventListener("fitai:data-changed", handler);
  }, []);

  const deactivate = async (id: number) => {
    await calorieGoalsApi.update(id, { active: false });
    load();
  };

  const activate = async (id: number) => {
    await calorieGoalsApi.update(id, { active: true });
    load();
  };

  const deleteGoal = async (id: number) => {
    if (!confirm(t("common.confirm") + "?")) return;
    await calorieGoalsApi.delete(id);
    load();
  };

  const activeGoal    = goals.find((g) => g.active);
  const inactiveGoals = goals.filter((g) => !g.active);

  useEffect(() => {
    if (!activeGoal) return;
    setPreviewInputs({
      dailyCalories: String(Math.round(activeGoal.dailyCalories)),
      caloriesBurned: "0",
      proteinGrams: String(Math.round(activeGoal.proteinGrams)),
      carbsGrams: String(Math.round(activeGoal.carbsGrams)),
      fatsGrams: String(Math.round(activeGoal.fatsGrams)),
      workoutDaysPerWeek: String(useAuthStore.getState().user?.trainingDaysPerWeek ?? ""),
      workoutMinutesPerWeek: String(
        Math.round(
          (useAuthStore.getState().user?.trainingDaysPerWeek ?? 0) *
          (useAuthStore.getState().user?.trainingHoursPerDay ?? 0) *
          60
        ) || "",
      ),
      targetDate: activeGoal.targetDate.split("T")[0],
    });
    setWhatIfPreview(null);
  }, [activeGoal?.id]);

  useEffect(() => {
    if (!activeGoal) return;
    if (!previewInputs.dailyCalories || !previewInputs.proteinGrams || !previewInputs.carbsGrams || !previewInputs.fatsGrams || !previewInputs.targetDate) {
      return;
    }
    const handle = window.setTimeout(() => {
      setPreviewLoading(true);
      predictionsApi.preview({
        dailyCalories: Number(previewInputs.dailyCalories),
        caloriesBurned: Number(previewInputs.caloriesBurned || 0),
        proteinGrams: Number(previewInputs.proteinGrams),
        carbsGrams: Number(previewInputs.carbsGrams),
        fatsGrams: Number(previewInputs.fatsGrams),
        workoutDaysPerWeek: Number(previewInputs.workoutDaysPerWeek || 0),
        workoutMinutesPerWeek: Number(previewInputs.workoutMinutesPerWeek || 0),
        targetDate: previewInputs.targetDate,
        targetWeight: activeGoal.targetWeight,
      })
        .then((r) => setWhatIfPreview(r.data))
        .catch(() => setWhatIfPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 350);
    return () => window.clearTimeout(handle);
  }, [activeGoal?.id, activeGoal?.targetWeight, previewInputs]);

  const toggleForecastSeries = (key: keyof ForecastSeries) => {
    setForecastSeries((current) => ({ ...current, [key]: !current[key] }));
  };

  const updatePreviewInput = (key: keyof typeof previewInputs, value: string) => {
    setPreviewInputs((current) => ({ ...current, [key]: value }));
  };

  const applyWhatIfPreview = async () => {
    if (!activeGoal || !whatIfPreview) return;
    const ok = confirm("Apply this what-if plan to your active goal?");
    if (!ok) return;
    setApplyingPreview(true);
    try {
      await calorieGoalsApi.update(activeGoal.id, {
        dailyCalories: Number(previewInputs.dailyCalories),
        proteinGrams: Number(previewInputs.proteinGrams),
        carbsGrams: Number(previewInputs.carbsGrams),
        fatsGrams: Number(previewInputs.fatsGrams),
        targetDate: previewInputs.targetDate,
      });
      emitDataChanged("goals-what-if");
      await load();
    } finally {
      setApplyingPreview(false);
    }
  };

  const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    cut:      { label: t("goals.weightLoss"), color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    bulk:     { label: t("goals.weightGain"), color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
    maintain: { label: t("goals.maintenance"), color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  };

  return (
    <div className={embedded ? "p-4 sm:p-6 max-w-5xl mx-auto space-y-6" : "p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6"}>
      {/* ── Page header ── */}
      {!embedded ? (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("goals.title")}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Calorie targets &amp; body composition plans
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>+ {t("goals.createGoal")}</Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            Calorie targets &amp; body composition plans
          </p>
          <Button size="sm" onClick={() => setShowForm(true)}>+ {t("goals.createGoal")}</Button>
        </div>
      )}

      {/* ── Loading / empty / list ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{t("goals.noGoal")}</h3>
          <p className="text-sm text-gray-400 mb-4">
            Create a calorie goal to get a personalised macro plan
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Make sure your profile has age, height, weight, sex and activity level filled in.
          </p>
          <Button onClick={() => setShowForm(true)}>{t("goals.createGoal")}</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active goal */}
          {activeGoal && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                    <h2 className="font-bold text-gray-900 dark:text-white">
                      {activeGoal.name || "Active Goal"}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_LABELS[activeGoal.type]?.color}`}>
                      {TYPE_LABELS[activeGoal.type]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {activeGoal.currentWeight}kg → {activeGoal.targetWeight}kg
                    {" "}by{" "}
                    {fmtMonthDayYear(parseISO(activeGoal.targetDate))}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => setEditingGoal(activeGoal)}>{t("common.edit")}</Button>
                  <Button variant="secondary" size="sm" onClick={() => deactivate(activeGoal.id)}>{t("goals.pause")}</Button>
                  <Button variant="danger"    size="sm" onClick={() => deleteGoal(activeGoal.id)}>{t("common.delete")}</Button>
                </div>
              </div>

              {/* Macro tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: t("goals.dailyCalories"), value: `${Math.round(activeGoal.dailyCalories)} kcal` },
                  { label: t("common.protein"),      value: `${Math.round(activeGoal.proteinGrams)}g` },
                  { label: t("common.carbs"),        value: `${Math.round(activeGoal.carbsGrams)}g` },
                  { label: t("common.fats"),         value: `${Math.round(activeGoal.fatsGrams)}g` },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {prediction?.goalChallenge && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3">
                    <p className="text-xs text-brand-500 font-medium">Goal realism</p>
                    <p className="font-bold text-brand-800 dark:text-brand-200 capitalize">
                      {String(prediction.goalAggressiveness ?? "reasonable")}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Required pace</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100">
                      {prediction.goalChallenge.requiredWeeklyPct > 0 ? "+" : ""}{prediction.goalChallenge.requiredWeeklyPct}% BW/wk
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Current pace</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100">
                      {prediction.goalChallenge.currentWeeklyPct > 0 ? "+" : ""}{prediction.goalChallenge.currentWeeklyPct}% BW/wk
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Adaptive ETA</p>
                    <p className="font-bold text-gray-800 dark:text-gray-100">
                      {prediction.adaptiveGoalDate ?? "Needs more data"}
                    </p>
                  </div>
                </div>
              )}

              {prediction?.goalChallenge?.suggestedPostponedDate && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This deadline looks aggressive based on the adaptive model. Suggested postponed date:{" "}
                  <strong>{prediction.goalChallenge.suggestedPostponedDate}</strong>.
                </div>
              )}

              <CardHeader
                title={t("goals.progressToDate")}
                subtitle="Ideal plan vs logged trend vs adaptive forecast"
              />
              <GoalsForecastChart
                prediction={prediction}
                analytics={analytics}
                preview={whatIfPreview}
                targetWeight={activeGoal.targetWeight}
                visible={forecastSeries}
                onToggle={toggleForecastSeries}
              />

              <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-5">
                <CardHeader
                  title="What-if preview"
                  subtitle="Adjust the plan variables and compare the orange preview line before applying anything."
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input label="Calories eaten" type="number" value={previewInputs.dailyCalories} onChange={(e) => updatePreviewInput("dailyCalories", e.target.value)} />
                  <Input label="Calories burned" type="number" value={previewInputs.caloriesBurned} onChange={(e) => updatePreviewInput("caloriesBurned", e.target.value)} />
                  <Input label="Protein (g)" type="number" value={previewInputs.proteinGrams} onChange={(e) => updatePreviewInput("proteinGrams", e.target.value)} />
                  <Input label="Carbs (g)" type="number" value={previewInputs.carbsGrams} onChange={(e) => updatePreviewInput("carbsGrams", e.target.value)} />
                  <Input label="Fats (g)" type="number" value={previewInputs.fatsGrams} onChange={(e) => updatePreviewInput("fatsGrams", e.target.value)} />
                  <Input label="Workout days/wk" type="number" value={previewInputs.workoutDaysPerWeek} onChange={(e) => updatePreviewInput("workoutDaysPerWeek", e.target.value)} />
                  <Input label="Workout min/wk" type="number" value={previewInputs.workoutMinutesPerWeek} onChange={(e) => updatePreviewInput("workoutMinutesPerWeek", e.target.value)} />
                  <Input label="Target date" type="date" value={previewInputs.targetDate} onChange={(e) => updatePreviewInput("targetDate", e.target.value)} />
                </div>
                <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-700/60 p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-100">
                      {previewLoading ? "Updating preview..." : whatIfPreview?.recommendation?.reason ?? "Change a variable to preview the forecast."}
                    </p>
                    {whatIfPreview?.adaptiveGoalDate && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Preview ETA: {whatIfPreview.adaptiveGoalDate}
                        {whatIfPreview.etaDrift != null ? ` (${whatIfPreview.etaDrift > 0 ? "+" : ""}${whatIfPreview.etaDrift} days vs target)` : ""}
                      </p>
                    )}
                  </div>
                  <Button size="sm" loading={applyingPreview} disabled={!whatIfPreview || previewLoading} onClick={applyWhatIfPreview}>
                    Apply preview
                  </Button>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-5">
                <CardHeader
                  title="Goal analytics"
                  subtitle="Why the adaptive forecast is moving."
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Calorie adherence", value: analytics?.diagnostics?.calorieAdherence != null ? `${analytics.diagnostics.calorieAdherence}%` : "--" },
                    { label: "Macro adherence", value: analytics?.diagnostics?.macroAdherence != null ? `${analytics.diagnostics.macroAdherence}%` : "--" },
                    { label: "Workout adherence", value: analytics?.diagnostics?.workoutAdherence != null ? `${analytics.diagnostics.workoutAdherence}%` : "--" },
                    { label: "Weight velocity", value: analytics?.diagnostics?.weightVelocity != null ? `${analytics.diagnostics.weightVelocity > 0 ? "+" : ""}${analytics.diagnostics.weightVelocity} kg/wk` : "--" },
                    { label: "Trend confidence", value: prediction?.trendConfidence ?? analytics?.diagnostics?.trendConfidence ?? "--" },
                    { label: "ETA drift", value: prediction?.etaDrift != null ? `${prediction.etaDrift > 0 ? "+" : ""}${prediction.etaDrift} days` : "--" },
                    { label: "Plateau risk", value: analytics?.diagnostics?.plateauRisk === "elevated" ? "Elevated" : "Normal" },
                    { label: "Plan status", value: String(prediction?.goalChallenge?.status ?? "--").replaceAll("_", " ") },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-gray-50 dark:bg-gray-700 p-3">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="font-bold text-gray-800 dark:text-gray-100 capitalize">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {(prediction?.insights ?? []).slice(0, 5).map((insight: string) => (
                    <p key={insight} className="rounded-lg bg-gray-50 dark:bg-gray-700/70 px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                      {insight}
                    </p>
                  ))}
                  {whatIfPreview?.recommendation?.reason && (
                    <p className="rounded-lg bg-orange-50 dark:bg-orange-900/20 px-3 py-2 text-sm text-orange-800 dark:text-orange-200">
                      What-if: {whatIfPreview.recommendation.reason}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Past / paused goals */}
          {inactiveGoals.length > 0 && (
            <Card>
              <CardHeader title={t("goals.editGoal")} />
              <div className="space-y-3">
                {inactiveGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {g.name || "Goal"}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {g.currentWeight}kg → {g.targetWeight}kg · {Math.round(g.dailyCalories)} kcal/day
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => activate(g.id)}>
                        Reactivate
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteGoal(g.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t("goals.createGoal")} size="md">
        <GoalForm
          onSave={() => { setShowForm(false); load(); }}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      {editingGoal && (
        <Modal
          open={!!editingGoal}
          onClose={() => setEditingGoal(null)}
          title={t("goals.editGoal")}
          size="md"
        >
          <EditGoalModal
            goal={editingGoal}
            onSave={() => { setEditingGoal(null); load(); }}
            onClose={() => setEditingGoal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
