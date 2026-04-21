import { supabase } from "@/lib/supabase";
import { OrdersLineChart, StatusPieChart } from "./Charts";
import { getStatus } from "@/lib/order-status";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

type RecentOrder = {
  id: string;
  phone: string | null;
  final_status: number | null;
  amount: number | null;
  created_at: string;
  driver_name: string | null;
};

async function getStats() {
  const cached = unstable_cache(async () => {
  const [
    { count: totalOrders },
    { count: completedOrders },
    { count: cancelledOrders },
    { count: totalPassengers },
    { count: totalDrivers },
    { count: reassignedOrders },
    { data: rawOrders },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from("app_orders" as never).select("*", { count: "exact", head: true }),
    supabase
      .from("app_orders" as never)
      .select("*", { count: "exact", head: true })
      .eq("final_status", 100),
    supabase
      .from("app_orders" as never)
      .select("*", { count: "exact", head: true })
      .in("final_status", [8, 9]),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "courier"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "driver"),
    supabase
      .from("app_orders" as never)
      .select("*", { count: "exact", head: true })
      .gt("driver_reassignment_count", 0),
    supabase
      .from("app_orders" as never)
      .select("created_at, final_status")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
    supabase
      .from("app_orders" as never)
      .select("id, phone, final_status, amount, created_at, driver_name")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const rawOrdersList = (rawOrders ?? []) as Array<{
    created_at: string;
    final_status: number | null;
  }>;
  const recentOrdersList = (recentOrders ?? []) as RecentOrder[];

  // Build orders-per-day map
  const dayMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    dayMap[key] = 0;
  }
  for (const o of rawOrdersList) {
    const key = new Date(o.created_at).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
    if (key in dayMap) dayMap[key]++;
  }
  const ordersPerDay = Object.entries(dayMap).map(([date, count]) => ({
    date,
    count,
  }));

  // Build status breakdown
  const statusMap: Record<string, number> = {};
  for (const o of rawOrdersList) {
    const s = o.final_status != null ? getStatus(o.final_status).label : "In Progress";
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({
    status,
    count,
  }));

  return {
    totalOrders: totalOrders ?? 0,
    completedOrders: completedOrders ?? 0,
    cancelledOrders: cancelledOrders ?? 0,
    totalPassengers: totalPassengers ?? 0,
    totalDrivers: totalDrivers ?? 0,
    reassignedOrders: reassignedOrders ?? 0,
    ordersPerDay,
    statusBreakdown,
    recentOrders: recentOrdersList,
  };
  }, ["overview-stats-v1"], { revalidate: 20, tags: ["overview", "orders"] });

  return cached();
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function statusBadge(status: number | null) {
  const { label, color } = getStatus(status);
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {status != null ? label : "—"}
    </span>
  );
}

export default async function OverviewPage() {
  const stats = await getStats();
  const completionRate =
    stats.totalOrders > 0
      ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          color="text-indigo-400"
        />
        <StatCard
          label="Completed"
          value={stats.completedOrders}
          sub={`${completionRate}% completion rate`}
          color="text-green-400"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelledOrders}
          color="text-red-400"
        />
        <StatCard
          label="Total Users"
          value={stats.totalPassengers + stats.totalDrivers}
          sub={`Users: ${stats.totalPassengers}  ·  Drivers: ${stats.totalDrivers}`}
          color="text-blue-400"
        />
      </div>

      {stats.reassignedOrders > 0 && (
        <a
          href="/events?type=driver_reassigned"
          className="flex items-center gap-3 bg-orange-950/50 border border-orange-800 rounded-xl px-5 py-3 hover:bg-orange-950 transition-colors"
        >
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-orange-300 font-medium text-sm">
              {stats.reassignedOrders} order
              {stats.reassignedOrders > 1 ? "s" : ""} had a driver reassignment
            </p>
            <p className="text-orange-500 text-xs">
              Multiple drivers were assigned to the same order — click to review
            </p>
          </div>
          <span className="ml-auto text-orange-500 text-sm">→</span>
        </a>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-300 mb-4">
            Orders — last 30 days
          </p>
          {stats.ordersPerDay.length > 0 ? (
            <OrdersLineChart data={stats.ordersPerDay} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data yet</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-300 mb-4">
            Status breakdown
          </p>
          {stats.statusBreakdown.length > 0 ? (
            <StatusPieChart data={stats.statusBreakdown} />
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">No data yet</p>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-300 mb-4">Recent orders</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-left border-b border-gray-800">
                <th className="pb-2 pr-4 font-medium">Phone</th>
                <th className="pb-2 pr-4 font-medium">Driver</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o: RecentOrder) => (
                <tr
                  key={o.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="py-2 pr-4 text-gray-300">{o.phone}</td>
                  <td className="py-2 pr-4 text-gray-400">
                    {o.driver_name ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-gray-300">
                    {o.amount ? `${Number(o.amount).toLocaleString()} so’m` : "—"}
                  </td>
                  <td className="py-2 pr-4">{statusBadge(o.final_status)}</td>
                  <td className="py-2 text-gray-500 text-xs">
                    {new Date(o.created_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-gray-500"
                  >
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
