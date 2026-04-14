import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getStatus } from "@/lib/order-status";
import DriverEditForm from "./DriverEditForm";

export const dynamic = "force-dynamic";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getDriverProfile(id: string) {
  const [
    { data: user },
    { data: onlineStatus },
    { data: wallet },
    { data: rating },
    { data: transactions },
    { data: recentOrders },
    { data: application },
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, first_name, last_name, username, phone, role, source, badge, total_rides, total_amount, total_ride_minutes, created_at, is_deleted"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("driver_online_status")
      .select("is_online, lat, lon, updated_at")
      .eq("driver_id", id)
      .maybeSingle(),
    supabase
      .from("wallets")
      .select("balance, reserved, updated_at")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("driver_ratings")
      .select("avg_rating, total_feedbacks")
      .eq("driver_id", id)
      .maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, note, order_id, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("orders")
      .select(
        "id, phone, current_status, final_status, amount, created_at, channel, address"
      )
      .eq("driver_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("driver_applications")
      .select(
        "id, status, created_at, city, service, car_reg_number, car_brand_dispatcher, car_color_dispatcher, call_sign, connection_type, driver_license"
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: regions } = await supabase
    .from("regions")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");

  // Fetch region_id + service_class separately (new columns — not yet in generated types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regionRaw = await (supabase as any)
    .from("users")
    .select("region_id, service_class")
    .eq("id", id)
    .single();
  const regionAssignment = regionRaw?.data as { region_id: string | null; service_class: string | null } | null;

  return {
    user,
    onlineStatus,
    wallet,
    rating,
    transactions,
    recentOrders,
    application,
    regions: regions ?? [],
    regionId: regionAssignment?.region_id ?? null,
    serviceClass: regionAssignment?.service_class ?? null,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ts(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

const TX_TYPE_COLORS: Record<string, string> = {
  credit: "text-green-400",
  debit: "text-red-400",
  reserve: "text-yellow-400",
  release: "text-blue-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await params;
  const { user, onlineStatus, wallet, rating, transactions, recentOrders, application, regions, regionId, serviceClass } =
    await getDriverProfile(id);

  if (!user) notFound();

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";
  const isOnline = onlineStatus?.is_online ?? false;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/drivers?tab=list" className="hover:text-gray-300">
              ← Drivers
            </Link>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{name}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${
                isOnline
                  ? "bg-green-900/40 text-green-400 border border-green-700/40"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? "bg-green-400 animate-pulse" : "bg-gray-600"
                }`}
              />
              {isOnline ? "Online" : "Offline"}
            </span>
            {user.is_deleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-700/40">
                Deleted
              </span>
            )}
          </div>
          {user.username && (
            <p className="text-gray-500 text-sm mt-0.5">@{user.username}</p>
          )}
          {user.phone && (
            <p className="text-gray-400 text-sm mt-0.5">{user.phone}</p>
          )}
        </div>

        {application && (
          <Link
            href={`/driver-applications/${application.id}`}
            className="shrink-0 text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700"
          >
            📝 View Application →
          </Link>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total rides"
          value={user.total_rides.toLocaleString()}
        />
        <StatCard
          label="Total earnings"
          value={`${Number(user.total_amount).toLocaleString()} so\u2019m`}
        />
        <StatCard
          label="Ride time"
          value={`${Math.round((user.total_ride_minutes ?? 0) / 60)} h`}
          sub={`${user.total_ride_minutes ?? 0} min total`}
        />
        <StatCard
          label="Rating"
          value={
            rating?.avg_rating != null
              ? `★ ${Number(rating.avg_rating).toFixed(1)}`
              : "—"
          }
          sub={rating?.total_feedbacks ? `${rating.total_feedbacks} reviews` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Edit Profile ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Edit Profile
            </h2>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
              {user.badge}
            </span>
          </div>

          {/* Read-only meta */}
          <div className="text-xs text-gray-600 space-y-1 pb-3 border-b border-gray-800">
            <div className="flex gap-2">
              <span className="w-16 shrink-0">ID</span>
              <span className="font-mono text-gray-500 truncate">{user.id}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0">Source</span>
              <span className="text-gray-500">{user.source}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0">Joined</span>
              <span className="text-gray-500">{ts(user.created_at)}</span>
            </div>
            {onlineStatus?.lat != null && (
              <div className="flex gap-2">
                <span className="w-16 shrink-0">Last GPS</span>
                <span className="text-gray-500">
                  {onlineStatus.lat.toFixed(5)}, {onlineStatus.lon?.toFixed(5)}{" "}
                  ({ts(onlineStatus.updated_at)})
                </span>
              </div>
            )}
          </div>

          <DriverEditForm
            driverId={user.id}
            initialUser={{
              first_name: user.first_name,
              last_name: user.last_name,
              username: user.username,
              phone: user.phone,
              role: user.role,
              region_id: regionId,
              service_class: serviceClass,
            }}
            initialApp={{
              app_id: application?.id ?? null,
              service: application?.service ?? null,
              car_brand: application?.car_brand_dispatcher ?? null,
              car_color: application?.car_color_dispatcher ?? null,
              car_reg_number: application?.car_reg_number ?? null,
              call_sign: application?.call_sign ?? null,
              connection_type: application?.connection_type ?? null,
              driver_license: application?.driver_license ?? null,
            }}
            regions={regions}
          />
        </section>

        {/* ── Wallet ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Wallet
          </h2>
          {wallet ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="text-lg font-bold text-white">
                    {Number(wallet.balance).toLocaleString()}{" "}
                    <span className="text-xs text-gray-400">so&apos;m</span>
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Reserved</p>
                  <p className="text-lg font-bold text-yellow-300">
                    {Number(wallet.reserved).toLocaleString()}{" "}
                    <span className="text-xs text-gray-400">so&apos;m</span>
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No wallet found</p>
          )}

          {/* Transaction list */}
          <div className="space-y-0 divide-y divide-gray-800 max-h-56 overflow-y-auto">
            {(transactions ?? []).length === 0 && (
              <p className="text-xs text-gray-600 py-2">No transactions</p>
            )}
            {(transactions ?? []).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <span
                    className={`font-semibold uppercase mr-2 ${
                      TX_TYPE_COLORS[tx.type] ?? "text-gray-400"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <span className="text-gray-500 truncate">
                    {tx.note ??
                      (tx.order_id ? `Order ${tx.order_id.slice(0, 8)}` : "")}
                  </span>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p
                    className={
                      tx.amount >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {Number(tx.amount).toLocaleString()}
                  </p>
                  <p className="text-gray-600">{ts(tx.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Recent orders ── */}
      {(recentOrders ?? []).length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">
              Recent Orders ({(recentOrders ?? []).length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800">
                <tr className="text-gray-500 text-left text-xs">
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Client</th>
                  <th className="px-4 py-2 font-medium">Address</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders ?? []).map((o) => {
                  const st = getStatus(o.final_status ?? o.current_status);
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-2">
                        <Link
                          href={`/orders/${o.id}`}
                          className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                        >
                          {o.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-300">
                        {o.phone ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-400 max-w-40 truncate text-xs">
                        {o.address ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-right tabular-nums text-xs">
                        {o.amount != null
                          ? `${Number(o.amount).toLocaleString()} so\u2019m`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {ts(o.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
