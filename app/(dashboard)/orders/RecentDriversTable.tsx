"use client";

import type { ActiveOrder } from "./ActiveOrdersTable";

interface Props {
  orders: ActiveOrder[];
}

const ON_TRIP_STATUSES = new Set([3, 4, 5, 6, 7]);

export default function RecentDriversTable({ orders }: Props) {
  // Deduplicate by driver_id, keep only drivers on active trip
  const driversMap = new Map<string, ActiveOrder>();
  for (const o of orders) {
    if (o.driver_id && o.driver_name && ON_TRIP_STATUSES.has(o.current_status ?? 0)) {
      if (!driversMap.has(o.driver_id)) driversMap.set(o.driver_id, o);
    }
  }
  const drivers = Array.from(driversMap.values());

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Active Drivers</h3>
        {drivers.length > 0 ? (
          <span className="text-xs bg-green-900/40 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full">
            {drivers.length} on trip
          </span>
        ) : (
          <span className="text-xs text-gray-600">None on trip</span>
        )}
      </div>

      {drivers.length === 0 ? (
        <div className="py-8 text-center text-gray-600 text-sm">
          No drivers currently on trip
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-150">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-500 uppercase tracking-wider text-left">
                <th className="px-4 py-2 font-medium">Driver</th>
                <th className="px-4 py-2 font-medium">Car</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Pickup</th>
                <th className="px-4 py-2 font-medium w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {drivers.map((o) => {
                const car = [o.car_brand, o.car_color, o.car_number].filter(Boolean).join(" · ");
                return (
                  <tr key={o.driver_id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-gray-200 font-medium">{o.driver_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">
                      {car || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 font-mono whitespace-nowrap">
                      {o.phone ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        On trip
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-45 truncate" title={o.address ?? ''}>
                      {o.address ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <a href={`/orders/${o.id}`}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
