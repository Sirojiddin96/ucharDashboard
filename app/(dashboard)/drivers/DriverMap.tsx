"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface DriverStatus {
  driver_id: string;
  is_online: boolean;
  lat: number;
  lon: number;
  updated_at: string;
  tax_users: DriverUser | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriverMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());

  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<DriverStatus | null>(null);

  // ── Load initial data ─────────────────────────────────────────────────────
  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch("/api/drivers/online");
      const data = await res.json();
      setDrivers(data.drivers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // ── Init Leaflet map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    let cancelled = false;

    // Leaflet needs to be imported dynamically (SSR guard)
    import("leaflet").then((L) => {
      if (cancelled || leafletMapRef.current) return;
      // Fix default icon URLs broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [40.8634, 71.459287], // Tashkent
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
    });

    return () => {
      cancelled = true;
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // ── Sync markers when drivers list changes ────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      const existingIds = new Set(markersRef.current.keys());

      for (const driver of drivers) {
        const { driver_id, lat, lon, users } = driver;
        const name =
          [users?.first_name, users?.last_name].filter(Boolean).join(" ") ||
          driver_id.slice(0, 8);

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:36px;height:36px;
            background:#4f46e5;
            border:2px solid #818cf8;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:18px;
            box-shadow:0 2px 8px rgba(0,0,0,.5);
            cursor:pointer;
          ">🚖</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -20],
        });

        if (markersRef.current.has(driver_id)) {
          // Update position
          markersRef.current.get(driver_id).setLatLng([lat, lon]);
          existingIds.delete(driver_id);
        } else {
          // Create new marker
          const marker = L.marker([lat, lon], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="min-width:140px;font-family:sans-serif">
                <b style="font-size:13px">${name}</b><br/>
                <span style="color:#6b7280;font-size:11px">${users?.phone ?? driver_id.slice(0, 8)}</span>
              </div>
            `);
          marker.on("click", () => {
            setSelectedDriver(driver);
          });
          markersRef.current.set(driver_id, marker);
          existingIds.delete(driver_id);
        }
      }

      // Remove stale markers (went offline)
      for (const staleId of existingIds) {
        markersRef.current.get(staleId)?.remove();
        markersRef.current.delete(staleId);
      }
    });
  }, [drivers]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = client
      .channel("driver-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_online_status" },
        (payload) => {
          const row = payload.new as DriverStatus | undefined;
          const oldRow = payload.old as Partial<DriverStatus> | undefined;

          if (payload.eventType === "DELETE" || (row && !row.is_online)) {
            const id = row?.driver_id ?? oldRow?.driver_id;
            if (id) {
              setDrivers((prev) => prev.filter((d) => d.driver_id !== id));
            }
            return;
          }

          if (!row || row.lat == null || row.lon == null) return;

          setDrivers((prev) => {
            const idx = prev.findIndex((d) => d.driver_id === row.driver_id);
            if (idx === -1) {
              // New driver came online — fetch full record with user join
              fetch("/api/drivers/online")
                .then((r) => r.json())
                .then((d) => setDrivers(d.drivers ?? []));
              return prev;
            }
            const updated = [...prev];
            updated[idx] = { ...updated[idx], lat: row.lat, lon: row.lon, updated_at: row.updated_at };
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // ── Sidebar panel ─────────────────────────────────────────────────────────
  function DriverPanel({ driver }: { driver: DriverStatus }) {
    const name =
      [driver.tax_users?.first_name, driver.tax_users?.last_name]
        .filter(Boolean)
        .join(" ") || "—";
    const age = Math.floor(
      (Date.now() - new Date(driver.updated_at).getTime()) / 1000
    );
    const ageLabel =
      age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;

    return (
      <div className="px-3 py-2 hover:bg-gray-700/40 rounded-lg cursor-pointer transition-colors"
        onClick={() => {
          leafletMapRef.current?.flyTo([driver.lat, driver.lon], 15, { duration: 1 });
          markersRef.current.get(driver.driver_id)?.openPopup();
          setSelectedDriver(driver);
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">{name}</span>
          <span className="text-xs text-green-400">● online</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-400">{driver.tax_users?.phone ?? driver.driver_id.slice(0, 8)}</span>
          <span className="text-xs text-gray-500">{ageLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 bg-gray-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Online Drivers</h2>
          <span className="text-xs bg-green-900/40 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full">
            {loading ? "…" : drivers.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading && (
            <p className="text-xs text-gray-500 px-3 py-2">Loading...</p>
          )}
          {!loading && drivers.length === 0 && (
            <p className="text-xs text-gray-500 px-3 py-4 text-center">No drivers online</p>
          )}
          {drivers.map((d) => (
            <DriverPanel key={d.driver_id} driver={d} />
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-700">
          <button
            onClick={fetchDrivers}
            className="w-full text-xs text-gray-400 hover:text-white py-1 transition-colors"
          >
            ↺ Refresh
          </button>
        </div>
      </aside>

      {/* ── Map ── */}
      <div className="flex-1 rounded-xl overflow-hidden relative">
        {selectedDriver && (
          <div className="absolute top-3 left-3 z-1000 bg-gray-900/90 border border-gray-700 rounded-xl px-4 py-3 text-sm backdrop-blur-sm max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white">
                {[selectedDriver.tax_users?.first_name, selectedDriver.tax_users?.last_name]
                  .filter(Boolean)
                  .join(" ") || "Driver"}
              </span>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-gray-500 hover:text-gray-300 ml-4 text-xs"
              >✕</button>
            </div>
            <p className="text-gray-400 text-xs">{selectedDriver.tax_users?.phone ?? selectedDriver.driver_id}</p>
            <p className="text-gray-500 text-xs mt-1">
              {selectedDriver.lat.toFixed(5)}, {selectedDriver.lon.toFixed(5)}
            </p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
