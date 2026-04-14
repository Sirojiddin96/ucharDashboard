"use client";

import { useState, useTransition } from "react";
import {
  OrdersTrendChart,
  RevenueAreaChart,
  ChannelBarChart,
  HourlyBarChart,
  UserGrowthChart,
} from "../Charts";

type Summary = {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  completionRate: number;
  cancellationRate: number;
  avgOrderValue: number;
  totalDistance: number;
  totalPassengers: number;
  totalNewDrivers: number;
};

type AnalyticsData = {
  summary: Summary;
  ordersPerDay: { date: string; total: number; completed: number; cancelled: number }[];
  revenuePerDay: { date: string; revenue: number }[];
  byChannel: { channel: string; count: number }[];
  hourlyDistribution: { hour: string; count: number }[];
  topDrivers: { id: string; name: string; rides: number; revenue: number }[];
  userGrowthPerDay: { date: string; passengers: number; drivers: number }[];
};

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm font-medium text-gray-300 mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function AnalyticsDashboard({
  initialData,
  initialDays,
}: {
  initialData: AnalyticsData;
  initialDays: number;
}) {
  const [days, setDays] = useState(initialDays);
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [isPending, startTransition] = useTransition();

  async function changePeriod(newDays: number) {
    setDays(newDays);
    startTransition(async () => {
      const res = await fetch(`/api/analytics?days=${newDays}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    });
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => changePeriod(p.value)}
              disabled={isPending}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                days === p.value
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isPending && (
        <div className="text-xs text-gray-500 animate-pulse">Loading…</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Total Orders"
          value={summary.totalOrders.toLocaleString()}
          color="text-indigo-400"
        />
        <SummaryCard
          label="Completed"
          value={summary.completedOrders.toLocaleString()}
          sub={`${summary.completionRate.toFixed(1)}% rate`}
          color="text-green-400"
        />
        <SummaryCard
          label="Cancelled"
          value={summary.cancelledOrders.toLocaleString()}
          sub={`${summary.cancellationRate.toFixed(1)}% rate`}
          color="text-red-400"
        />
        <SummaryCard
          label="Revenue"
          value={`${(summary.totalRevenue / 1000).toFixed(0)}k so'm`}
          sub={`Avg ${Math.round(summary.avgOrderValue).toLocaleString()} so'm`}
          color="text-yellow-400"
        />
        <SummaryCard
          label="New Users"
          value={summary.totalPassengers + summary.totalNewDrivers}
          sub={`Pass: ${summary.totalPassengers} · Drivers: ${summary.totalNewDrivers}`}
          color="text-blue-400"
        />
      </div>

      {/* Row 1: Orders trend + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Orders trend (total / completed / cancelled)">
          {data.ordersPerDay.length > 0 ? (
            <OrdersTrendChart data={data.ordersPerDay} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data</p>
          )}
        </ChartCard>

        <ChartCard title="Revenue (completed orders)">
          {data.revenuePerDay.some((d) => d.revenue > 0) ? (
            <RevenueAreaChart data={data.revenuePerDay} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data</p>
          )}
        </ChartCard>
      </div>

      {/* Row 2: By channel + Hourly distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Orders by channel">
          {data.byChannel.length > 0 ? (
            <ChannelBarChart data={data.byChannel} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data</p>
          )}
        </ChartCard>

        <ChartCard title="Orders by hour of day">
          {data.hourlyDistribution.some((d) => d.count > 0) ? (
            <HourlyBarChart data={data.hourlyDistribution} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data</p>
          )}
        </ChartCard>
      </div>

      {/* Row 3: User growth + Top drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="New user registrations">
          {data.userGrowthPerDay.some(
            (d) => d.passengers > 0 || d.drivers > 0
          ) ? (
            <UserGrowthChart data={data.userGrowthPerDay} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data</p>
          )}
        </ChartCard>

        <ChartCard title="Top 10 drivers by rides">
          {data.topDrivers.length > 0 ? (
            <div className="overflow-y-auto max-h-55 pr-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="pb-2 pr-3 font-medium">#</th>
                    <th className="pb-2 pr-3 font-medium">Driver</th>
                    <th className="pb-2 pr-3 font-medium text-right">Rides</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDrivers.map((d, i) => (
                    <tr
                      key={d.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="py-1.5 pr-3 text-gray-500">{i + 1}</td>
                      <td className="py-1.5 pr-3">
                        <a
                          href={`/drivers/${d.id}`}
                          className="text-indigo-400 hover:text-indigo-300 hover:underline truncate max-w-30 inline-block"
                        >
                          {d.name}
                        </a>
                      </td>
                      <td className="py-1.5 pr-3 text-right text-green-400 font-medium">
                        {d.rides}
                      </td>
                      <td className="py-1.5 text-right text-yellow-400">
                        {d.revenue > 0
                          ? `${(d.revenue / 1000).toFixed(0)}k`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data</p>
          )}
        </ChartCard>
      </div>

      {/* Distance stat */}
      {summary.totalDistance > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
          <p className="text-sm text-gray-400">
            Total distance driven (completed orders){" "}
            <span className="text-white font-semibold ml-2">
              {(summary.totalDistance / 1000).toFixed(1)} km
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
