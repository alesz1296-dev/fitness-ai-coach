import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, Legend, ComposedChart, Bar,
  ReferenceLine, ReferenceArea,
} from "recharts";
import { weightApi, workoutsApi, predictionsApi, analyticsApi } from "../../api";
import { useTranslation } from "../../i18n";
import type { AnalyticsData } from "../../api";
import type { WeightLog, WeightStats, ExerciseProgression } from "../../types";
import { useAuthStore } from "../../store/authStore";
import GoalsPage from "../goals/GoalsPage";
import { useIsDark } from "../../hooks/useDarkMode";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Body composition formulas
// ─────────────────────────────────────────────────────────────────────────────

export type BFFormula = "deurenberg" | "boer" | "james" | "hume" | "cunbae";

export const BF_FORMULA_LABELS: Record<BFFormula, string> = {
  deurenberg: "Deurenberg (1991) — BMI-based",
  boer:       "Boer (1984) — Lean mass",
  james:      "James (1976) — Lean mass",
  hume:       "Hume (1966) — Lean mass",
  cunbae:     "CUN-BAE — BMI polynomial",
};

function calcBMI(weight: number, heightCm: number): number | null {
  if (!weight || !heightCm) return null;
  const h = heightCm / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}

/**
 * Returns body fat % for the given formula.
 * LBM-based formulas (Boer, James, Hume) return lean body mass first,
 * then derive fat % as (weight - LBM) / weight × 100.
 */
function calcBodyFat(
  weight: number,
  heightCm: number,
  age: number,
  sex: "male" | "female",
  formula: BFFormula = "deurenberg",
): number | null {
  if (!weight || !heightCm || !age) return null;
  const h = heightCm / 100;
  const bmi = weight / (h * h);
  if (bmi < 10 || bmi > 60) return null;

  let fatPct: number;

  if (formula === "deurenberg") {
    // Deurenberg et al. (1991) — Int J Obes Relat Metab Disord
    // BF% = 1.20×BMI + 0.23×age − 10.8×sex − 5.4   (sex: 1=male, 0=female)
    fatPct = 1.20 * bmi + 0.23 * age - (sex === "male" ? 10.8 : 0) - 5.4;

  } else if (formula === "boer") {
    // Boer (1984) lean body mass formula — derives BF% from LBM
    const lbm = sex === "male"
      ? 0.407 * weight + 0.267 * heightCm - 19.2
      : 0.252 * weight + 0.473 * heightCm - 48.3;
    fatPct = ((weight - lbm) / weight) * 100;

  } else if (formula === "james") {
    // James (1976) LBM — widely used in pharmacokinetics
    const lbm = sex === "male"
      ? 1.1 * weight - 128 * Math.pow(weight / heightCm, 2)
      : 1.07 * weight - 148 * Math.pow(weight / heightCm, 2);
    fatPct = ((weight - lbm) / weight) * 100;

  } else if (formula === "hume") {
    // Hume (1966) LBM — early clinical reference
    const lbm = sex === "male"
      ? 0.3281 * weight + 0.3393 * heightCm - 29.5336
      : 0.2994 * weight + 0.7869 * heightCm - 14.6461;
    fatPct = ((weight - lbm) / weight) * 100;

  } else {
    // CUN-BAE — Clínica Universidad de Navarra Body Adiposity Estimator
    // Gómez-Ambrosi et al. (2012)  sex: 0=male, 1=female
    const s = sex === "female" ? 1 : 0;
    fatPct =
      -44.988 +
      0.503 * age +
      10.689 * s +
      3.172 * bmi -
      0.026 * bmi * bmi +
      0.181 * bmi * s -
      0.02  * bmi * age -
      0.005 * bmi * bmi * s +
      0.00021 * bmi * bmi * age;
  }

  return Math.max(3, Math.min(65, Math.round(fatPct * 10) / 10));
}

interface BodyComp {
  bmi: number;
  fatPct: number;
  fatKg: number;
  leanKg: number;
  musclePct: number;
  muscleKg: number;
  bmiCategory: string;
  fatCategory: string;
  fatColor: string;
}

function computeBodyComp(
  weight: number,
  heightCm: number,
  age: number,
  sex: "male" | "female",
  formula: BFFormula = "deurenberg",
): BodyComp | null {
  const bmi = calcBMI(weight, heightCm);
  const fatPct = calcBodyFat(weight, heightCm, age, sex, formula);
  if (!bmi || fatPct === null) return null;

  const fatKg    = Math.round(weight * fatPct / 100 * 10) / 10;
  const leanKg   = Math.round((weight - fatKg) * 10) / 10;
  // Skeletal muscle ≈ 85% of lean mass (lean = muscle + bone + organs + water)
  const muscleKg  = Math.round(leanKg * 0.85 * 10) / 10;
  const musclePct = Math.round(muscleKg / weight * 100 * 10) / 10;

  const bmiCategory =
    bmi < 18.5 ? "Underweight"
    : bmi < 25  ? "Normal"
    : bmi < 30  ? "Overweight"
    : "Obese";

  // ACE fat-category thresholds
  let fatCategory: string;
  let fatColor: string;
  if (sex === "male") {
    fatCategory = fatPct < 6 ? "Essential" : fatPct < 14 ? "Athlete" : fatPct < 18 ? "Fitness" : fatPct < 25 ? "Average" : "Above average";
    fatColor    = fatPct < 14 ? "text-green-600" : fatPct < 25 ? "text-yellow-600" : "text-red-500";
  } else {
    fatCategory = fatPct < 14 ? "Essential" : fatPct < 21 ? "Athlete" : fatPct < 25 ? "Fitness" : fatPct < 32 ? "Average" : "Above average";
    fatColor    = fatPct < 21 ? "text-green-600" : fatPct < 32 ? "text-yellow-600" : "text-red-500";
  }

  return { bmi, fatPct, fatKg, leanKg, musclePct, muscleKg, bmiCategory, fatCategory, fatColor };
}

