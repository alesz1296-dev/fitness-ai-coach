import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { calorieGoalsApi } from "../../api";
import type { CalorieGoal } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { useAuthStore } from "../../store/authStore";

// ── Preset templates ──────────────────────────────────────────────────────────
interface GoalPreset {
  key:        string;
  icon:       string;
  label:      string;
  desc:       string;
  color:      string;      // Tailwind border+bg+text classes
  weightPct:  number;      // target = currentWeight * (1 + weightPct/100)
  weeks:      number;
  goalName:   string;
}

const GOAL_PRESETS: GoalPreset[] = [
  {
    key: "cut_moderate", icon: "🔥", label: "Fat Loss",
    desc: "−8% body weight · 16 weeks · ~500 kcal deficit",
    color: "border-orange-300 bg-orange-50 text-orange-800",
    weightPct: -8, weeks: 16, goalName: "Fat Loss Plan",
  },
  {
    key: "cut_aggressive", icon: "⚡", label: "Aggressive Cut",
    desc: "−12% body weight · 12 weeks · ~750 kcal deficit",
    color: "border-red-300 bg-red-50 text-red-800",
    weightPct: -12, weeks: 12, goalName: "Aggressive Cut",
  },
  {
    key: "lean_bulk", icon: "💪", label: "Lean Bulk",
    desc: "+4% body weight · 16 weeks · ~300 kcal surplus",
    color: "border-blue-300 bg-blue-50 text-blue-800",
    weightPct: 4, weeks: 16, goalName: "Lean Bulk",
  },
  {
    key: "muscle_build", icon: "🏋️", label: "Muscle Building",
    desc: "+7% body weight · 20 weeks · ~500 kcal surplus",
    color: "border-purple-300 bg-purple-50 text-purple-800",
    weightPct: 7, weeks: 20, goalName: "Muscle Building",
  },
  {
    key: "maintain", icon: "⚖️", label: "Maintenance",
    desc: "Eat at TDEE · stay at current weight",
    color: "border-green-300 bg-green-50 text-green-800",
    weightPct: 0, weeks: 12, goalName: "Maintenance",
  },
  {
    key: "recomp", icon: "🔄", label: "Body Recomposition",
    desc: "TDEE calories · gain muscle, hold weight · 20 weeks",
    color: "border-cyan-300 bg-cyan-50 text-cyan-800",
    weightPct: 0, weeks: 20, goalName: "Body Recomposition",
  },
];

function addWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

// ── Goal Creator Form ─────────────────────────────────────────────────────────
function GoalForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const { user } = useAuthStore();
  const [currentWeight, setCurrentWeight] = useState(String(user?.weight ?? ""));
  const [targetWeight,  setTargetWeight]  = useState("");
  const [targetDate,    setTargetDate]    = useState(() => addWeeks(12));
  const [name,          setName]          = useState("");
  const [preview,       setPreview]       = useState<any>(null);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [activePreset,  setActivePreset]  = useState<string | null>(null);

  // Accept optional overrides so presets can call preview without waiting for setState
  const getPreview = async (overrides?: { cw?: string; tw?: string; td?: string }) => {
    const cw = overrides?.cw ?? currentWeight;
    const tw = overrides?.tw ?? targetWeight;
    const td = overrides?.td ?? targetDate;
    if (!cw || !tw || !td) { setError("Fill in all fields to preview"); return; }
    setLoading(true); setError(""); setPreview(null);
    try {
      const res = await calorieGoalsApi.preview({
        currentWeight: Number(cw),
        targetWeight:  Number(tw),
        targetDate:    td,
      });
      setPreview(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || "Preview failed. Check your profile has age, height and activity level set.");
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
        name: name || undefined,
        currentWeight: Number(currentWeight),
        targetWeight:  Number(targetWeight),
        targetDate,
      });
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save goal");
    } finally { setSaving(false); }
  };

  const hasProfile = !!(user?.age && user?.height && user?.activityLevel && user?.sex);

  return (
    <div className="space-y-5">

      {/* ── Preset tags ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Quick-start templates
          {!hasProfile && (
            <span className="ml-2 font-normal normal-case text-amber-600">
              ⚠️ Complete your profile (age, height, sex, activity) for accurate calculations
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all hover:shadow-md ${
                activePreset === p.key
                  ? p.color + " border-2 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="font-semibold text-sm">{p.icon} {p.label}</p>
              <p className="text-xs opacity-70 mt-0.5 leading-snug">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide -mb-1">Customise</p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <Input label="Goal Name (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer cut" />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Current Weight (kg)" type="number" step="0.1"
            value={currentWeight}
            onChange={(e) => { setCurrentWeight(e.target.value); setPreview(null); setActivePreset(null); }}
            placeholder="75"
          />
          <Input
            label="Target Weight (kg)"  type="number" step="0.1"
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

      {!preview ? (
        <Button className="w-full" variant="secondary" loading={loading} onClick={() => getPreview()}>
          {loading ? "Calculating…" : "Preview Plan"}
        </Button>
      ) : (
        <div className="space-y-4">
          {/* Calculation summary */}
          <div className={`rounded-xl border p-4 space-y-3 ${!preview.calculation.feasible ? "border-yellow-300 bg-yellow-50" : "border-brand-200 bg-brand-50"}`}>
            {!preview.calculation.feasible && (
              <p className="text-xs text-yellow-700 font-medium">⚠️ {preview.calculation.warning}</p>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Daily Calories", value: `${Math.round(preview.calculation.dailyCalories)} kcal` },
                { label: "Protein",        value: `${Math.round(preview.calculation.proteinGrams)}g` },
                { label: "Weekly Change",  value: `${preview.calculation.weeklyChange > 0 ? "+" : ""}${preview.calculation.weeklyChange}kg` },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-2">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="font-bold text-gray-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 text-center">
              <span>Carbs: {Math.round(preview.calculation.carbsGrams)}g</span>
              <span>Fats: {Math.round(preview.calculation.fatsGrams)}g</span>
              <span>TDEE: {Math.round(preview.calculation.tdee)} kcal</span>
            </div>
          </div>

          {/* Projection mini-chart */}
          {preview.projection?.length > 0 && (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={preview.projection} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => format(parseISO(v), "MMM d")} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} formatter={(v: number) => [`${v.toFixed(1)} kg`, "Projected"]} />
                  <ReferenceLine y={Number(targetWeight)} stroke="#22c55e" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="projectedWeight" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPreview(null)}>Back</Button>
            <Button className="flex-1" loading={saving} onClick={save}>Save Goal</Button>
          </div>
        </div>
      )}

      {!preview && <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>}
    </div>
  );
}

