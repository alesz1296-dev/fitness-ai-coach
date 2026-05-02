import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { calorieGoalsApi } from "../../api";
import { useTranslation } from "../../i18n";
import type { CalorieGoal } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { useAuthStore } from "../../store/authStore";
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

// ── Goal Creator Form ─────────────────────────────────────────────────────────
function GoalForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
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
          placeholder="e.g. Summer cut"
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
        placeholder="e.g. Summer cut"
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await calorieGoalsApi.getAll();
      setGoals(res.data.goals);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
                    {format(parseISO(activeGoal.targetDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => setEditingGoal(activeGoal)}>{t("common.edit")}</Button>
                  <Button variant="secondary" size="sm" onClick={() => deactivate(activeGoal.id)}>Pause</Button>
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

              <CardHeader
                title={t("goals.progressToDate")}
                subtitle={t("dashboard.weightTrendSub")}
              />
              <ActiveGoalChart goalId={activeGoal.id} targetWeight={activeGoal.targetWeight} />
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
