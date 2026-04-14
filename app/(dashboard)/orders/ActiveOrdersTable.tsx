"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getStatus } from "@/lib/order-status";
import type { Database } from "@/lib/database.types";

const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type ActiveOrder = {
  id: string;
  phone: string | null;
  current_status: number | null;
  final_status: number | null;
  driver_name: string | null;
  driver_id: string | null;
  car_number: string | null;
  car_brand: string | null;
  car_color: string | null;
  address: string | null;
  dropoff_address: string | null;
  note: string | null;
  channel: string;
  region_id: string | null;
  service_id: string | null;
  created_at: string;
  updated_at: string;
  driver_reassignment_count: number;
  amount: number | null;
  distance_m: number | null;
};

function ElapsedTimer({ from }: { from: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (secs < 60) return <span>{secs}s</span>;
  if (secs < 3600) return <span>{Math.floor(secs / 60)}m {secs % 60}s</span>;
  return <span>{Math.floor(secs / 3600)}h {Math.floor((secs % 3600) / 60)}m</span>;
}

interface Props {
  onOrdersChange?: (orders: ActiveOrder[]) => void;
}

export default function ActiveOrdersTable({ onOrdersChange }: Props) {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionMap, setRegionMap] = useState<Record<string, string>>({});
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const ordersRef = useRef<ActiveOrder[]>([]);

  useEffect(() => {
    fetch("/api/dispatch/data")
      .then((r) => r.json())
      .then((d) => {
        setRegionMap(
          Object.fromEntries(
            (d.regions ?? []).map((r: { id: string; name: string; name_ru: string | null }) => [r.id, r.name_ru ?? r.name])
          )
        );
        setServiceMap(
          Object.fromEntries(
            (d.services ?? []).map((s: { id: string; name: string; name_ru: string | null }) => [s.id, s.name_ru ?? s.name])
          )
        );
      });

    fetch("/api/orders/active")
      .then((r) => r.json())
      .then((data: ActiveOrder[]) => {
        ordersRef.current = data;
        setOrders(data);
        setLastUpdated(new Date());
        onOrdersChange?.(data);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabaseClient
      .channel("active-orders-table")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as ActiveOrder | undefined;
          const removed = payload.old as Partial<ActiveOrder> | undefined;

          if (payload.eventType === "DELETE") {
            ordersRef.current = ordersRef.current.filter((o) => o.id !== removed?.id);
          } else if (updated) {
            const isActive = updated.final_status == null;
            const idx = ordersRef.current.findIndex((o) => o.id === updated.id);
            if (!isActive) {
              ordersRef.current = ordersRef.current.filter((o) => o.id !== updated.id);
            } else if (idx >= 0) {
              const next = [...ordersRef.current];
              next[idx] = { ...next[idx], ...updated };
              ordersRef.current = next;
            } else {
              ordersRef.current = [updated, ...ordersRef.current];
            }
          }
          const snapshot = [...ordersRef.current];
          setOrders(snapshot);
          setLastUpdated(new Date());
          onOrdersChange?.(snapshot);
        }
      )
      .subscribe();

    return () => { supabaseClient.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
        Loading orders…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-sm font-semibold text-white">Active Orders</span>
          <span className="bg-indigo-600/80 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-600">
            {lastUpdated.toLocaleTimeString("ru-RU")}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
            No active orders right now
          </div>
        ) : (
          <table className="w-full text-xs min-w-[1200px]">
            <thead className="sticky top-0 bg-gray-925 border-b border-gray-800 z-10">
              <tr className="text-gray-500 uppercase tracking-wider text-left">
                <th className="px-3 py-2 font-medium w-8">#</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">⏱</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Client #</th>
                <th className="px-3 py-2 font-medium">Pickup</th>
                <th className="px-3 py-2 font-medium">Destination</th>
                <th className="px-3 py-2 font-medium">Driver</th>
                <th className="px-3 py-2 font-medium">Note</th>
                <th className="px-3 py-2 font-medium">Service</th>
                <th className="px-3 py-2 font-medium">Region</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => {
                const status = getStatus(o.current_status);
                return (
                  <tr
                    key={o.id}
                    className="border-b border-gray-800/40 hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-3 py-2 text-gray-600 tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap tabular-nums">
                      {new Date(o.created_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-amber-400 font-mono tabular-nums whitespace-nowrap">
                      <ElapsedTimer from={o.created_at} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded-full font-medium text-[10px] ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">
                      <a
                        href={`/orders/${o.id}`}
                        className="text-gray-300 hover:text-indigo-300 transition-colors"
                      >
                        {o.phone ?? "—"}
                      </a>
                      {(o.driver_reassignment_count ?? 0) > 0 && (
                        <span className="ml-1 text-orange-400">↺{o.driver_reassignment_count}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 max-w-[140px] truncate" title={o.address ?? ""}>
                      {o.address ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-400 max-w-[140px] truncate" title={o.dropoff_address ?? ""}>
                      {o.dropoff_address ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-300 max-w-[120px] truncate">
                      {o.driver_name ?? <span className="text-gray-600 italic">unassigned</span>}
                    </td>
                    <td className="px-3 py-2 max-w-[100px] truncate" title={o.note ?? ""}>
                      {o.note ? (
                        <span className="text-amber-400/80">{o.note}</span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {serviceMap[o.service_id ?? ""] ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                      {regionMap[o.region_id ?? ""] ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
