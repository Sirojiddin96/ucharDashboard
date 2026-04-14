"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Region {
  id: string;
  name: string;
  name_ru: string | null;
  center_lat: number;
  center_lon: number;
  currency: string;
}

interface Service {
  id: string;
  name: string;
  name_ru: string | null;
  service_class: string;
  region_id: string;
  estimated_pickup_minutes: number | null;
}

interface DefaultAddress {
  id: string;
  name: string;
  name_ru: string | null;
  short_name: string | null;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  region_id: string;
}

interface FoundUser {
  id: string;
  telegram_id: number | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  role: string;
  total_rides: number;
}

// ─── Sub-component: Phone Lookup ─────────────────────────────────────────────

function PhoneLookup({
  phone,
  setPhone,
  foundUser,
  setFoundUser,
}: {
  phone: string;
  setPhone: (v: string) => void;
  foundUser: FoundUser | null;
  setFoundUser: (u: FoundUser | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function lookup() {
    if (!phone.trim()) return;
    setLoading(true);
    setNotFound(false);
    setFoundUser(null);
    try {
      const res = await fetch(
        `/api/dispatch/phone-lookup?phone=${encodeURIComponent(phone.trim())}`
      );
      const data = await res.json();
      if (data.user) {
        setFoundUser(data.user);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Client Phone <span className="text-red-400">*</span>
      </label>
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setFoundUser(null);
            setNotFound(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="+998901234567"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={lookup}
          disabled={loading || !phone.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? "..." : "Look up"}
        </button>
      </div>

      {foundUser && (
        <div className="flex items-center gap-3 px-3 py-2 bg-green-900/30 border border-green-700/40 rounded-lg">
          <span className="text-green-400">✓</span>
          <div>
            <p className="text-sm text-white font-medium">
              {[foundUser.first_name, foundUser.last_name].filter(Boolean).join(" ") || "—"}
              {foundUser.username && (
                <span className="text-gray-400 ml-1">@{foundUser.username}</span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {foundUser.role} · {foundUser.total_rides} rides
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setFoundUser(null); setNotFound(false); }}
            className="ml-auto text-gray-500 hover:text-gray-300 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {notFound && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <span>⚠</span> No user found — order will be created with phone only
        </p>
      )}
    </div>
  );
}

// ─── Sub-component: Address Picker ───────────────────────────────────────────

function AddressPicker({
  addresses,
  selected,
  onSelect,
  manualLat,
  manualLon,
  setManualLat,
  setManualLon,
}: {
  addresses: DefaultAddress[];
  selected: DefaultAddress | null;
  onSelect: (a: DefaultAddress | null) => void;
  manualLat: string;
  manualLon: string;
  setManualLat: (v: string) => void;
  setManualLon: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showManual, setShowManual] = useState(false);

  const filtered = query
    ? addresses.filter(
        (a) =>
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          (a.name_ru ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (a.short_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
          a.address.toLowerCase().includes(query.toLowerCase())
      )
    : addresses;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Pickup Location <span className="text-red-400">*</span>
      </label>

      {!showManual ? (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); onSelect(null); }}
            placeholder="Search location..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
          />

          {selected ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-900/30 border border-indigo-600/40 rounded-lg text-sm">
              <span className="text-indigo-400">📍</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{selected.name_ru ?? selected.name}</p>
                <p className="text-gray-400 text-xs truncate">{selected.address}</p>
                <p className="text-gray-500 text-xs">{selected.latitude}, {selected.longitude}</p>
              </div>
              <button
                type="button"
                onClick={() => { onSelect(null); setQuery(""); }}
                className="text-gray-500 hover:text-gray-300 text-xs"
              >✕</button>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-800 border border-gray-700 rounded-lg">
              {filtered.length === 0 && (
                <p className="px-3 py-3 text-sm text-gray-500">No locations found</p>
              )}
              {filtered.slice(0, 20).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onSelect(a); setQuery(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors"
                >
                  <p className="text-sm text-white">{a.name_ru ?? a.name}</p>
                  <p className="text-xs text-gray-500 truncate">{a.address}</p>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Enter coordinates manually →
          </button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="41.2995"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                placeholder="69.2401"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setShowManual(false); onSelect(null); }}
            className="text-xs text-gray-400 hover:text-gray-300"
          >
            ← Back to location search
          </button>
        </>
      )}
    </div>
  );
}

// ─── Sub-component: Driver Selector ──────────────────────────────────────────

interface NearbyDriver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_online: boolean;
  lat: number | null;
  lon: number | null;
  distance_m: number | null;
}

function distLabel(m: number | null) {
  if (m == null) return null;
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function DriverSelector({
  lat,
  lon,
  regionId,
  selected,
  onSelect,
}: {
  lat: number;
  lon: number;
  regionId: string;
  selected: NearbyDriver | null;
  onSelect: (d: NearbyDriver | null) => void;
}) {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDrivers = useCallback(
    async (q?: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q?.trim()) {
          params.set("q", q.trim());
        } else {
          params.set("lat", String(lat));
          params.set("lon", String(lon));
        }
        if (regionId) params.set("region_id", regionId);
        const res = await fetch(`/api/dispatch/drivers?${params}`, {
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to load drivers");
          setDrivers([]);
          return;
        }
        setDrivers(data.drivers ?? []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Failed to load drivers");
        }
      } finally {
        setLoading(false);
      }
    },
    [lat, lon, regionId]
  );

  // Initial load when lat/lon are ready
  useEffect(() => {
    fetchDrivers();
    return () => abortRef.current?.abort();
  }, [fetchDrivers]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchDrivers(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchDrivers]);

  return (
    <div className="space-y-3">
      {/* Search + refresh */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onSelect(null);
          }}
          placeholder="Search driver by name or phone..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => { setSearch(""); onSelect(null); fetchDrivers(); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
          title="Refresh nearby drivers"
        >
          ↻
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Selected driver pill */}
      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700/40 rounded-lg text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">
              {[selected.first_name, selected.last_name].filter(Boolean).join(" ") || selected.phone || "Unknown"}
            </p>
            {selected.distance_m != null && (
              <p className="text-xs text-gray-400">{distLabel(selected.distance_m)} away</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-gray-500 hover:text-gray-300 text-xs shrink-0"
          >
            ✕ Change
          </button>
        </div>
      )}

      {/* Driver list */}
      {!selected && (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          {loading && (
            <p className="px-4 py-4 text-sm text-gray-500 text-center">
              Finding nearby drivers...
            </p>
          )}
          {!loading && drivers.length === 0 && (
            <p className="px-4 py-4 text-sm text-gray-500 text-center">
              No online drivers found nearby
            </p>
          )}
          {!loading &&
            drivers.map((d, i) => {
              const name =
                [d.first_name, d.last_name].filter(Boolean).join(" ") ||
                d.phone ||
                "Unknown";
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelect(d)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-800/60 transition-colors ${
                    i > 0 ? "border-t border-gray-800" : ""
                  }`}
                >
                  {/* Online dot */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      d.is_online ? "bg-green-400" : "bg-gray-600"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{name}</p>
                    <p className="text-xs text-gray-500 truncate">{d.phone ?? "—"}</p>
                  </div>
                  {d.distance_m != null && (
                    <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                      {distLabel(d.distance_m)}
                    </span>
                  )}
                  <span className="text-xs text-indigo-400 shrink-0">Assign →</span>
                </button>
              );
            })}
        </div>
      )}

      <p className="text-xs text-gray-600">
        Skip to leave the order unassigned — you can assign from the order page later.
      </p>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function DispatchForm() {
  const router = useRouter();

  // Static data
  const [regions, setRegions] = useState<Region[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allAddresses, setAllAddresses] = useState<DefaultAddress[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [phone, setPhone] = useState("");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [regionId, setRegionId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<DefaultAddress | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [addressText, setAddressText] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null);
  const [note, setNote] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [distanceM, setDistanceM] = useState("");
  const [estimatedFare, setEstimatedFare] = useState("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load static data on mount
  useEffect(() => {
    fetch("/api/dispatch/data")
      .then((r) => r.json())
      .then((d) => {
        setRegions(d.regions ?? []);
        setAllServices(d.services ?? []);
        setAllAddresses(d.addresses ?? []);
      })
      .finally(() => setDataLoading(false));
  }, []);

  const services = regionId
    ? allServices.filter((s) => s.region_id === regionId)
    : allServices;

  const addresses = regionId
    ? allAddresses.filter((a) => a.region_id === regionId)
    : allAddresses;

  // Reset service + driver when region changes
  const handleRegionChange = useCallback((id: string) => {
    setRegionId(id);
    setServiceId("");
    setSelectedAddress(null);
    setSelectedDriver(null);
  }, []);

  // Resolve final lat/lon
  const lat = selectedAddress ? Number(selectedAddress.latitude) : parseFloat(manualLat);
  const lon = selectedAddress ? Number(selectedAddress.longitude) : parseFloat(manualLon);
  const resolvedAddress = selectedAddress
    ? (selectedAddress.name_ru ?? selectedAddress.name) + (selectedAddress.address ? ` — ${selectedAddress.address}` : "")
    : addressText;

  const locReady =
    regionId &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat !== 0 &&
    lon !== 0;

  const canSubmit = phone.trim() && locReady;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/dispatch/create-and-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          user_id: foundUser?.id,
          telegram_user_id: foundUser?.telegram_id ?? undefined,
          latitude: lat,
          longitude: lon,
          address: resolvedAddress || undefined,
          region_id: regionId,
          service_id: serviceId || undefined,
          note: note.trim() || undefined,
          dropoff_address: dropoffAddress.trim() || undefined,
          distance_m: distanceM ? parseFloat(distanceM) : undefined,
          estimated_fare: estimatedFare ? parseFloat(estimatedFare) : undefined,
          driver_id: selectedDriver?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create order");
        return;
      }

      router.push(`/orders/${data.id}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Loading dispatch data...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-8">
      {/* ── Step 1: Client ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          1 · Client
        </h2>
        <PhoneLookup
          phone={phone}
          setPhone={setPhone}
          foundUser={foundUser}
          setFoundUser={setFoundUser}
        />
      </section>

      {/* ── Step 2: Location ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          2 · Pickup Location
        </h2>

        {/* Region */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Region <span className="text-red-400">*</span>
          </label>
          <select
            title="select region"
            value={regionId}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select region...</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name_ru ?? r.name}
              </option>
            ))}
          </select>
        </div>

        <AddressPicker
          addresses={addresses}
          selected={selectedAddress}
          onSelect={setSelectedAddress}
          manualLat={manualLat}
          manualLon={manualLon}
          setManualLat={setManualLat}
          setManualLon={setManualLon}
        />

        {/* Address label (free text fallback) */}
        {!selectedAddress && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Address label (optional)
            </label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="e.g. Chilonzor 14-kvartal"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </section>

      {/* ── Step 3: Service ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          3 · Service
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {services.length === 0 && (
            <p className="col-span-2 text-sm text-gray-500">
              {regionId ? "No services in this region" : "Select a region first"}
            </p>
          )}
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id === serviceId ? "" : s.id)}
              className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                serviceId === s.id
                  ? "border-indigo-500 bg-indigo-900/30 text-white"
                  : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-white"
              }`}
            >
              <p className="text-sm font-medium">{s.name_ru ?? s.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.service_class}</p>
              {s.estimated_pickup_minutes && (
                <p className="text-xs text-indigo-400 mt-0.5">~{s.estimated_pickup_minutes} min</p>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Step 4: Destination & Fare ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            4 · Destination &amp; Fare
          </h2>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">optional</span>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Drop-off address</label>
          <input
            type="text"
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
            placeholder="e.g. Namangan, Mustaqillik xiyoboni"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Distance (m)</label>
            <input
              type="number"
              min="0"
              value={distanceM}
              onChange={(e) => setDistanceM(e.target.value)}
              placeholder="5400"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Estimated fare</label>
            <input
              type="number"
              min="0"
              value={estimatedFare}
              onChange={(e) => setEstimatedFare(e.target.value)}
              placeholder="15000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </section>

      {/* ── Step 5: Assign Driver ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            5 · Assign Driver
          </h2>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
            optional
          </span>
        </div>

        {locReady ? (
          <DriverSelector
            lat={lat}
            lon={lon}
            regionId={regionId}
            selected={selectedDriver}
            onSelect={setSelectedDriver}
          />
        ) : (
          <p className="text-sm text-gray-600">
            Complete region &amp; location in Step 2 to see nearby drivers.
          </p>
        )}
      </section>

      {/* ── Note ── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Note</h2>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">optional</span>
        </div>
        <textarea
          rows={2}
          className="input-dark w-full resize-none"
          placeholder="e.g. wheelchair needed, gate code…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
        >
          {submitting
            ? "Dispatching..."
            : selectedDriver
            ? "📞 Dispatch & Assign Driver"
            : "📞 Dispatch Call Order"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/orders")}
          className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
