import { getStatus } from "@/lib/order-status";

type StatusLog = {
  id: number;
  status_code: number;
  status_message: string | null;
  driver_id: string | null;
  remaining_time: number | null;
  amount: number | null;
  created_at: string;
  scat_uuid: string;
};

const STATUS_ICONS: Record<number, string> = {
  1: "🔍",
  2: "📤",
  3: "🚖",
  4: "🛣️",
  5: "📍",
  6: "▶️",
  7: "🏁",
  8: "❌",
  9: "🚫",
  10: "⏱️",
  100: "✅",
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function OrderTimeline({ logs }: { logs: StatusLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No status history yet
      </div>
    );
  }

  return (
    <ol className="relative border-l border-gray-700 ml-4 space-y-0">
      {logs.map((log, i) => {
        const { label, color } = getStatus(log.status_code);
        const isFirst = i === 0;
        const isLast = i === logs.length - 1;

        return (
          <li key={log.id} className="mb-0 ml-6">
            {/* Dot */}
            <span
              className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-gray-950 text-base ${
                isFirst ? "bg-indigo-700" : "bg-gray-800"
              }`}
            >
              {STATUS_ICONS[log.status_code] ?? "•"}
            </span>

            <div
              className={`py-3 pl-2 ${
                !isLast ? "border-b border-gray-800/50" : ""
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}
                >
                  {label}
                </span>
                <span className="text-xs text-gray-500">{fmt(log.created_at)}</span>
                {log.remaining_time != null && (
                  <span className="text-xs text-gray-500">
                    ETA {log.remaining_time}m
                  </span>
                )}
                {log.amount != null && (
                  <span className="text-xs text-gray-400">
                    {Number(log.amount).toLocaleString()} so&apos;m
                  </span>
                )}
              </div>

              <div className="mt-0.5 flex gap-3 text-xs text-gray-600 flex-wrap">
                {log.scat_uuid && (
                  <span className="font-mono">{log.scat_uuid}</span>
                )}
                {log.driver_id && (
                  <span>Driver: {log.driver_id}</span>
                )}
                {log.status_message && (
                  <span className="italic text-gray-500">{log.status_message}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
