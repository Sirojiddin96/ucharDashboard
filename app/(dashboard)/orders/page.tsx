import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type OrderRow = {
  id: string;
  scat_uuid: string | null;
  phone: string | null;
  final_status: string | null;
  current_status: string | null;
  driver_name: string | null;
  car_number: string | null;
  amount: number | null;
  created_at: string;
  completed_at: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "timeout", label: "Timeout" },
];

function statusBadge(status: string | null) {
  const map: Record<string, string> = {
    completed: "bg-green-900 text-green-300",
    cancelled: "bg-red-900 text-red-300",
    timeout: "bg-yellow-900 text-yellow-300",
  };
  const cls = map[status ?? ""] ?? "bg-gray-800 text-gray-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

async function getOrders(page: number, finalStatus: string) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("orders")
    .select(
      "id, scat_uuid, phone, final_status, current_status, driver_name, car_number, amount, created_at, completed_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (finalStatus) query = query.eq("final_status", finalStatus);

  const { data, count } = await query;
  return { orders: data ?? [], total: count ?? 0 };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const finalStatus = params.status ?? "";

  const { orders, total } = await getOrders(page, finalStatus);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (finalStatus) sp.set("status", finalStatus);
    sp.set("page", String(p));
    return `/orders?${sp}`;
  }

  function statusUrl(s: string) {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    sp.set("page", "1");
    return `/orders?${sp}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Orders</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
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
                <th className="px-4 py-3 font-medium">SCAT UUID</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Car</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: OrderRow) => (
                <tr
                  key={o.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-gray-200">{o.phone}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {o.scat_uuid ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {o.driver_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {o.car_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {o.amount ? `${o.amount} so'm` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {statusBadge(o.final_status ?? o.current_status)}
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
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-500"
                  >
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
              Page {page} of {totalPages}
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
  );
}