// ── Active goal projection chart ──────────────────────────────────────────────
function GoalProjectionChart({ goalId }: { goalId: number }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    calorieGoalsApi.getProjection(goalId).then((r) => setData(r.data));
  }, [goalId]);

  if (!data) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  const combined = data.projected.map((p: any) => ({
    date: format(parseISO(p.date), "MMM d"),
    projected: p.projectedWeight,
    actual: data.actual.find((a: any) => a.date === p.date)?.actual ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={combined} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} formatter={(v: number, n: string) => [`${v?.toFixed(1)} kg`, n === "projected" ? "Projected" : "Actual"]} />
        <Line type="monotone" dataKey="projected" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" dot={false} name="projected" />
        <Line type="monotone" dataKey="actual"    stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} name="actual" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Main Goals page ───────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [goals,    setGoals]    = useState<CalorieGoal[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

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
    if (!confirm("Delete this goal?")) return;
    await calorieGoalsApi.delete(id);
    load();
  };

  const activeGoal   = goals.find((g) => g.active);
  const inactiveGoals = goals.filter((g) => !g.active);

  const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    cut:      { label: "Cut",      color: "bg-blue-100 text-blue-700" },
    bulk:     { label: "Bulk",     color: "bg-green-100 text-green-700" },
    maintain: { label: "Maintain", color: "bg-gray-100 text-gray-600" },
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-500 text-sm mt-1">Calorie targets & body composition plans</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ New Goal</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
      ) : goals.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="font-semibold text-gray-800 mb-2">No goals set yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create a calorie goal to get a personalised macro plan</p>
          <p className="text-xs text-gray-400 mb-4">Make sure your profile has age, height, weight, sex and activity level filled in.</p>
          <Button onClick={() => setShowForm(true)}>Create My First Goal</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active goal */}
          {activeGoal && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <h2 className="font-bold text-gray-900">{activeGoal.name || "Active Goal"}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_LABELS[activeGoal.type]?.color}`}>
                      {TYPE_LABELS[activeGoal.type]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {activeGoal.currentWeight}kg → {activeGoal.targetWeight}kg by {format(parseISO(activeGoal.targetDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => deactivate(activeGoal.id)}>Pause</Button>
                  <Button variant="danger"    size="sm" onClick={() => deleteGoal(activeGoal.id)}>Delete</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Daily Calories",  value: `${Math.round(activeGoal.dailyCalories)} kcal` },
                  { label: "Protein",         value: `${Math.round(activeGoal.proteinGrams)}g` },
                  { label: "Carbs",           value: `${Math.round(activeGoal.carbsGrams)}g` },
                  { label: "Fats",            value: `${Math.round(activeGoal.fatsGrams)}g` },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              <CardHeader title="Weight Projection" subtitle="Blue dashed = projected · Green = actual" />
              <GoalProjectionChart goalId={activeGoal.id} />
            </Card>
          )}

          {/* Past goals */}
          {inactiveGoals.length > 0 && (
            <Card>
              <CardHeader title="Past Goals" />
              <div className="space-y-3">
                {inactiveGoals.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{g.name || "Goal"}</p>
                      <p className="text-xs text-gray-400">
                        {g.currentWeight}kg → {g.targetWeight}kg · {Math.round(g.dailyCalories)} kcal/day
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => activate(g.id)}>Reactivate</Button>
                      <Button size="sm" variant="danger"    onClick={() => deleteGoal(g.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Goal" size="md">
        <GoalForm onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
