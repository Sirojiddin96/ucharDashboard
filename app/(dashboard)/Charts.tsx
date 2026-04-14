"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#3b82f6"];

export function OrdersLineChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151" }}
          labelStyle={{ color: "#f9fafb" }}
          itemStyle={{ color: "#a5b4fc" }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StatusPieChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend
          formatter={(value) => (
            <span className="text-gray-400 text-xs">{value}</span>
          )}
        />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151" }}
          itemStyle={{ color: "#f9fafb" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Orders trend: total / completed / cancelled per day ──────────────────────
export function OrdersTrendChart({
  data,
}: {
  data: { date: string; total: number; completed: number; cancelled: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151" }}
          labelStyle={{ color: "#f9fafb" }}
        />
        <Legend formatter={(v) => <span className="text-gray-400 text-xs">{v}</span>} />
        <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Revenue area chart ────────────────────────────────────────────────────────
export function RevenueAreaChart({
  data,
}: {
  data: { date: string; revenue: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151" }}
          labelStyle={{ color: "#f9fafb" }}
          formatter={(v) => [`${Number(v ?? 0).toLocaleString()} so'm`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#revenueGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Orders by channel bar chart ───────────────────────────────────────────────
export function ChannelBarChart({
  data,
}: {
  data: { channel: string; count: number }[];
}) {
  const CHANNEL_COLORS: Record<string, string> = {
    bot: "#6366f1",
    app: "#22c55e",
    call: "#f59e0b",
  };
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="channel" tick={{ fill: "#9ca3af", fontSize: 12 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151" }}
          labelStyle={{ color: "#f9fafb" }}
          cursor={{ fill: "#1f2937" }}
        />
        <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={CHANNEL_COLORS[entry.channel] ?? "#6366f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Hourly distribution bar chart ─────────────────────────────────────────────
export function HourlyBarChart({
  data,
}: {
  data: { hour: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="hour"
          tick={{ fill: "#9ca3af", fontSize: 9 }}
          interval={2}
        />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151" }}
          labelStyle={{ color: "#f9fafb" }}
          cursor={{ fill: "#1f2937" }}
        />
        <Bar dataKey="count" name="Orders" fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── User growth stacked bar ───────────────────────────────────────────────────
export function UserGrowthChart({
  data,
}: {
  data: { date: string; passengers: number; drivers: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151" }}
          labelStyle={{ color: "#f9fafb" }}
          cursor={{ fill: "#1f2937" }}
        />
        <Legend formatter={(v) => <span className="text-gray-400 text-xs">{v}</span>} />
        <Bar dataKey="passengers" name="Passengers" stackId="a" fill="#3b82f6" />
        <Bar dataKey="drivers" name="Drivers" stackId="a" fill="#22c55e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

