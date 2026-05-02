/**
 * ProjectionChart — reusable weight projection line chart.
 * Used in: GoalForm preview, EditGoalModal live chart, GoalsPage active goal card.
 */
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";
import { fmtMonthDay } from "../../lib/dateFormat";
import type { ProjectionPoint } from "./goalCalc";

export interface ProjectionChartProps {
  /** Array of { date, projectedWeight, actual? } */
  data: ProjectionPoint[];
  /** Target weight — drawn as a green dashed reference line */
  targetWeight: number;
  /** px height of chart container (default 160) */
  height?: number;
  /** Show actual weight line (default false — only preview mode uses projections only) */
  showActual?: boolean;
}

export function ProjectionChart({
  data,
  targetWeight,
  height = 160,
  showActual = false,
}: ProjectionChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((p) => ({
    date:      p.date,
    projected: p.projectedWeight,
    actual:    p.actual ?? null,
  }));

  const formatDate = (v: string) => {
    try { return fmtMonthDay(parseISO(v)); }
    catch { return v; }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickFormatter={formatDate}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          domain={["auto", "auto"]}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          labelFormatter={(v) => formatDate(String(v))}
          formatter={(v: number, name: string) => [
            v != null ? `${v.toFixed(1)} kg` : "—",
            name === "projected" ? "Projected" : "Actual",
          ]}
        />
        {/* Target weight reference line */}
        <ReferenceLine
          y={targetWeight}
          stroke="#22c55e"
          strokeDasharray="4 2"
          strokeWidth={1.5}
          label={{ value: `${targetWeight}kg`, position: "insideTopRight", fontSize: 10, fill: "#16a34a" }}
        />
        {/* Projected weight — blue dashed */}
        <Line
          type="monotone"
          dataKey="projected"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={false}
          name="projected"
        />
        {/* Actual weight — solid green (only when showActual=true and data exists) */}
        {showActual && (
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#22c55e" }}
            connectNulls={false}
            name="actual"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
