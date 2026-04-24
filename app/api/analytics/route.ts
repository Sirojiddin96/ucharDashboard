import { NextResponse } from "next/server";
import { getTenantClient } from "@/lib/tenant-client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getTenantClient(session.organizationId);

  const { searchParams } = new URL(request.url);
  const days = Math.min(
    Math.max(parseInt(searchParams.get("days") ?? "30", 10), 1),
    365
  );
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const [{ data: orders }, { data: users }] = await Promise.all([
    db
      .from("app_orders" as never)
      .select(
        "id, created_at, final_status, amount, channel, driver_id, driver_name, distance_m"
      )
      .gte("created_at", since),
    db
      .from("tax_users")
      .select("id, created_at, role")
      .gte("created_at", since),
  ]);

  const orderList = (orders ?? []) as Array<{
    id: string;
    created_at: string;
    final_status: number | null;
    amount: number | null;
    channel: string | null;
    driver_id: string | null;
    driver_name: string | null;
    distance_m: number | null;
  }>;
  const userList = users ?? [];

  // Build ordered day keys and labels
  const dayLabels: string[] = [];
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayLabels.push(
      d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
    );
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  // Initialize maps
  const totalMap: Record<string, number> = {};
  const completedMap: Record<string, number> = {};
  const cancelledMap: Record<string, number> = {};
  const revenueMap: Record<string, number> = {};
  const passengersMap: Record<string, number> = {};
  const driversMap: Record<string, number> = {};
  for (const key of dayKeys) {
    totalMap[key] = 0;
    completedMap[key] = 0;
    cancelledMap[key] = 0;
    revenueMap[key] = 0;
    passengersMap[key] = 0;
    driversMap[key] = 0;
  }

  const hourMap: Record<number, number> = {};
  const channelMap: Record<string, number> = {};
  const driverMap: Record<
    string,
    { name: string; rides: number; revenue: number }
  > = {};

  for (const o of orderList) {
    const dayKey = o.created_at.slice(0, 10);
    if (dayKey in totalMap) {
      totalMap[dayKey]++;
      if (o.final_status === 100) {
        completedMap[dayKey]++;
        revenueMap[dayKey] += Number(o.amount ?? 0);
      }
      if (o.final_status === 8 || o.final_status === 9) {
        cancelledMap[dayKey]++;
      }
    }

    const hour = new Date(o.created_at).getHours();
    hourMap[hour] = (hourMap[hour] ?? 0) + 1;

    const ch = o.channel ?? "unknown";
    channelMap[ch] = (channelMap[ch] ?? 0) + 1;

    if (o.driver_id) {
      if (!driverMap[o.driver_id]) {
        driverMap[o.driver_id] = {
          name: o.driver_name ?? o.driver_id,
          rides: 0,
          revenue: 0,
        };
      }
      driverMap[o.driver_id].rides++;
      if (o.final_status === 100) {
        driverMap[o.driver_id].revenue += Number(o.amount ?? 0);
      }
    }
  }

  for (const u of userList) {
    const dayKey = u.created_at.slice(0, 10);
    if (dayKey in passengersMap) {
      if (u.role === "passenger") passengersMap[dayKey]++;
      if (u.role === "driver") driversMap[dayKey]++;
    }
  }

  const ordersPerDay = dayKeys.map((key, i) => ({
    date: dayLabels[i],
    total: totalMap[key],
    completed: completedMap[key],
    cancelled: cancelledMap[key],
  }));

  const revenuePerDay = dayKeys.map((key, i) => ({
    date: dayLabels[i],
    revenue: revenueMap[key],
  }));

  const byChannel = Object.entries(channelMap).map(([channel, count]) => ({
    channel,
    count,
  }));

  const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    count: hourMap[h] ?? 0,
  }));

  const topDrivers = Object.entries(driverMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.rides - a.rides)
    .slice(0, 10);

  const userGrowthPerDay = dayKeys.map((key, i) => ({
    date: dayLabels[i],
    passengers: passengersMap[key],
    drivers: driversMap[key],
  }));

  const totalOrders = orderList.length;
  const completedOrders = orderList.filter((o) => o.final_status === 100).length;
  const cancelledOrders = orderList.filter(
    (o) => o.final_status === 8 || o.final_status === 9
  ).length;
  const totalRevenue = orderList
    .filter((o) => o.final_status === 100)
    .reduce((sum, o) => sum + Number(o.amount ?? 0), 0);
  const totalDistance = orderList
    .filter((o) => o.final_status === 100)
    .reduce((sum, o) => sum + Number(o.distance_m ?? 0), 0);
  const totalPassengers = userList.filter((u) => u.role === "passenger").length;
  const totalNewDrivers = userList.filter((u) => u.role === "driver").length;

  return NextResponse.json({
    summary: {
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      completionRate:
        totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      cancellationRate:
        totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      avgOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0,
      totalDistance,
      totalPassengers,
      totalNewDrivers,
    },
    ordersPerDay,
    revenuePerDay,
    byChannel,
    hourlyDistribution,
    topDrivers,
    userGrowthPerDay,
  });
}
