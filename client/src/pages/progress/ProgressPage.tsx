import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, Legend, ComposedChart, Bar,
} from "recharts";
import { weightApi, workoutsApi } from "../../api";
import type { WeightLog, WeightStats, ExerciseProgression } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

// ─────────────────────────────────────────────────────────────────────────────
// Body composition formulas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deurenberg equation (1991) — estimates body fat % from BMI, age, and sex.
 * Returns null if any input is missing / out of range.
 */
function calcBodyFat(weight: number, heightCm: number, age: number, sex: "male" | "female"): number | null {
  if (!weight || !heightCm || !age) return null;
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  if (bmi < 10 || bmi > 60) return null;
  const fat =
    sex === "male"
      ? 1.20 * bmi + 0.23 * age - 16.2
      : 1.20 * bmi + 0.23 * age - 5.4;
  return Math.max(3, Math.min(60, Math.round(fat * 10) / 10));
}

function calcBMI(weight: number, heightCm: number): number | null {
  if (!weight || !heightCm) return null;
  const h = heightCm / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
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
): BodyComp | null {
  const bmi = calcBMI(weight, heightCm);
  const fatPct = calcBodyFat(weight, heightCm, age, sex);
  if (!bmi || fatPct === null) return null;

  const fatKg   = Math.round(weight * fatPct / 100 * 10) / 10;
  const leanKg  = Math.round((weight - fatKg) * 10) / 10;
  // Muscle mass ≈ 85% of lean mass (lean = muscle + bone + organs + water)
  const muscleKg  = Math.round(leanKg * 0.85 * 10) / 10;
  const musclePct = Math.round(muscleKg / weight * 100 * 10) / 10;

  const bmiCategory =
    bmi < 18.5 ? "Underweight"
    : bmi < 25  ? "Normal"
    : bmi < 30  ? "Overweight"
    : "Obese";

  // Fat category thresholds (American Council on Exercise)
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
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>Log Weight</Button>
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
  const missingFields = !weight || !heightCm || !age || !sex;
  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight : weight;
  const comp = !missingFields && latestWeight
    ? computeBodyComp(latestWeight, heightCm!, age!, sex!)
    : null;

  // Build fat% trend from weight logs
  const fatTrend = !missingFields
    ? logs
        .map((l) => {
          const f = calcBodyFat(l.weight, heightCm!, age!, sex!);
          return f !== null
            ? { date: format(parseISO(l.date), "MMM d"), fatPct: f, weight: l.weight }
            : null;
        })
        .filter(Boolean)
    : [];

  if (missingFields) {
    return (
      <Card>
        <CardHeader title="Body Composition" subtitle="Estimated from your profile" />
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
        title="Body Composition"
        subtitle={`Estimated · ${latestWeight} kg · Deurenberg formula`}
      />
      <div className="space-y-5">

        {/* BMI gauge */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">BMI</span>
            <span className="text-sm font-bold text-gray-800">{comp.bmi} <span className="text-xs font-normal text-gray-400">({comp.bmiCategory})</span></span>
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
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
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>15</span><span>Underweight</span><span>Normal</span><span>Overweight</span><span>40+</span>
          </div>
        </div>

        {/* Composition metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-red-50 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-red-400 font-medium mb-0.5">Body Fat</p>
            <p className={`text-2xl font-bold ${comp.fatColor}`}>{comp.fatPct}<span className="text-sm font-normal">%</span></p>
            <p className="text-xs text-gray-400 mt-0.5">{comp.fatKg} kg · {comp.fatCategory}</p>
          </div>
          <div className="bg-blue-50 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-blue-400 font-medium mb-0.5">Muscle Mass</p>
            <p className="text-2xl font-bold text-blue-600">{comp.musclePct}<span className="text-sm font-normal">%</span></p>
            <p className="text-xs text-gray-400 mt-0.5">{comp.muscleKg} kg</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-gray-400 font-medium mb-0.5">Lean Mass</p>
            <p className="text-2xl font-bold text-gray-700">{comp.leanKg}<span className="text-sm font-normal">kg</span></p>
            <p className="text-xs text-gray-400 mt-0.5">{Math.round((comp.leanKg / (latestWeight ?? 1)) * 100)}%</p>
          </div>
          <div className="bg-purple-50 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-purple-400 font-medium mb-0.5">BMI</p>
            <p className="text-2xl font-bold text-purple-600">{comp.bmi}</p>
            <p className="text-xs text-gray-400 mt-0.5">{comp.bmiCategory}</p>
          </div>
        </div>

        {/* Composition bar */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Body breakdown</p>
          <div className="h-4 rounded-full overflow-hidden flex">
            <div className="bg-red-400 transition-all" style={{ width: `${comp.fatPct}%` }} title={`Fat: ${comp.fatPct}%`} />
            <div className="bg-blue-400 transition-all" style={{ width: `${comp.musclePct}%` }} title={`Muscle: ${comp.musclePct}%`} />
            <div className="bg-gray-200 flex-1" title="Lean (bone/water/organs)" />
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Fat {comp.fatPct}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Muscle ~{comp.musclePct}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Other {Math.round(100 - comp.fatPct - comp.musclePct)}%</span>
          </div>
        </div>

        {/* Fat % trend chart */}
        {fatTrend.length > 1 && (
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">BODY FAT % TREND</p>
            <ResponsiveContainer width="100%" height={120}>
              <ComposedChart data={fatTrend as any} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="fat" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis yAxisId="wt" orientation="right" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}kg`} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(v: number, n: string) => [n === "fatPct" ? `${v}%` : `${v} kg`, n === "fatPct" ? "Body fat" : "Weight"]}
                />
                <Line yAxisId="fat" type="monotone" dataKey="fatPct" stroke="#f87171" strokeWidth={2} dot={false} name="fatPct" />
                <Line yAxisId="wt" type="monotone" dataKey="weight" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="weight" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-[10px] text-gray-300 text-center">
          Estimated via Deurenberg equation (BMI + age + sex). For precise results, use DEXA or hydrostatic weighing.
        </p>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise progression section
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseProgressionSection() {
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
      <CardHeader title="Exercise Progression" subtitle="Track strength gains over time" />
      <div className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. Bench Press, Squat, Deadlift…"
          className="flex-1"
        />
        <Button onClick={search} loading={loading}>Search</Button>
      </div>

      {meta && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <span className="font-semibold text-gray-700">{meta.exerciseName}</span>
          <span className="text-gray-400 text-xs">{meta.totalSessions} sessions logged</span>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
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
// Main Progress page
// ─────────────────────────────────────────────────────────────────────────────
type TabId = "body" | "strength";

export default function ProgressPage() {
  const { user }                   = useAuthStore();
  const [logs,     setLogs]        = useState<WeightLog[]>([]);
  const [stats,    setStats]       = useState<WeightStats | null>(null);
  const [loading,  setLoading]     = useState(true);
  const [showForm, setShowForm]    = useState(false);
  const [days,     setDays]        = useState(90);
  const [tab,      setTab]         = useState<TabId>("body");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await weightApi.getLogs(days);
      setLogs(res.data.logs);
      setStats(res.data.stats);
    } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const deleteLog = async (id: number) => {
    if (!confirm("Delete this weight entry?")) return;
    await weightApi.delete(id);
    load();
  };

  const chartData = logs.map((l) => ({
    date:   format(parseISO(l.date), "MMM d"),
    weight: l.weight,
  }));

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "body",     label: "Body & Weight",       icon: "⚖️" },
    { id: "strength", label: "Exercise Progression", icon: "🏋️" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
          <p className="text-gray-500 text-sm mt-0.5">Body composition, weight trend, and strength over time</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {tab === "body" && (
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
      <div className="flex gap-2 border-b border-gray-100 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
              tab === t.id
                ? "border-brand-600 text-brand-700 bg-brand-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
                { label: "Current",  value: `${stats.latest} kg`,  color: "text-gray-900" },
                { label: "Starting", value: `${stats.starting} kg`, color: "text-gray-500" },
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
            <CardHeader title="Body Weight Trend" subtitle={`Last ${days} days`} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                    formatter={(v: number) => [`${v} kg`, "Weight"]}
                  />
                  <Area type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2.5} fill="url(#wGrad)" dot={{ fill: "#22c55e", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">No weight data for this period</div>
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
              <CardHeader title="Weight Log" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs text-gray-400 font-medium">Date</th>
                      <th className="text-right py-2 text-xs text-gray-400 font-medium">Weight</th>
                      <th className="text-right py-2 text-xs text-gray-400 font-medium">Est. Fat%</th>
                      <th className="text-right py-2 text-xs text-gray-400 font-medium">Change</th>
                      <th className="text-left py-2 text-xs text-gray-400 font-medium pl-4">Notes</th>
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
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2.5 text-gray-700">{format(parseISO(log.date), "MMM d, yyyy")}</td>
                          <td className="py-2.5 text-right font-semibold text-gray-800">{log.weight} kg</td>
                          <td className="py-2.5 text-right text-xs text-gray-500">
                            {fat !== null ? `${fat}%` : "—"}
                          </td>
                          <td className="py-2.5 text-right text-sm">
                            {delta !== null && (
                              <span className={delta < 0 ? "text-green-600" : delta > 0 ? "text-red-500" : "text-gray-400"}>
                                {delta > 0 ? "+" : ""}{delta} kg
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pl-4 text-gray-500 text-xs">{log.notes}</td>
                          <td className="py-2.5 text-right">
                            <button onClick={() => deleteLog(log.id)} className="text-gray-300 hover:text-red-400 transition-colors text-xs px-2 py-1">✕</button>
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

      {/* Log weight modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Weight" size="sm">
        <LogWeightForm onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