// ─────────────────────────────────────────────────────────────────────────────
// Log weight form
// ─────────────────────────────────────────────────────────────────────────────
function LogWeightForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [weight,  setWeight]  = useState("");
  const [notes,   setNotes]   = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const submit = async () => {
    const w = Number(weight);
    if (!w || w < 20 || w > 500) { setError("Enter a valid weight (20–500 kg)"); return; }
    setLoading(true); setError("");
    try {
      await weightApi.log({ weight: w, notes: notes || undefined, date });
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to log weight");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <Input label="Weight (kg)" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75.5" />
      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Morning weight, after gym…" />
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>{t("progress.logWeight")}</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Body composition card
// ─────────────────────────────────────────────────────────────────────────────
function BodyCompositionCard({
  logs,
  weight,
  heightCm,
  age,
  sex,
}: {
  logs: WeightLog[];
  weight: number | null | undefined;
  heightCm: number | null | undefined;
  age: number | null | undefined;
  sex: "male" | "female" | null | undefined;
}) {
  const { t } = useTranslation();
  const isDark   = useIsDark();
  const chartGrid   = isDark ? "#374151" : "#f0f0f0";
  const chartTick   = isDark ? "#9ca3af" : "#9ca3af";
  const chartBg     = isDark ? "#1f2937" : "#ffffff";
  const chartBorder = isDark ? "#374151" : "#e5e7eb";
  const chartText   = isDark ? "#f3f4f6" : "#111827";
  const [formula, setFormula] = useState<BFFormula>("deurenberg");

  const missingFields = !weight || !heightCm || !age || !sex;
  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight : weight;
  const comp = !missingFields && latestWeight
    ? computeBodyComp(latestWeight, heightCm!, age!, sex!, formula)
    : null;

  // Build fat% trend from weight logs using the selected formula
  const fatTrend = !missingFields
    ? logs
        .map((l) => {
          const f = calcBodyFat(l.weight, heightCm!, age!, sex!, formula);
          return f !== null
            ? { date: format(parseISO(l.date), "MMM d"), fatPct: f, weight: l.weight }
            : null;
        })
        .filter(Boolean)
    : [];

  if (missingFields) {
    return (
      <Card>
        <CardHeader title={t("progress.bodyFat")} subtitle="Estimated from your profile" />
        <div className="text-center py-8 text-gray-400 text-sm space-y-2">
          <p className="text-2xl">📊</p>
          <p>Complete your profile to see body composition estimates.</p>
          <p className="text-xs">Missing: {[!weight && "weight", !heightCm && "height", !age && "age", !sex && "sex"].filter(Boolean).join(", ")}</p>
          <a href="/settings" className="inline-block mt-2 text-brand-600 text-xs underline">Go to Settings →</a>
        </div>
      </Card>
    );
  }

  if (!comp) return null;

  const bmiPct = Math.min(100, Math.max(0, ((comp.bmi - 15) / (40 - 15)) * 100));
  const bmiColor =
    comp.bmiCategory === "Normal" ? "bg-green-500"
    : comp.bmiCategory === "Underweight" ? "bg-blue-400"
    : comp.bmiCategory === "Overweight" ? "bg-yellow-500"
    : "bg-red-500";

  return (
    <Card>
      <CardHeader
        title={t("progress.bodyFat")}
        subtitle={`Estimated · ${latestWeight} kg`}
      />
      <div className="space-y-5">

        {/* Formula selector */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Estimation formula</label>
          <select
            value={formula}
            onChange={(e) => setFormula(e.target.value as BFFormula)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {(Object.entries(BF_FORMULA_LABELS) as [BFFormula, string][]).map(([k, label]) => (
              <option key={k} value={k}>{label}{k === "deurenberg" ? " ★" : ""}</option>
            ))}
          </select>
        </div>

        {/* BMI gauge */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">BMI</span>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{comp.bmi} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">({comp.bmiCategory})</span></span>
          </div>
          <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-full flex">
              <div className="flex-1 bg-blue-200 opacity-60" />
              <div className="flex-1 bg-green-200 opacity-60" />
              <div className="flex-1 bg-yellow-200 opacity-60" />
              <div className="flex-1 bg-red-200 opacity-60" />
            </div>
            <div
              className={`absolute top-0 h-full w-1 rounded-full ${bmiColor} shadow`}
              style={{ left: `${bmiPct}%`, transform: "translateX(-50%)" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            <span>15</span><span>Underweight</span><span>Normal</span><span>Overweight</span><span>40+</span>
          </div>
        </div>

        {/* Composition metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-red-400 font-medium mb-0.5">Body Fat</p>
            <p className={`text-2xl font-bold ${comp.fatColor}`}>{comp.fatPct}<span className="text-sm font-normal">%</span></p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{comp.fatKg} kg · {comp.fatCategory}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-blue-400 font-medium mb-0.5">Muscle Mass</p>
            <p className="text-2xl font-bold text-blue-600">{comp.musclePct}<span className="text-sm font-normal">%</span></p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{comp.muscleKg} kg</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-0.5">Lean Mass</p>
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-100">{comp.leanKg}<span className="text-sm font-normal">kg</span></p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{Math.round((comp.leanKg / (latestWeight ?? 1)) * 100)}%</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-purple-400 font-medium mb-0.5">BMI</p>
            <p className="text-2xl font-bold text-purple-600">{comp.bmi}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{comp.bmiCategory}</p>
          </div>
        </div>

        {/* Composition bar */}
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Body breakdown</p>
          <div className="h-4 rounded-full overflow-hidden flex">
            <div className="bg-red-400 transition-all" style={{ width: `${comp.fatPct}%` }} title={`Fat: ${comp.fatPct}%`} />
            <div className="bg-blue-400 transition-all" style={{ width: `${comp.musclePct}%` }} title={`Muscle: ${comp.musclePct}%`} />
            <div className="bg-gray-200 flex-1" title="Lean (bone/water/organs)" />
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Fat {comp.fatPct}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Muscle ~{comp.musclePct}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Other {Math.round(100 - comp.fatPct - comp.musclePct)}%</span>
          </div>
        </div>

        {/* Fat % trend chart */}
        {fatTrend.length > 1 && (
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-2">BODY FAT % TREND</p>
            <ResponsiveContainer width="100%" height={120}>
              <ComposedChart data={fatTrend as any} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="fat" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis yAxisId="wt" orientation="right" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText }}
                  formatter={(v: number, n: string) => [n === "fatPct" ? `${v}%` : `${v} kg`, n === "fatPct" ? "Body fat" : "Weight"]}
                />
                <Line yAxisId="fat" type="monotone" dataKey="fatPct" stroke="#f87171" strokeWidth={2} dot={false} name="fatPct" />
                <Line yAxisId="wt" type="monotone" dataKey="weight" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="weight" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center">
          Estimated via {BF_FORMULA_LABELS[formula]}. Results vary by formula — for clinical accuracy use DEXA or hydrostatic weighing.
        </p>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise progression section
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseProgressionSection() {
  const { t } = useTranslation();
  const isDark   = useIsDark();
  const chartGrid   = isDark ? "#374151" : "#f0f0f0";
  const chartTick   = isDark ? "#9ca3af" : "#9ca3af";
  const chartBg     = isDark ? "#1f2937" : "#ffffff";
  const chartBorder = isDark ? "#374151" : "#e5e7eb";
  const chartText   = isDark ? "#f3f4f6" : "#111827";
  const [query,   setQuery]   = useState("");
  const [data,    setData]    = useState<ExerciseProgression[]>([]);
  const [meta,    setMeta]    = useState<{ exerciseName: string; allTimePR: any; totalSessions: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await workoutsApi.getExerciseProgression(query.trim(), 30);
      setData(res.data.progression);
      setMeta({ exerciseName: res.data.exerciseName, allTimePR: res.data.allTimePR, totalSessions: res.data.totalSessions });
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader title={t("workouts.exercises")} subtitle="Track strength gains over time" />
      <div className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. Bench Press, Squat, Deadlift…"
          className="flex-1"
        />
        <Button onClick={search} loading={loading}>{t("common.search")}</Button>
      </div>

      {meta && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <span className="font-semibold text-gray-700 dark:text-gray-200">{meta.exerciseName}</span>
          <span className="text-gray-400 dark:text-gray-500 text-xs">{meta.totalSessions} sessions logged</span>
          {meta.allTimePR && (
            <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-semibold">
              🏆 All-time PR: {meta.allTimePR.maxWeight} kg × {meta.allTimePR.bestReps} reps ({meta.allTimePR.date})
            </span>
          )}
        </div>
      )}

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText, fontSize: "12px" }}
              formatter={(v: number, n: string) => [
                n === "totalVolume" ? `${v.toLocaleString()} kg` : `${v} kg`,
                n === "maxWeight" ? "Max Weight" : n === "estimated1RM" ? "Est. 1RM" : "Volume",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Line yAxisId="left"  type="monotone" dataKey="maxWeight"    stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="Max Weight" />
            <Line yAxisId="left"  type="monotone" dataKey="estimated1RM" stroke="#8b5cf6" strokeWidth={2}   strokeDasharray="4 2" dot={false} name="Est. 1RM" />
            <Line yAxisId="right" type="monotone" dataKey="totalVolume"  stroke="#10b981" strokeWidth={1.5} dot={false} name="Volume" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-10 text-gray-400 text-sm">
          {loading ? "Loading…" : "Search for an exercise to see its progression chart"}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prediction Card
// ─────────────────────────────────────────────────────────────────────────────

/** Small stat box used in the prediction summary row */
function PredStat({ label, value, sub, color = "text-gray-900" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-center">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/** Circular adherence gauge */
function AdherenceGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const strokeDash = `${pct} ${100 - pct}`;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={strokeDash} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
          {pct}%
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1 text-center">{label}</p>
    </div>
  );
}

function PredictionCard({ data, loading }: { data: any | null; loading: boolean }) {
  const isDark      = useIsDark();
  const chartGrid   = isDark ? "#374151" : "#f0f0f0";
  const chartTick   = isDark ? "#9ca3af" : "#9ca3af";
  const chartBg     = isDark ? "#1f2937" : "#ffffff";
  const chartBorder = isDark ? "#374151" : "#e5e7eb";
  const chartText   = isDark ? "#f3f4f6" : "#111827";
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="animate-spin w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-400">Crunching your data…</p>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="text-center py-12">
        <div className="text-4xl mb-3">📊</div>
        <p className="font-semibold text-gray-700 mb-1">No prediction data</p>
        <p className="text-sm text-gray-400">Start logging weight, food, and workouts to unlock predictions.</p>
      </Card>
    );
  }

  if (!data.hasEnoughData) {
    return (
      <Card className="text-center py-12">
        <div className="text-4xl mb-3">⏳</div>
        <p className="font-semibold text-gray-700 mb-1">Almost there!</p>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">{data.message}</p>
        <div className="mt-4 mx-auto w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${((data.daysLogged ?? 0) / 7) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{data.daysLogged ?? 0} / 7 days</p>
      </Card>
    );
  }

  // ── Build chart data: combine historical + projection ───────────────────────

  const histPoints = (data.weeklyHistory ?? [])
    .filter((w: any) => w.avgWeight != null)
    .map((w: any) => ({
      label:    `W${w.weekNum}`,
      actual:   w.avgWeight as number,
      kcal:     w.avgCalories,
      trend:    null as number | null,
      ideal:    null as number | null,
      bandLow:  null as number | null,
      bandHi:   null as number | null,
    }));

  const lastActual: number | null = histPoints.length > 0 ? histPoints[histPoints.length - 1].actual : null;

  const projections = data.projections ?? [];
  const projPoints = projections.map((p: any) => ({
    label:   p.week === 0 ? "Now" : `+${p.week}w`,
    // Only carry actual on week=0 if there is no histPoints (avoids duplicate dot)
    actual:  p.week === 0 && histPoints.length === 0 ? lastActual : null,
    trend:   p.trendWeight as number | null,
    ideal:   p.idealWeight as number | null,
    bandLow: p.trendLow as number | null,
    bandHi:  p.trendHigh as number | null,
  }));

  // Bridge: copy trend/ideal values from "Now" onto the last historical point so
  // the dashed projection lines start exactly where the green actual line ends,
  // not floating in empty space.
  const week0Proj = projections.find((p: any) => p.week === 0);
  if (histPoints.length > 0 && week0Proj) {
    const last = histPoints[histPoints.length - 1];
    last.trend   = week0Proj.trendWeight ?? null;
    last.ideal   = week0Proj.idealWeight ?? null;
    last.bandLow = week0Proj.trendLow    ?? null;
    last.bandHi  = week0Proj.trendHigh   ?? null;
  }

  const chartData = [...histPoints, ...projPoints];

  const bfProj = (data.projections ?? []).filter((p: any) => [0, 4, 8, 12].includes(p.week));

  const slope = (data.realTrend?.slopePerWeek ?? 0) as number;
  const slopeLabel = slope === 0 ? "Stable"
    : slope > 0 ? `+${slope.toFixed(2)} kg/wk`
    : `${slope.toFixed(2)} kg/wk`;
  const slopeColor = slope < 0 ? "text-green-600" : slope > 0 ? "text-red-500" : "text-gray-500";

  const ideal = (data.calorieModel?.theoreticalWeeklyChange ?? 0) as number;
  const idealLabel = ideal === 0 ? "Stable"
    : ideal > 0 ? `+${ideal.toFixed(2)} kg/wk`
    : `${ideal.toFixed(2)} kg/wk`;

  const confidenceColors: Record<string, string> = {
    high:         "text-green-600 bg-green-50",
    medium:       "text-yellow-600 bg-yellow-50",
    low:          "text-orange-500 bg-orange-50",
    insufficient: "text-gray-400 bg-gray-50",
  };
  const conf = (data.realTrend?.confidence ?? "insufficient") as string;

  return (
    <div className="space-y-6">
      {/* ── Summary stats row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <PredStat label="Current Weight" value={`${data.currentWeight} kg`} />
        {data.targetWeight && (
          <PredStat
            label="Target Weight"
            value={`${data.targetWeight} kg`}
            sub={data.estimatedGoalDate ? `ETA ${data.estimatedGoalDate}` : undefined}
            color="text-brand-700"
          />
        )}
        <PredStat label="Real Pace" value={slopeLabel} sub={`r²=${data.realTrend?.r2?.toFixed(2) ?? "—"}`} color={slopeColor} />
        <PredStat
          label="Calorie Model"
          value={idealLabel}
          sub={`${(data.calorieModel?.avgNetBalance ?? 0) > 0 ? "+" : ""}${data.calorieModel?.avgNetBalance ?? 0} kcal/day avg`}
          color={ideal < 0 ? "text-blue-600" : ideal > 0 ? "text-orange-500" : "text-gray-500"}
        />
        <PredStat label="Weeks of Data" value={String(data.weeksOfData)} sub={`${data.daysLogged} days`} />
        <PredStat
          label="Body Fat (est.)"
          value={`${data.startBodyFatPct}%`}
          sub={`Lean: ${data.startLeanMassKg} kg`}
        />
      </div>

      {/* ── Confidence badge ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${confidenceColors[conf] ?? confidenceColors.insufficient}`}>
          Trend confidence: {conf}
        </span>
        {data.realTrend?.r2 != null && (
          <span className="text-xs text-gray-400">
            R² = {data.realTrend.r2.toFixed(3)} · slope from {data.daysLogged} logged days
          </span>
        )}
        {data.proteinAdequate === false && (
          <span className="text-xs text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
            ⚠️ Avg protein below 1.6 g/kg — muscle retention at risk
          </span>
        )}
      </div>

      {/* ── Main projection chart ───────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Weight Trajectory — Actual vs Projected"
          subtitle="Green = real data · Blue dashed = trend forecast · Orange dashed = calorie-balance model"
        />
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText, fontSize: "12px" }}
              formatter={(v: any, name: string) => {
                if (v == null) return [null, name];
                const labels: Record<string, string> = {
                  actual: "Actual (avg/wk)",
                  trend:  "Trend forecast",
                  ideal:  "Calorie model",
                  bandLow: "Lower bound",
                  bandHi:  "Upper bound",
                };
                return [`${Number(v).toFixed(1)} kg`, labels[name] ?? name];
              }}
            />
            <Legend formatter={(v) => ({ actual: "Actual", trend: "Trend", ideal: "Calorie Model" } as Record<string, string>)[v] ?? v}
              wrapperStyle={{ fontSize: "11px" }} />
            {/* Confidence band — upper & lower as thin lines */}
            <Line dataKey="bandHi"  stroke="#bfdbfe" strokeWidth={1} dot={false} legendType="none" name="bandHi"  connectNulls />
            <Line dataKey="bandLow" stroke="#bfdbfe" strokeWidth={1} dot={false} legendType="none" name="bandLow" connectNulls />
            {/* Actual weight history */}
            <Line dataKey="actual" stroke="#22c55e" strokeWidth={2.5}
              dot={{ fill: "#22c55e", r: 3 }} connectNulls={false} name="actual" />
            {/* Trend projection (dashed) */}
            <Line dataKey="trend" stroke="#3b82f6" strokeWidth={2}
              strokeDasharray="6 3" dot={false} connectNulls name="trend" />
            {/* Calorie model (dashed orange) */}
            <Line dataKey="ideal" stroke="#f59e0b" strokeWidth={2}
              strokeDasharray="4 4" dot={false} connectNulls name="ideal" />
            <ReferenceLine x="Now" stroke="#94a3b8" strokeDasharray="3 3"
              label={{ value: "Today", position: "top", fontSize: 10, fill: "#94a3b8" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Body composition projection ─────────────────────────────────────── */}
      {bfProj.length > 0 && (
        <Card>
          <CardHeader
            title="Body Composition Forecast"
            subtitle="Estimated fat %, lean mass, and fat mass — based on current trend + training stimulus"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Horizon", "Weight", "Body Fat %", "Lean Mass", "Fat Mass", "Δ vs Now"].map((h) => (
                    <th key={h} className="py-2 text-xs text-gray-400 dark:text-gray-500 font-medium text-right first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bfProj.map((p: any) => {
                  const projW = p.trendWeight ?? p.idealWeight ?? data.currentWeight;
                  const delta = (projW - data.currentWeight) as number;
                  return (
                    <tr key={p.week} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-2.5 font-medium text-gray-800 dark:text-gray-100">
                        {p.week === 0 ? "Now" : `${p.week} weeks`}
                        {p.week > 0 && <span className="ml-1 text-xs text-gray-400">({p.date})</span>}
                      </td>
                      <td className="py-2.5 text-right">{projW != null ? Number(projW).toFixed(1) : "—"} kg</td>
                      <td className="py-2.5 text-right font-semibold" style={{
                        color: (p.bodyFatPct ?? 30) < 15 ? "#22c55e" : (p.bodyFatPct ?? 30) < 25 ? "#f59e0b" : "#ef4444",
                      }}>
                        {p.bodyFatPct != null ? Number(p.bodyFatPct).toFixed(1) : "—"}%
                      </td>
                      <td className="py-2.5 text-right text-blue-600">{p.leanMassKg != null ? Number(p.leanMassKg).toFixed(1) : "—"} kg</td>
                      <td className="py-2.5 text-right text-red-500">{p.fatMassKg != null ? Number(p.fatMassKg).toFixed(1) : "—"} kg</td>
                      <td className="py-2.5 text-right">
                        {p.week === 0 ? "—" : (
                          <span className={delta < 0 ? "text-green-600" : delta > 0 ? "text-orange-500" : "text-gray-500"}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)} kg
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Weekly history ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Weekly History" subtitle="Your logged data aggregated into weekly snapshots" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {["Week", "Avg Weight", "Δ Weight", "Avg Kcal", "Avg Protein", "Workouts", "Net Balance"].map((h) => (
                  <th key={h} className="py-2 text-xs text-gray-400 dark:text-gray-500 font-medium text-right first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.weeklyHistory ?? []).map((w: any) => (
                <tr key={w.weekNum} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-2 text-gray-700 dark:text-gray-300 text-xs">
                    W{w.weekNum}
                    <span className="text-gray-400 ml-1">{w.weekStart}</span>
                  </td>
                  <td className="py-2 text-right font-medium">{w.avgWeight != null ? `${w.avgWeight} kg` : "—"}</td>
                  <td className="py-2 text-right">
                    {w.weightChange != null ? (
                      <span className={w.weightChange < 0 ? "text-green-600" : w.weightChange > 0 ? "text-red-500" : "text-gray-400"}>
                        {w.weightChange > 0 ? "+" : ""}{w.weightChange} kg
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2 text-right">{w.avgCalories != null ? `${Math.round(w.avgCalories)} kcal` : "—"}</td>
                  <td className="py-2 text-right">{w.avgProtein  != null ? `${Math.round(w.avgProtein)}g`   : "—"}</td>
                  <td className="py-2 text-right">{w.totalWorkouts}</td>
                  <td className="py-2 text-right">
                    {w.netBalance != null ? (
                      <span className={w.netBalance < 0 ? "text-blue-600" : w.netBalance > 0 ? "text-orange-500" : "text-gray-500"}>
                        {w.netBalance > 0 ? "+" : ""}{Math.round(w.netBalance)} kcal
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Adherence & insight panel ───────────────────────────────────────── */}
      <Card>
        <CardHeader title="Consistency & Adherence" subtitle="How regularly you're tracking vs your goals" />
        <div className="flex flex-wrap justify-around gap-6 py-2">
          <AdherenceGauge score={data.foodAdherence   ?? 0} label="Food logging" />
          <AdherenceGauge score={data.weightAdherence ?? 0} label="Weight logging" />
          {data.workoutAdherence != null && (
            <AdherenceGauge score={data.workoutAdherence} label="Workout adherence" />
          )}
          <AdherenceGauge score={data.adherenceScore ?? 0} label="Overall score" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-50 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-400 font-medium mb-1">🔬 Calorie model says</p>
            <p className="text-blue-800">
              Avg intake <span className="font-semibold">{data.calorieModel?.avgDailyIntake ?? 0} kcal/day</span> vs
              TDEE <span className="font-semibold">{data.calorieModel?.estimatedTDEE ?? 0} kcal</span>.
              {" "}Theoretical change: <span className={`font-semibold ${ideal < 0 ? "text-blue-700" : "text-orange-600"}`}>{idealLabel}/week</span>.
            </p>
          </div>
          <div className="bg-green-50 rounded-xl px-4 py-3">
            <p className="text-xs text-green-500 font-medium mb-1">📏 Scale says</p>
            <p className="text-green-800">
              Actual trend: <span className="font-semibold">{slopeLabel}</span>.
              {" "}Lean mass gain: <span className="font-semibold">{data.leanGainPerWeek > 0 ? "+" : ""}{data.leanGainPerWeek} kg/wk</span> (est.).
            </p>
          </div>
        </div>
        {data.estimatedGoalDate && data.targetWeight && (
          <div className="mt-3 bg-brand-50 rounded-xl px-4 py-3 text-sm text-brand-800">
            🎯 At your current real pace you should reach <span className="font-semibold">{data.targetWeight} kg</span> by{" "}
            <span className="font-semibold">{data.estimatedGoalDate}</span>
            {data.scheduledGoalDate && data.scheduledGoalDate !== data.estimatedGoalDate && (
              <span className="text-brand-500 text-xs ml-1">(goal deadline: {data.scheduledGoalDate})</span>
            )}.
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Tab — calorie history, macros, workout frequency, calorie balance
// ─────────────────────────────────────────────────────────────────────────────

function StatBadge({ label, value, sub, color = "text-gray-900 dark:text-white" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-center">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function AnalyticsTab() {
  const { t } = useTranslation();
  const isDark      = useIsDark();
  const chartGrid   = isDark ? "#374151" : "#f0f0f0";
  const chartTick   = isDark ? "#9ca3af" : "#9ca3af";
  const chartBg     = isDark ? "#1f2937" : "#ffffff";
  const chartBorder = isDark ? "#374151" : "#e5e7eb";
  const chartText   = isDark ? "#f3f4f6" : "#111827";

  const [days,    setDays]    = useState(90);
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.get(days);
      setData(res.data);
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary;
  const daily   = data?.dailySeries ?? [];
  const weekly  = data?.workoutTrend ?? [];

  // Thin out x-axis labels for readability depending on range
  const tickInterval = days <= 14 ? 1 : days <= 30 ? 3 : days <= 90 ? 6 : 14;

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {daily.length} days of data · {weekly.length} week{weekly.length !== 1 ? "s" : ""} of workouts
        </p>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={180}>6 months</option>
          <option value={365}>1 year</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin w-9 h-9 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : !data || daily.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No data yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">Start logging food and workouts to see your analytics here.</p>
        </Card>
      ) : (
        <>
          {/* Summary stat row */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBadge label="Avg Calories"  value={`${summary.avgCalories.toLocaleString()} kcal`} sub="tracked days" color="text-orange-600" />
              <StatBadge label="Avg Protein"   value={`${summary.avgProtein}g`} sub="per day" color="text-blue-600" />
              <StatBadge label="Total Workouts" value={String(summary.totalWorkouts)} sub={`last ${days}d`} color="text-brand-700 dark:text-brand-400" />
              <StatBadge label="Total Burned"  value={`${summary.totalBurned.toLocaleString()} kcal`} sub="from workouts" color="text-red-500" />
            </div>
          )}

          {/* Calorie intake + 7-day rolling avg */}
          <Card>
            <CardHeader title={t("common.calories")} subtitle="Daily total (bars) and 7-day rolling average (line)" />
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} interval={tickInterval} />
                <YAxis tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText }}
                  formatter={(v: number, n: string) => [
                    `${v.toLocaleString()} kcal`,
                    n === "calories" ? "Calories" : "7-day avg",
                  ]}
                />
                <Area type="monotone" dataKey="calories" fill="url(#calGrad)" stroke="#f97316" strokeWidth={0} dot={false} />
                <Line type="monotone" dataKey="avg7" stroke="#f97316" strokeWidth={2.5} dot={false} name="avg7" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Macro breakdown — stacked bar */}
          <Card>
            <CardHeader title={t("nutrition.macros")} subtitle="Protein · Carbs · Fats (g/day)" />
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} interval={tickInterval} />
                <YAxis tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText }}
                  formatter={(v: number, n: string) => [`${v}g`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="protein" name="Protein" stackId="m" fill="#3b82f6" maxBarSize={8} />
                <Bar dataKey="carbs"   name="Carbs"   stackId="m" fill="#f59e0b" maxBarSize={8} />
                <Bar dataKey="fats"    name="Fats"    stackId="m" fill="#ec4899" maxBarSize={8} radius={[2,2,0,0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Calorie balance — intake vs burned */}
          {daily.some((d) => d.burned > 0) && (
            <Card>
              <CardHeader title="Calorie Balance" subtitle="Intake vs workout calories burned — green = deficit, red = surplus" />
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} interval={tickInterval} />
                  <YAxis tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText }}
                    formatter={(v: number, n: string) => [`${v.toLocaleString()} kcal`, n === "net" ? "Net (intake − burned)" : n === "calories" ? "Intake" : "Burned"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="calories" name="Intake"  stackId="a" fill="#f97316" maxBarSize={8} />
                  <Bar dataKey="burned"   name="Burned"  stackId="a" fill="#ef4444" maxBarSize={8} radius={[2,2,0,0]} />
                  <Line type="monotone" dataKey="net" name="net" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                  <ReferenceLine y={0} stroke={chartGrid} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Workout frequency — weekly bar */}
          {weekly.length > 0 && (
            <Card>
              <CardHeader title="Workout Frequency" subtitle="Sessions and calories burned per week" />
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={weekly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kcal`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText }}
                    formatter={(v: number, n: string) => [
                      n === "burned" ? `${v.toLocaleString()} kcal` : n === "count" ? `${v} sessions` : `${v} min`,
                      n === "burned" ? "Burned" : n === "count" ? "Sessions" : "Duration",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar yAxisId="left"  dataKey="count"         name="count"   fill="#6366f1" radius={[4,4,0,0]} maxBarSize={32} />
                  <Line yAxisId="right" type="monotone" dataKey="burned" name="burned" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Weight trend in analytics */}
          {data.weightSeries && data.weightSeries.length > 1 && (
            <Card>
              <CardHeader title={t("dashboard.weightTrend")} subtitle="Logged weight over the selected period" />
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={data.weightSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(data.weightSeries.length / 8))} />
                  <YAxis tick={{ fontSize: 10, fill: chartTick }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText }} formatter={(v: number) => [`${v} kg`, "Weight"]} />
                  <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 2, fill: "#8b5cf6" }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Nutrition adherence summary */}
          {summary && (
            <Card>
              <CardHeader title="Nutrition Adherence" subtitle="How often you hit your daily targets" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{summary.avgCalories.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">avg kcal/day</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{summary.avgProtein}g</p>
                  <p className="text-xs text-gray-400 mt-0.5">avg protein/day</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-brand-600">{summary.totalWorkouts}</p>
                  <p className="text-xs text-gray-400 mt-0.5">workouts logged</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{summary.totalBurned.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">kcal burned</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{daily.filter((d) => d.calories > 0).length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">days tracked</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {daily.length > 0 ? Math.round((daily.filter((d) => d.calories > 0).length / daily.length) * 100) : 0}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">logging rate</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Progress page
// ─────────────────────────────────────────────────────────────────────────────
type TabId = "body" | "strength" | "predictions" | "analytics" | "goals";

export default function ProgressPage() {
  const { t } = useTranslation();
  const { user }                   = useAuthStore();
  const isDark   = useIsDark();
  const chartGrid   = isDark ? "#374151" : "#f0f0f0";
  const chartTick   = isDark ? "#9ca3af" : "#9ca3af";
  const chartBg     = isDark ? "#1f2937" : "#ffffff";
  const chartBorder = isDark ? "#374151" : "#e5e7eb";
  const chartText   = isDark ? "#f3f4f6" : "#111827";

  const [logs,     setLogs]        = useState<WeightLog[]>([]);
  const [stats,    setStats]       = useState<WeightStats | null>(null);
  const [loading,  setLoading]     = useState(true);
  const [showForm, setShowForm]    = useState(false);
  const [days,     setDays]        = useState(90);
  const [tab,      setTab]         = useState<TabId>("body");

  // Prediction data
  const [predData,    setPredData]    = useState<any | null>(null);
  const [predLoading, setPredLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await weightApi.getLogs(days);
      setLogs(res.data.logs);
      setStats(res.data.stats);
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // Load predictions when Predictions tab is opened (lazy — only fetched once per session)
  useEffect(() => {
    if (tab !== "predictions" || predData !== null) return;
    setPredLoading(true);
    predictionsApi.get()
      .then((r) => setPredData(r.data))
      .catch(() => setPredData(null))
      .finally(() => setPredLoading(false));
  }, [tab]);

  const deleteLog = async (id: number) => {
    if (!confirm("Delete this weight entry?")) return;
    await weightApi.delete(id);
    load();
  };

  // Edit weight log
  const [editingLog,  setEditingLog]  = useState<WeightLog | null>(null);
  const [editWeight,  setEditWeight]  = useState("");
  const [editDate,    setEditDate]    = useState("");
  const [editNotes,   setEditNotes]   = useState("");
  const [savingEdit,  setSavingEdit]  = useState(false);

  const openEdit = (log: WeightLog) => {
    setEditingLog(log);
    setEditWeight(String(log.weight));
    setEditDate(log.date.split("T")[0]);
    setEditNotes(log.notes ?? "");
  };

  const handleEditSubmit = async () => {
    if (!editingLog) return;
    const w = Number(editWeight);
    if (!w || w < 20 || w > 500) return;
    setSavingEdit(true);
    try {
      await weightApi.update(editingLog.id, { weight: w, date: editDate, notes: editNotes || undefined });
      setEditingLog(null);
      load();
    } catch { /* silent */ }
    finally { setSavingEdit(false); }
  };

  const chartData = logs.map((l) => ({
    date:   format(parseISO(l.date), "MMM d"),
    weight: l.weight,
  }));

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "body",        label: "Body & Weight",       icon: "⚖️" },
    { id: "strength",    label: "Strength",            icon: "🏋️" },
    { id: "analytics",   label: "Analytics",           icon: "📈" },
    { id: "predictions", label: "Predictions",         icon: "🔮" },
    { id: "goals",       label: "Goals",               icon: "🎯" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("progress.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Body composition, weight trend, strength, and calorie goals</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {tab === "body" && (
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          )}
          <Button onClick={() => setShowForm(true)}>+ Log Weight</Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-700 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
              tab === t.id
                ? "border-brand-600 text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Body & Weight tab ─────────────────────────────────────────────── */}
      {tab === "body" && (
        <>
          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: "Current",  value: `${stats.latest} kg`,  color: "text-gray-900 dark:text-white dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.75)]" },
                { label: "Starting", value: `${stats.starting} kg`, color: "text-gray-500 dark:text-gray-300" },
                { label: "Change",   value: `${stats.change > 0 ? "+" : ""}${stats.change.toFixed(1)} kg`,
                  color: stats.change < 0 ? "text-green-600" : stats.change > 0 ? "text-red-600" : "text-gray-500" },
                { label: "Lowest",   value: `${stats.min} kg`,     color: "text-blue-600" },
                { label: "Highest",  value: `${stats.max} kg`,     color: "text-orange-600" },
              ].map((s) => (
                <Card key={s.label} className="text-center py-3">
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Body weight trend chart */}
          <Card>
            <CardHeader title={t("progress.bodyWeight")} subtitle={`Last ${days} days`} />
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: chartTick }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: `1px solid ${chartBorder}`, backgroundColor: chartBg, color: chartText, fontSize: "13px" }}
                    formatter={(v: number) => [`${v} kg`, "Weight"]}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2.5} fill="url(#wGrad)" dot={{ fill: "#22c55e", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">⚖️</div>
                <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{t("progress.noWeightData")}</p>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">Tap "+ Log Weight" to add your first entry. Your trend chart will appear once you have data.</p>
              </div>
            )}
          </Card>

          {/* Body composition card */}
          <BodyCompositionCard
            logs={logs}
            weight={user?.weight}
            heightCm={user?.height}
            age={user?.age}
            sex={user?.sex}
          />

          {/* Weight log table */}
          {logs.length > 0 && (
            <Card>
              <CardHeader title={t("progress.weightHistory")} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-2 text-xs text-gray-400 font-medium">{t("common.date")}</th>
                      <th className="text-right py-2 text-xs text-gray-400 font-medium">{t("common.weight")}</th>
                      <th className="text-right py-2 text-xs text-gray-400 font-medium">Est. Fat%</th>
                      <th className="text-right py-2 text-xs text-gray-400 font-medium">Change</th>
                      <th className="text-left py-2 text-xs text-gray-400 font-medium pl-4">{t("common.notes")}</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...logs].reverse().map((log, idx, arr) => {
                      const prev  = arr[idx + 1];
                      const delta = prev ? +(log.weight - prev.weight).toFixed(1) : null;
                      const fat   = user?.height && user?.age && user?.sex
                        ? calcBodyFat(log.weight, user.height, user.age, user.sex as "male" | "female")
                        : null;
                      return (
                        <tr key={log.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="py-2.5 text-gray-700 dark:text-gray-300">{format(parseISO(log.date), "MMM d, yyyy")}</td>
                          <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-100">{log.weight} kg</td>
                          <td className="py-2.5 text-right text-xs text-gray-500 dark:text-gray-400">
                            {fat !== null ? `${fat}%` : "—"}
                          </td>
                          <td className="py-2.5 text-right text-sm">
                            {delta !== null && (
                              <span className={delta < 0 ? "text-green-600" : delta > 0 ? "text-red-500" : "text-gray-400"}>
                                {delta > 0 ? "+" : ""}{delta} kg
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pl-4 text-gray-500 dark:text-gray-400 text-xs">{log.notes}</td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(log)}
                                className="text-gray-400 hover:text-brand-500 transition-colors text-xs px-2 py-1 rounded"
                                title="Edit entry"
                              >✏️</button>
                              <button
                                onClick={() => deleteLog(log.id)}
                                className="text-gray-300 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded"
                                title="Delete entry"
                              >✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                                     })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Exercise Progression tab ───────────────────────────────────────── */}
      {tab === "strength" && <ExerciseProgressionSection />}

      {/* ── Analytics tab ─────────────────────────────────────────────────── */}
      {tab === "analytics" && <AnalyticsTab />}

      {/* ── Predictions tab ───────────────────────────────────────────────── */}
      {tab === "predictions" && <PredictionCard data={predData} loading={predLoading} />}

      {/* ── Goals tab ─────────────────────────────────────────────────────── */}
      {tab === "goals" && (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <GoalsPage embedded />
        </div>
      )}

      {/* ── Log Weight Modal ─────────────────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={t("progress.logWeight")}>
        <LogWeightForm onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
      </Modal>

      {/* ── Edit Weight Log Modal ────────────────────────────────────────── */}
      <Modal open={editingLog !== null} onClose={() => setEditingLog(null)} title={t("common.edit") + " " + t("common.weight")}>
        <div className="space-y-4">
          <Input
            label="Weight (kg)"
            type="number"
            step="0.1"
            value={editWeight}
            onChange={(e) => setEditWeight(e.target.value)}
            placeholder="75.5"
          />
          <Input
            label="Date"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <Input
            label="Notes (optional)"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Morning weight, after gym…"
          />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditingLog(null)}>{t("common.cancel")}</Button>
            <Button className="flex-1" loading={savingEdit} onClick={handleEditSubmit}>{t("common.save")}</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
