"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Driver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  badge: string;
  total_rides: number;
  total_amount: number;
  is_deleted: boolean;
  is_online?: boolean;
}

interface DriverListData {
  drivers: Driver[];
  total: number;
}

const PAGE_SIZE = 50;

function OnlineDot({ online }: { online?: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        online ? "bg-green-400" : "bg-gray-600"
      }`}
      title={online ? "Online" : "Offline"}
    />
  );
}

export default function DriverList() {
  const [data, setData] = useState<DriverListData>({ drivers: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        page: String(page),
        role: "driver",
      });
      if (debouncedSearch) sp.set("q", debouncedSearch);
      const res = await fetch(`/api/users?${sp}`);
      const json = await res.json();

      // Enrich with online status
      const ids: string[] = (json.users ?? []).map((u: Driver) => u.id);
      let onlineSet = new Set<string>();
      if (ids.length) {
        const osRes = await fetch(`/api/drivers/online`);
        const osJson = await osRes.json();
        onlineSet = new Set(
          (osJson.drivers ?? []).map((d: { driver_id: string }) => d.driver_id)
        );
      }

      setData({
        drivers: (json.users ?? []).map((u: Driver) => ({
          ...u,
          is_online: onlineSet.has(u.id),
        })),
        total: json.total ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-72 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <span className="text-sm text-gray-500">{data.total} drivers</span>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-500 text-left">
                <th className="px-4 py-3 font-medium w-4" />
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Badge</th>
                <th className="px-4 py-3 font-medium text-right">Rides</th>
                <th className="px-4 py-3 font-medium text-right">Earnings</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500 text-sm">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && data.drivers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500 text-sm">
                    No drivers found
                  </td>
                </tr>
              )}
              {!loading &&
                data.drivers.map((d) => {
                  const name =
                    [d.first_name, d.last_name].filter(Boolean).join(" ") || "—";
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3">
                        <OnlineDot online={d.is_online} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/drivers/${d.id}`}
                          className="text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          {name}
                        </Link>
                        {d.username && (
                          <span className="text-gray-500 text-xs ml-1.5">
                            @{d.username}
                          </span>
                        )}
                        {d.is_deleted && (
                          <span className="ml-2 text-xs text-red-400">(deleted)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{d.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                          {d.badge}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-right tabular-nums">
                        {d.total_rides.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-right tabular-nums">
                        {Number(d.total_amount).toLocaleString()} so&apos;m
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/drivers/${d.id}`}
                          className="text-xs text-gray-500 hover:text-indigo-400"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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
                <button
                  onClick={() => setPage((p) => p - 1)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  ← Prev
                </button>
              )}
              {page < totalPages && (
                <button
                  onClick={() => setPage((p) => p + 1)}
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
