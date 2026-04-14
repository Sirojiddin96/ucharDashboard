type Assignment = {
  id: number;
  driver_name: string | null;
  driver_id: string | null;
  car_brand: string | null;
  car_model: string | null;
  car_color: string | null;
  car_number: string | null;
  remaining_time: number | null;
  scat_uuid: string | null;
  assigned_at: string;
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

export default function AssignmentHistory({
  assignments,
}: {
  assignments: Assignment[];
}) {
  if (assignments.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        No assignment records
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800/60">
      {assignments.map((a, i) => (
        <div key={a.id} className="py-3 px-4 flex items-start gap-4">
          <div className="shrink-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-bold">
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-200 font-medium text-sm">
                {a.driver_name ?? "Unknown driver"}
              </span>
              {a.car_number && (
                <span className="font-mono text-xs text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                  {a.car_number}
                </span>
              )}
              {a.car_color && (
                <span className="text-xs text-gray-500">{a.car_color}</span>
              )}
              {a.car_brand && (
                <span className="text-xs text-gray-500">
                  {a.car_brand}
                  {a.car_model ? ` ${a.car_model}` : ""}
                </span>
              )}
            </div>
            <div className="flex gap-3 mt-0.5 text-xs text-gray-600 flex-wrap">
              <span>{fmt(a.assigned_at)}</span>
              {a.remaining_time != null && (
                <span>ETA {a.remaining_time}m</span>
              )}
              {a.scat_uuid && (
                <span className="font-mono">{a.scat_uuid}</span>
              )}
              {a.driver_id && (
                <span className="font-mono truncate max-w-40">{a.driver_id}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
