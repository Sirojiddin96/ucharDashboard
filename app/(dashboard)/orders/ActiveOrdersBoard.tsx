"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { getStatus, CHANNEL_LABELS } from "@/lib/order-status";
import type { Database } from "@/lib/database.types";

type ActiveOrder = Database["public"]["Tables"]["orders"]["Row"];

// Client-side Supabase using anon key (realtime only — no sensitive data)
const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function elapsed(from: string): string {
  const secs = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function ElapsedTimer({ from }: { from: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{elapsed(from)}</span>;
}

const GROUP_ORDER = [3, 4, 5, 6, 7, 2, 1];
const GROUP_LABELS: Record<number, string> = {
  1: "Searching",
  2: "Offer Sent",
  3: "Driver Assigned",
  4: "En Route",
  5: "Arrived",
  6: "In Progress",
  7: "Completing",
};

export default function ActiveOrdersBoard() {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const ordersRef = useRef<ActiveOrder[]>([]);

  // Initial fetch
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/orders/active");
      if (res.ok) {
        const data = await res.json();
        ordersRef.current = data;
        setOrders(data);
        setLastUpdated(new Date());
      }
      setLoading(false);
    }
    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabaseClient
      .channel("active-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as ActiveOrder | undefined;
          const removed = payload.old as Partial<ActiveOrder> | undefined;

          if (payload.eventType === "DELETE") {
            ordersRef.current = ordersRef.current.filter(
              (o) => o.id !== removed?.id
            );
          } else if (updated) {
            const isActive = updated.final_status == null;
            const idx = ordersRef.current.findIndex((o) => o.id === updated.id);

            if (!isActive) {
              // Order finished — remove from board
              ordersRef.current = ordersRef.current.filter(
                (o) => o.id !== updated.id
              );
            } else if (idx >= 0) {
              // Update existing
              const next = [...ordersRef.current];
              next[idx] = updated;
              ordersRef.current = next;
            } else {
              // New active order
              ordersRef.current = [updated, ...ordersRef.current];
            }
          }

          setOrders([...ordersRef.current]);
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  // Group by current_status
  const grouped = GROUP_ORDER.reduce<Record<number, ActiveOrder[]>>((acc, code) => {
    acc[code] = orders.filter((o) => o.current_status === code);
    return acc;
  }, {});

  const unassigned = orders.filter(
    (o) => !o.current_status || !GROUP_ORDER.includes(o.current_status)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading active orders…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-white font-semibold text-lg">Live Board</span>
          <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {orders.length} active
          </span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString("ru-RU")}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500">
          No active orders right now
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
          {/* Grouped columns */}
          {GROUP_ORDER.map((code) => {
            const group = grouped[code];
            if (!group || group.length === 0) return null;
            const meta = getStatus(code);
            return (
              <div key={code} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-800`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                      {GROUP_LABELS[code]}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{group.length}</span>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {group.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unassigned / unknown */}
          {unassigned.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700 text-gray-300">
                  Pending / Unknown
                </span>
                <span className="text-xs text-gray-500 font-medium">{unassigned.length}</span>
              </div>
              <div className="divide-y divide-gray-800/60">
                {unassigned.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: ActiveOrder }) {
  const status = getStatus(order.current_status);
  const channel = CHANNEL_LABELS[order.channel] ?? order.channel;
  const hasReassignment = (order.driver_reassignment_count ?? 0) > 0;

  return (
    <a
      href={`/orders/${order.id}`}
      className="block px-4 py-3 text-gray-100 hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-100 font-medium text-sm">
              {order.phone ?? "No phone"}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
              {channel}
            </span>
            {hasReassignment && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900 text-orange-300">
                ↺{order.driver_reassignment_count}
              </span>
            )}
          </div>
          {order.driver_name ? (
            <p className="text-sm text-gray-400 mt-0.5">
              {order.driver_name}
              {order.car_number && (
                <span className="ml-2 text-gray-600 font-mono text-xs">{order.car_number}</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-600 mt-0.5 italic">No driver yet</p>
          )}
          {order.address && (
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{order.address}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
            {status.label}
          </span>
          <span className="text-xs text-gray-600">
            <ElapsedTimer from={order.created_at} />
          </span>
          {order.amount != null && (
            <span className="text-xs text-gray-400">
              {Number(order.amount).toLocaleString()} so&apos;m
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
