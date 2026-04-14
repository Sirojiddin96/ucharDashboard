"use client";

import { useState } from "react";
import ActiveOrdersTable, { type ActiveOrder } from "./ActiveOrdersTable";
import DispatchModal from "./DispatchModal";
import DriversMapPanel from "./DriversMapPanel";
import RecentDriversTable from "./RecentDriversTable";
import LiveCallsTable from "./LiveCallsTable";

export default function LiveTabContent() {
  const [showDispatch, setShowDispatch] = useState(false);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);

  const onTripDriverIds = orders
    .filter((o): o is ActiveOrder & { driver_id: string } =>
      !!o.driver_id && [3, 4, 5, 6, 7].includes(o.current_status ?? 0)
    )
    .map((o) => o.driver_id);

  return (
    <div className="space-y-4">
      {/* "+ Dispatch" trigger */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Live view · Updates in real time</p>
        <button
          onClick={() => setShowDispatch(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-900/40"
        >
          <span className="text-base leading-none">+</span>
          <span>Dispatch</span>
        </button>
      </div>

      {/* Main grid: orders table (left) + driver map (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 min-h-110">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col min-h-100">
          <ActiveOrdersTable onOrdersChange={setOrders} />
        </div>
        <div className="min-h-100">
          <DriversMapPanel onTripDriverIds={onTripDriverIds} />
        </div>
      </div>

      {/* Recently active drivers */}
      <RecentDriversTable orders={orders} />

      {/* Live calls mockup */}
      <LiveCallsTable />

      {/* Dispatch modal */}
      {showDispatch && (
        <DispatchModal onClose={() => setShowDispatch(false)} />
      )}
    </div>
  );
}
