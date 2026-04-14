"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number, address?: string, forceAddress?: boolean) => void;
}

type NominatimResult = { display_name: string; lat: string; lon: string };

export default function MapPicker({ lat, lon, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initLat = lat || 41.2995;
  const initLon = lon || 69.2401;
  const hasExisting = !!(lat && lon);

  const [coords, setCoords] = useState<[number, number]>([initLat, initLon]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import("leaflet").then((mod) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = mod.default;

      // Fix default marker icons missing in bundled builds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center: [initLat, initLon],
        zoom: hasExisting ? 15 : 12,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      function placeOrMoveMarker(eLat: number, eLng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([eLat, eLng]);
        } else {
          const m = L.marker([eLat, eLng], { draggable: true }).addTo(map);
          m.on("dragend", () => {
            const p = m.getLatLng();
            setCoords([p.lat, p.lng]);
            onChangeRef.current(p.lat, p.lng);
            reverseGeocode(p.lat, p.lng);
          });
          markerRef.current = m;
        }
      }

      if (hasExisting) placeOrMoveMarker(initLat, initLon);

      // Re-measure after the modal finishes painting
      setTimeout(() => map.invalidateSize(), 50);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on("click", (e: any) => {
        const { lat: cLat, lng: cLng } = e.latlng;
        placeOrMoveMarker(cLat, cLng);
        setCoords([cLat, cLng]);
        onChangeRef.current(cLat, cLng);
        reverseGeocode(cLat, cLng);
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reverseGeocode(rLat: number, rLon: number) {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${rLat}&lon=${rLon}&format=json`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => r.json())
      .then((d) => {
        console.log(d);
        if (d.display_name) onChangeRef.current(rLat, rLon, d.display_name, true);
      })
      .catch(() => {});
  }

  async function doSearch() {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        { headers: { Accept: "application/json" } }
      );
      setResults(await res.json());
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: NominatimResult) {
    const rLat = parseFloat(r.lat);
    const rLng = parseFloat(r.lon);
    setCoords([rLat, rLng]);
    setResults([]);
    onChangeRef.current(rLat, rLng, r.display_name, true);

    if (mapRef.current) {
      mapRef.current.setView([rLat, rLng], 15);
    }

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([rLat, rLng]);
      } else {
        const m = L.marker([rLat, rLng], { draggable: true }).addTo(mapRef.current);
        m.on("dragend", () => {
          const p = m.getLatLng();
          setCoords([p.lat, p.lng]);
          onChangeRef.current(p.lat, p.lng);
          reverseGeocode(p.lat, p.lng);
        });
        markerRef.current = m;
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          className="input-dark flex-1 text-sm"
          placeholder="Search location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
        />
        <button
          type="button"
          onClick={doSearch}
          disabled={searching}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-50 shrink-0"
        >
          {searching ? "…" : "Search"}
        </button>
      </div>

      {/* Nominatim results */}
      {results.length > 0 && (
        <div className="bg-gray-700 rounded-lg border border-gray-600 max-h-36 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickResult(r)}
              className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-600 border-b border-gray-600/50 last:border-0 leading-snug"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div
        ref={containerRef}
        className="map-picker-container rounded-lg overflow-hidden border border-gray-600"
      />

      <p className="text-xs text-gray-500">
        Click the map or drag the pin to set location &middot;{" "}
        <span className="font-mono">{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
      </p>
    </div>
  );
}
