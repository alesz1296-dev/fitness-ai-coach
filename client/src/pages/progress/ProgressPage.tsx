import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { weightApi, workoutsApi } from "../../api";
import type { WeightLog, WeightStats, ExerciseProgression } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

// ── Log weight form ───────────────────────────────────────────────────────────
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

// ── Exercise progression search ───────────────────────────────────────────────
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
      <CardHeader title="Exercise Progression" subtitle="Track strength over time" />
      <div className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="e.g. Bench Press, Squat, OHP…"
          className="flex-1"
        />
        <Button onClick={search} loading={loading}>Search</Button>
      </div>

      {meta && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="font-semibold text-gray-700">{meta.exerciseName}</span>
          <span className="text-gray-400">{meta.totalSessions} sessions</span>
          {meta.allTimePR && (
            <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-semibold">
              🏆 PR: {meta.allTimePR.maxWeight} kg × {meta.allTimePR.bestReps} reps ({meta.allTimePR.date})
            </span>
          )}
        </div>
      )}

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
              formatter={(v: number, n: string) => [
                n === "maxWeight" ? `${v} kg` : n === "estimated1RM" ? `${v} kg` : `${v.toLocaleString()} kg`,
                n === "maxWeight" ? "Max Weight" : n === "estimated1RM" ? "Est. 1RM" : "Volume",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
            <Line yAxisId="left" type="monotone" dataKey="maxWeight"   stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="Max Weight" />
            <Line yAxisId="left" type="monotone" dataKey="estimated1RM" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Est. 1RM" />
            <Line yAxisId="right" type="monotone" dataKey="totalVolume" stroke="#10b981" strokeWidth={1.5} dot={false} name="Volume" />
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

// ── Main Progress page ────────────────────────────────────────────────────────
export default function ProgressPage() {
  const [logs,     setLogs]     = useState<WeightLog[]>([]);
  const [stats,    setStats]    = useState<WeightStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [days,     setDays]     = useState(30);

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

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
          <p className="text-gray-500 text-sm mt-1">Track weight and strength over time</p>
        </div>
        <div className="flex gap-2">
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
          <Button onClick={() => setShowForm(true)}>+ Log Weight</Button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Current",  value: `${stats.latest} kg`,                        color: "text-gray-900" },
            { label: "Starting", value: `${stats.starting} kg`,                       color: "text-gray-500" },
            { label: "Change",   value: `${stats.change > 0 ? "+" : ""}${stats.change.toFixed(1)} kg`, color: stats.change < 0 ? "text-green-600" : stats.change > 0 ? "text-red-600" : "text-gray-500" },
            { label: "Lowest",   value: `${stats.min} kg`,                            color: "text-blue-600" },
            { label: "Highest",  value: `${stats.max} kg`,                            color: "text-orange-600" },
          ].map((s) => (
            <Card key={s.label} className="text-center py-3">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Weight chart */}
      <Card>
        <CardHeader title="Weight Trend" subtitle={`Last ${days} days`} />
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
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
                  <th className="text-right py-2 text-xs text-gray-400 font-medium">Change</th>
                  <th className="text-left py-2 text-xs text-gray-400 font-medium pl-4">Notes</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map((log, idx, arr) => {
                  const prev = arr[idx + 1];
                  const delta = prev ? +(log.weight - prev.weight).toFixed(1) : null;
                  return (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 text-gray-700">{format(parseISO(log.date), "MMM d, yyyy")}</td>
                      <td className="py-2.5 text-right font-semibold text-gray-800">{log.weight} kg</td>
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

      {/* Exercise progression */}
      <ExerciseProgressionSection />

      {/* Log weight modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Weight" size="sm">
        <LogWeightForm onSave={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
