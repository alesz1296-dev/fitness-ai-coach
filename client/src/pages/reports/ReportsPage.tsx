import { useState, useEffect, useCallback } from "react";
import { reportsApi } from "../../api";
import type { MonthlyReport } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({ report, onSelect }: { report: MonthlyReport; onSelect: () => void }) {
  const changeColor =
    report.weightDelta == null ? "text-gray-400"
    : report.weightDelta < 0  ? "text-green-600"
    : report.weightDelta > 0  ? "text-red-500"
    : "text-gray-500";

  return (
    <Card onClick={onSelect} className="cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">
            {MONTHS[report.month - 1]} {report.year}
          </h3>
          {report.aiSummary && (
            <p className="text-xs text-brand-600 mt-0.5 font-medium">✨ AI summary available</p>
          )}
        </div>
        <span className="text-2xl">📊</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Workouts",     value: String(report.totalWorkouts) },
          { label: "PRs Hit",      value: String(report.prsHit) },
          { label: "Avg Calories", value: report.avgCalories  ? `${Math.round(report.avgCalories)} kcal`  : "—" },
          { label: "Avg Protein",  value: report.avgProtein   ? `${Math.round(report.avgProtein)}g`        : "—" },
          { label: "Total Volume", value: report.totalVolume  ? `${(report.totalVolume / 1000).toFixed(1)}t` : "—" },
          {
            label: "Weight Change",
            value: report.weightDelta != null
              ? `${report.weightDelta > 0 ? "+" : ""}${report.weightDelta.toFixed(1)} kg`
              : "—",
            color: changeColor,
          },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-xs text-gray-400">{item.label}</p>
            <p className={`font-bold text-sm mt-0.5 ${(item as any).color ?? "text-gray-800"}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Report detail ─────────────────────────────────────────────────────────────
function ReportDetail({ report, onClose }: { report: MonthlyReport; onClose: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {MONTHS[report.month - 1]} {report.year}
        </h2>
        <Button variant="secondary" size="sm" onClick={onClose}>← Back</Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: "🏋️", label: "Total Workouts",  value: String(report.totalWorkouts) },
          { icon: "🏆", label: "New PRs",          value: String(report.prsHit) },
          { icon: "🔥", label: "Avg Daily Kcal",   value: report.avgCalories ? `${Math.round(report.avgCalories)}` : "—" },
          { icon: "💪", label: "Avg Protein",       value: report.avgProtein  ? `${Math.round(report.avgProtein)}g`  : "—" },
          { icon: "📦", label: "Total Volume",      value: report.totalVolume ? `${(report.totalVolume / 1000).toFixed(1)}t` : "—" },
          {
            icon: "⚖️", label: "Weight Change",
            value: report.weightDelta != null
              ? `${report.weightDelta > 0 ? "+" : ""}${report.weightDelta.toFixed(1)} kg`
              : "—",
          },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Weight summary */}
      {(report.weightStart != null || report.weightEnd != null) && (
        <Card>
          <CardHeader title="Weight" />
          <div className="flex justify-around text-center">
            <div>
              <p className="text-xs text-gray-400">Start of month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.weightStart ?? "—"} kg</p>
            </div>
            <div className="flex items-center text-gray-300 text-2xl">→</div>
            <div>
              <p className="text-xs text-gray-400">End of month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{report.weightEnd ?? "—"} kg</p>
            </div>
          </div>
        </Card>
      )}

      {/* AI summary */}
      {report.aiSummary && (
        <Card>
          <CardHeader title="✨ AI Coach Summary" subtitle="Generated by your AI coach" />
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
            {report.aiSummary}
          </div>
        </Card>
      )}

      {!report.aiSummary && (
        <div className="text-center text-gray-400 text-sm py-4">
          No AI summary for this report. Regenerate with AI summary enabled.
        </div>
      )}
    </div>
  );
}

// ── Main Reports page ─────────────────────────────────────────────────────────
export default function ReportsPage() {
  const now = new Date();

  const [reports,    setReports]    = useState<MonthlyReport[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected,   setSelected]   = useState<MonthlyReport | null>(null);
  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [aiSummary,  setAiSummary]  = useState(true);
  const [error,      setError]      = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getAll();
      setReports(res.data.reports);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true); setError("");
    try {
      const res = await reportsApi.generate({ year, month, aiSummary });
      setReports((prev) => {
        const filtered = prev.filter((r) => !(r.year === res.data.report.year && r.month === res.data.report.month));
        return [res.data.report, ...filtered].sort((a, b) => b.year - a.year || b.month - a.month);
      });
      setSelected(res.data.report);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to generate report. Make sure you have logged data for this period.");
    } finally { setGenerating(false); }
  };

  if (selected) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <ReportDetail report={selected} onClose={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered summaries of your fitness progress</p>
        </div>
      </div>

      {/* Generate panel */}
      <Card>
        <CardHeader title="Generate Report" subtitle="Compile your stats for any month" />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-xs text-gray-500 mb-1">Month</p>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Year</p>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={aiSummary}
                onChange={(e) => setAiSummary(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-600"
              />
              Include AI summary
            </label>
          </div>
          <Button loading={generating} onClick={generate}>
            {generating ? "Generating…" : "Generate Report"}
          </Button>
        </div>
        {generating && (
          <p className="text-xs text-gray-400 mt-3 animate-pulse">
            {aiSummary ? "Crunching your data and writing an AI summary… this may take 10–20 seconds." : "Compiling your stats…"}
          </p>
        )}
      </Card>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : reports.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-semibold text-gray-800 mb-2">No reports yet</h3>
          <p className="text-sm text-gray-400">Generate your first monthly report above to get an AI-powered breakdown of your progress.</p>
        </Card>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Past Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} onSelect={() => setSelected(r)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
