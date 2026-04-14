"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

interface DriverUser {
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
  users: DriverUser | null;
}

interface Props {
  onTripDriverIds?: string[];
}

export default function DriversMapPanel({ onTripDriverIds = [] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const onTripSet = new Set(onTripDriverIds);
  const availableCount = drivers.filter((d) => !onTripSet.has(d.driver_id)).length;
  const onTripCount = drivers.filter((d) => onTripSet.has(d.driver_id)).length;

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch("/api/drivers/online");
      if (!res.ok) return;
      const data = await res.json();
      setDrivers(data.drivers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // ── Init Leaflet ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || leafletMapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(mapRef.current!, { center: [40.8634, 71.459287], zoom: 12, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      leafletMapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
    });

    return () => {
      cancelled = true;
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      const existing = new Set(markersRef.current.keys());

      for (const driver of drivers) {
        const { driver_id, lat, lon, users } = driver;
        const name = [users?.first_name, users?.last_name].filter(Boolean).join(" ") || driver_id.slice(0, 8);
        const isOnTrip = onTripSet.has(driver_id);

        const bg = isOnTrip ? "#059669" : "#4f46e5";
        const border = isOnTrip ? "#34d399" : "#818cf8";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;background:${bg};border:2px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer;">🚖</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        if (markersRef.current.has(driver_id)) {
          const m = markersRef.current.get(driver_id);
          m.setLatLng([lat, lon]);
          m.setIcon(icon);
          existing.delete(driver_id);
        } else {
          const m = L.marker([lat, lon], { icon })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:sans-serif;min-width:130px"><b style="font-size:13px">${name}</b><br><span style="color:#6b7280;font-size:11px">${users?.phone ?? "—"}</span><br><span style="color:${isOnTrip ? "#059669" : "#4f46e5"};font-size:11px">${isOnTrip ? "● On trip" : "● Available"}</span></div>`
            );
          markersRef.current.set(driver_id, m);
          existing.delete(driver_id);
        }
      }

      for (const staleId of existing) {
        markersRef.current.get(staleId)?.remove();
        markersRef.current.delete(staleId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, onTripDriverIds]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = client
      .channel("drivers-panel-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_online_status" }, (payload) => {
        const row = payload.new as DriverStatus | undefined;
        const oldRow = payload.old as Partial<DriverStatus> | undefined;

        if (payload.eventType === "DELETE" || (row && !row.is_online)) {
          const id = row?.driver_id ?? oldRow?.driver_id;
          if (id) setDrivers((prev) => prev.filter((d) => d.driver_id !== id));
          return;
        }
        if (!row?.lat || !row?.lon) return;

        setDrivers((prev) => {
          const idx = prev.findIndex((d) => d.driver_id === row.driver_id);
          if (idx === -1) {
            fetchDrivers();
            return prev;
          }
          const next = [...prev];
          next[idx] = { ...next[idx], lat: row.lat, lon: row.lon, updated_at: row.updated_at };
          return next;
        });
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [fetchDrivers]);

  return (
    <div className="relative h-full min-h-100 rounded-xl overflow-hidden border border-gray-800">
      {/* Status counters overlay */}
      <div className="absolute top-2 left-2 z-999 flex gap-1 pointer-events-none">
        <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur border border-gray-700/50 px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs text-gray-100 font-medium">{loading ? "…" : availableCount} available</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur border border-gray-700/50 px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-gray-100 font-medium">{onTripCount} on trip</span>
        </div>
        <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur border border-gray-700/50 px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-xs text-gray-100 font-medium">0 blocked</span>
        </div>
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 pointer-events-none">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
