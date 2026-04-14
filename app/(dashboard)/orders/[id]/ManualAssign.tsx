"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Driver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_online: boolean;
  lat: number | null;
  lon: number | null;
  distance_m: number | null;
}

interface Props {
  orderId: string;
  orderLat: number;
  orderLon: number;
  orderRegionId: string | null;
  currentDriverId: string | null;
}

function distanceLabel(m: number | null) {
  if (m == null) return null;
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function ManualAssign({
  orderId,
  orderLat,
  orderLon,
  orderRegionId,
  currentDriverId,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [selected, setSelected] = useState<Driver | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load nearby drivers when panel opens
  const loadNearby = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(orderLat),
        lon: String(orderLon),
      });
      if (orderRegionId) params.set("region_id", orderRegionId);
      const res = await fetch(`/api/dispatch/drivers?${params}`);
      const data = await res.json();
      setDrivers(data.drivers ?? []);
    } catch {
      setError("Failed to load nearby drivers");
    } finally {
      setLoading(false);
    }
  }, [orderLat, orderLon, orderRegionId]);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setSearchQ("");
      setError(null);
      setSuccess(null);
      loadNearby();
    }
  }, [open, loadNearby]);

  // Debounced search
  useEffect(() => {
    if (!searchQ.trim()) {
      loadNearby();
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: searchQ.trim() });
        if (orderRegionId) params.set("region_id", orderRegionId);
        const res = await fetch(`/api/dispatch/drivers?${params}`);
        const data = await res.json();
        setDrivers(data.drivers ?? []);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ, loadNearby]);

  async function assign() {
    if (!selected) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/dispatch/assign-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, driver_id: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Assignment failed");
        return;
      }
      setSuccess(`Assigned to ${data.driver_name}`);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      {success && (
        <div className="mb-3 px-4 py-2 bg-green-900/30 border border-green-700/40 rounded-lg text-sm text-green-400">
          ✓ {success}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors font-medium"
      >
        <span>👤</span>
        {open ? "Close" : currentDriverId ? "Reassign Driver" : "Assign Driver"}
      </button>

      {open && (
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {searchQ ? "Search results" : "Nearby online drivers"}
            </h3>
            <span className="text-xs text-gray-500">
              {drivers.length} found
            </span>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-700">
            <input
              type="text"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                setSelected(null);
              }}
              placeholder="Search by name or phone..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Driver list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-800">
            {loading && (
              <p className="px-4 py-4 text-sm text-gray-500 text-center">
                Loading...
              </p>
            )}
            {!loading && drivers.length === 0 && (
              <p className="px-4 py-4 text-sm text-gray-500 text-center">
                {searchQ ? "No drivers found" : "No online drivers nearby (10 km)"}
              </p>
            )}
            {!loading &&
              drivers.map((d) => {
                const name =
                  [d.first_name, d.last_name].filter(Boolean).join(" ") || "—";
                const isSelected = selected?.id === d.id;
                const isCurrent = d.id === currentDriverId;

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : d)}
                    disabled={isCurrent}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                      isSelected
                        ? "bg-indigo-900/40 border-l-2 border-indigo-500"
                        : isCurrent
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-gray-800"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        d.is_online ? "bg-green-400" : "bg-gray-600"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">
                        {name}
                        {isCurrent && (
                          <span className="ml-2 text-xs text-indigo-400">
                            (current)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{d.phone ?? d.id.slice(0, 8)}</p>
                    </div>
                    {d.distance_m != null && (
                      <span className="text-xs text-gray-500 shrink-0">
                        {distanceLabel(d.distance_m)}
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-indigo-400 text-sm shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Footer */}
          {error && (
            <div className="px-4 py-2 bg-red-900/30 border-t border-red-700/30 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={assign}
              disabled={!selected || confirming}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
            >
              {confirming
                ? "Assigning..."
                : selected
                ? `Assign ${[selected.first_name, selected.last_name].filter(Boolean).join(" ") || "driver"}`
                : "Select a driver"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
