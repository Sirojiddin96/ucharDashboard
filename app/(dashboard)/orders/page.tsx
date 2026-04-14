import { supabase } from "@/lib/supabase";
import LiveTabContent from "./LiveTabContent";
import { getStatus, CHANNEL_LABELS } from "@/lib/order-status";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type OrderRow = {
  id: string;
  scat_uuid: string | null;
  phone: string | null;
  final_status: number | null;
  current_status: number | null;
  driver_name: string | null;
  car_number: string | null;
  amount: number | null;
  created_at: string;
  completed_at: string | null;
  channel: string;
  driver_reassignment_count: number;
};

const FINAL_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "100", label: "Completed" },
  { value: "8", label: "Cancelled" },
  { value: "9", label: "Disp. Cancelled" },
  { value: "10", label: "No Driver" },
];

async function getHistory(page: number, finalStatus: string) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("orders")
    .select(
      "id, scat_uuid, phone, final_status, current_status, driver_name, car_number, amount, created_at, completed_at, channel, driver_reassignment_count",
      { count: "exact" }
    )
    .not("final_status", "is", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (finalStatus) query = query.eq("final_status", Number(finalStatus));

  const { data, count } = await query;
  return { orders: (data ?? []) as OrderRow[], total: count ?? 0 };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "history" ? "history" : "live";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const finalStatus = params.status ?? "";

  const { orders, total } = tab === "history"
    ? await getHistory(page, finalStatus)
    : { orders: [], total: 0 };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const sp = new URLSearchParams({ tab: "history" });
    if (finalStatus) sp.set("status", finalStatus);
    sp.set("page", String(p));
    return `/orders?${sp}`;
  }

  function statusUrl(s: string) {
    const sp = new URLSearchParams({ tab: "history" });
    if (s) sp.set("status", s);
    sp.set("page", "1");
    return `/orders?${sp}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Orders</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800">
        <a
          href="/orders?tab=live"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "live"
              ? "border-indigo-500 text-white"
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          Live Board
        </a>
        <a
          href="/orders?tab=history"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "history"
              ? "border-indigo-500 text-white"
              : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          History
          {tab === "history" && (
            <span className="ml-2 text-xs text-gray-500">{total}</span>
          )}
        </a>
      </div>

      {tab === "live" ? (
        <LiveTabContent />
      ) : (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {FINAL_STATUS_OPTIONS.map((opt) => (
              <a
                key={opt.value}
                href={statusUrl(opt.value)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  finalStatus === opt.value
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                {opt.label}
              </a>
            ))}
          </div>

          {/* Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-gray-500 text-left">
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Driver</th>
                    <th className="px-4 py-3 font-medium">Car</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Channel</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const status = getStatus(o.final_status);
                    return (
                      <tr
                        key={o.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-3">
                          <a href={`/orders/${o.id}`} className="text-gray-200 hover:text-indigo-300 transition-colors">
                            {o.phone ?? "—"}
                          </a>
                          {o.driver_reassignment_count > 0 && (
                            <span className="ml-2 text-xs text-orange-400">↺{o.driver_reassignment_count}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{o.driver_name ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{o.car_number ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {o.amount != null ? `${Number(o.amount).toLocaleString()} so’m` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                            {CHANNEL_LABELS[o.channel] ?? o.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(o.created_at).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages} · {total} total
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <a
                      href={pageUrl(page - 1)}
                      className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                    >
                      ← Prev
                    </a>
                  )}
                  {page < totalPages && (
                    <a
                      href={pageUrl(page + 1)}
                      className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                    >
                      Next →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
