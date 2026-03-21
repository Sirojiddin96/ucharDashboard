import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 75;

type EventRow = {
  id: number;
  telegram_user_id: number;
  event_type: string;
  order_id: string | null;
  scat_uuid: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_TYPES = [
  "bot_start",
  "phone_registered",
  "location_received",
  "order_precost_called",
  "order_created",
  "order_create_failed",
  "driver_assigned",
  "driver_reassigned",
  "order_status_changed",
  "order_completed",
  "order_cancelled",
  "polling_timeout",
  "polling_error",
];

const EVENT_COLORS: Record<string, string> = {
  bot_start: "bg-blue-900 text-blue-300",
  phone_registered: "bg-indigo-900 text-indigo-300",
  location_received: "bg-purple-900 text-purple-300",
  order_created: "bg-cyan-900 text-cyan-300",
  order_create_failed: "bg-red-900 text-red-300",
  driver_assigned: "bg-yellow-900 text-yellow-300",
  driver_reassigned: "bg-orange-900 text-orange-300",
  order_completed: "bg-green-900 text-green-300",
  order_cancelled: "bg-red-900 text-red-300",
  polling_timeout: "bg-orange-900 text-orange-300",
  polling_error: "bg-red-900 text-red-300",
};

function eventBadge(type: string) {
  const cls = EVENT_COLORS[type] ?? "bg-gray-800 text-gray-400";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {type}
    </span>
  );
}

async function getEvents(page: number, eventType: string) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("bot_events")
    .select("id, telegram_user_id, event_type, order_id, scat_uuid, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (eventType) query = query.eq("event_type", eventType);

  const { data, count } = await query;
  return { events: data ?? [], total: count ?? 0 };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const eventType = params.type ?? "";

  const { events, total } = await getEvents(page, eventType);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (eventType) sp.set("type", eventType);
    sp.set("page", String(p));
    return `/events?${sp}`;
  }

  function typeUrl(t: string) {
    const sp = new URLSearchParams();
    if (t) sp.set("type", t);
    sp.set("page", "1");
    return `/events?${sp}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Events</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <a
          href={typeUrl("")}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            eventType === ""
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
          }`}
        >
          All
        </a>
        {EVENT_TYPES.map((t) => (
          <a
            key={t}
            href={typeUrl(t)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              eventType === t
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            {t}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">User ID</th>
                <th className="px-4 py-3 font-medium">Order / SCAT</th>
                <th className="px-4 py-3 font-medium">Metadata</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e: EventRow) => (
                <tr
                  key={e.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 align-top"
                >
                  <td className="px-4 py-3">{eventBadge(e.event_type)}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {e.telegram_user_id}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {e.scat_uuid ?? e.order_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                    {e.metadata
                      ? JSON.stringify(e.metadata).slice(0, 120)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No events found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
