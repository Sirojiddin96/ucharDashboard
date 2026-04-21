"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getStatus, CHANNEL_LABELS } from "@/lib/order-status";
import type { Database } from "@/lib/database.types";

const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

const PAGE_SIZE = 50;

const FINAL_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "100", label: "Completed" },
  { value: "8", label: "Cancelled" },
  { value: "9", label: "Disp. Cancelled" },
  { value: "10", label: "No Driver" },
];

export default function HistoryTabContent({
  regionId,
  initialOrders,
  initialTotal,
  page: initialPage,
  finalStatus: initialStatus,
}: {
  regionId?: string;
  initialOrders: OrderRow[];
  initialTotal: number;
  page: number;
  finalStatus: string;
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [finalStatus, setFinalStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const PAGE_SIZE_LOCAL = PAGE_SIZE;
  const totalPages = Math.ceil(total / PAGE_SIZE_LOCAL);

  // ── Fetch history ──────────────────────────────────────────
  async function fetchHistory(p: number, status: string) {
    setLoading(true);
    try {
      const sp = new URLSearchParams({ page: String(p) });
      if (status) sp.set("status", status);

      const res = await fetch(`/api/orders/history?${sp.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Error fetching history:", json?.error ?? "unknown error");
        return;
      }

      setOrders((json.orders ?? []) as OrderRow[]);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  // ── Pull-to-refresh ────────────────────────────────────────
  async function handlePullRefresh() {
    setRefreshing(true);
    try {
      await fetchHistory(page, finalStatus);
    } finally {
      setRefreshing(false);
    }
  }

  // ── Handle filter change ───────────────────────────────────
  function handleStatusFilter(status: string) {
    setFinalStatus(status);
    setPage(1);
  }

  // ── Handle pagination ──────────────────────────────────────
  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  // ── Realtime subscription + Auto-polling ───────────────────
  useEffect(() => {
    // Subscribe to order changes
    const channel = supabaseClient
      .channel("history-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          // When any order changes (e.g., status update, completion)
          // Trigger a refresh of the current page
          fetchHistory(page, finalStatus);
        }
      )
      .subscribe();

    // Auto-poll every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchHistory(page, finalStatus);
    }, 10000);

    return () => {
      supabaseClient.removeChannel(channel);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [page, finalStatus]);

  // ── Format number with thousands separator ──────────────────
  const fmt = (n: number) => String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  function pageUrl(p: number) {
    const sp = new URLSearchParams({ tab: "history" });
    if (finalStatus) sp.set("status", finalStatus);
    sp.set("page", String(p));
    return `/orders?${sp}`;
  }

  return (
    <div className="space-y-4">
      {/* Pull-to-refresh notification */}
      {refreshing && (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-900/30 border border-indigo-700/50 rounded-lg">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-indigo-300">Updating...</span>
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {FINAL_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusFilter(opt.value)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              finalStatus === opt.value
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={handlePullRefresh}
          disabled={refreshing || loading}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <span className={refreshing ? "animate-spin" : ""}>↻</span>
          Refresh
        </button>
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
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-500">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const status = getStatus(o.final_status);
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="text-gray-200 hover:text-indigo-300 transition-colors">
                          {o.phone ?? "—"}
                        </Link>
                        {o.driver_reassignment_count > 0 && (
                          <span className="ml-2 text-xs text-orange-400">↺{o.driver_reassignment_count}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{o.driver_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{o.car_number ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {o.amount != null ? `${fmt(Number(o.amount))} so'm` : "—"}
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
                })
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
                <button
                  onClick={() => handlePageChange(page - 1)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  ← Prev
                </button>
              )}
              {page < totalPages && (
                <button
                  onClick={() => handlePageChange(page + 1)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
