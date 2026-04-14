"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Region { id: string; name: string; name_ru: string | null; center_lat: number; center_lon: number; }
interface Service { id: string; name: string; name_ru: string | null; service_class: string; region_id: string; }
interface DefaultAddress { id: string; name: string; name_ru: string | null; short_name: string | null; address: string; latitude: number; longitude: number; region_id: string; }
interface FoundUser { id: string; telegram_id: number | null; first_name: string | null; last_name: string | null; phone: string | null; role: string; total_rides: number; }
interface NearbyDriver { id: string; first_name: string | null; last_name: string | null; phone: string | null; is_online: boolean; distance_m: number | null; }

function distLabel(m: number | null) {
  if (m == null) return null;
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function CompactDriverSelector({
  lat, lon, regionId, selected, onSelect,
}: { lat: number; lon: number; regionId: string; selected: NearbyDriver | null; onSelect: (d: NearbyDriver | null) => void; }) {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDrivers = useCallback(async (q?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (q?.trim()) { p.set("q", q.trim()); } else { p.set("lat", String(lat)); p.set("lon", String(lon)); }
      if (regionId) p.set("region_id", regionId);
      const res = await fetch(`/api/dispatch/drivers?${p}`, { signal: abortRef.current.signal });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); setDrivers([]); return; }
      setDrivers(data.drivers ?? []);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setError("Failed to load drivers");
    } finally { setLoading(false); }
  }, [lat, lon, regionId]);

  useEffect(() => { fetchDrivers(); return () => abortRef.current?.abort(); }, [fetchDrivers]);
  useEffect(() => { const t = setTimeout(() => fetchDrivers(search), 350); return () => clearTimeout(t); }, [search, fetchDrivers]);

  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</label>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">optional</span>
      </div>
      <div className="flex gap-1.5">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); onSelect(null); }}
          placeholder="Search by name or phone…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 min-w-0" />
        <button type="button" onClick={() => { setSearch(""); onSelect(null); fetchDrivers(); }}
          className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white text-xs">↻</button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {selected ? (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-green-900/30 border border-green-700/40 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium truncate">
              {[selected.first_name, selected.last_name].filter(Boolean).join(" ") || selected.phone || "Unknown"}
            </p>
            {selected.distance_m != null && <p className="text-xs text-gray-500">{distLabel(selected.distance_m)} away</p>}
          </div>
          <button type="button" onClick={() => onSelect(null)} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">✕</button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto border border-gray-800 rounded-lg min-h-0 max-h-55">
          {loading && <p className="px-3 py-3 text-xs text-gray-500 text-center">Finding drivers…</p>}
          {!loading && drivers.length === 0 && <p className="px-3 py-3 text-xs text-gray-500 text-center">No online drivers nearby</p>}
          {!loading && drivers.map((d, i) => (
            <button key={d.id} type="button" onClick={() => onSelect(d)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-800/60 transition-colors ${i > 0 ? "border-t border-gray-800/60" : ""}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.is_online ? "bg-green-400" : "bg-gray-600"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">
                  {[d.first_name, d.last_name].filter(Boolean).join(" ") || d.phone || "Unknown"}
                </p>
                <p className="text-xs text-gray-600 truncate">{d.phone ?? "—"}</p>
              </div>
              {d.distance_m != null && <span className="text-xs text-gray-500 tabular-nums shrink-0">{distLabel(d.distance_m)}</span>}
              <span className="text-xs text-indigo-400 shrink-0">→</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-600">Skip to send to unassigned queue</p>
    </div>
  );
}

export default function DispatchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const [regions, setRegions] = useState<Region[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allAddresses, setAllAddresses] = useState<DefaultAddress[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [regionId, setRegionId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [addrQuery, setAddrQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<DefaultAddress | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null);

  const [dropoffAddress, setDropoffAddress] = useState("");
  const [distanceM, setDistanceM] = useState("");
  const [estimatedFare, setEstimatedFare] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dispatch/data")
      .then((r) => r.json())
      .then((d) => { setRegions(d.regions ?? []); setAllServices(d.services ?? []); setAllAddresses(d.addresses ?? []); })
      .finally(() => setDataLoading(false));
  }, []);

  const services = regionId ? allServices.filter((s) => s.region_id === regionId) : [];
  const addresses = regionId ? allAddresses.filter((a) => a.region_id === regionId) : allAddresses;
  const filtered = addrQuery
    ? addresses.filter((a) =>
        a.name.toLowerCase().includes(addrQuery.toLowerCase()) ||
        (a.name_ru ?? "").toLowerCase().includes(addrQuery.toLowerCase()) ||
        (a.short_name ?? "").toLowerCase().includes(addrQuery.toLowerCase()) ||
        a.address.toLowerCase().includes(addrQuery.toLowerCase())
      )
    : addresses;

  const lat = selectedAddress ? Number(selectedAddress.latitude) : 0;
  const lon = selectedAddress ? Number(selectedAddress.longitude) : 0;
  const resolvedAddress = selectedAddress
    ? (selectedAddress.name_ru ?? selectedAddress.name) + (selectedAddress.address ? ` — ${selectedAddress.address}` : "")
    : "";

  const canSubmit = phone.trim() && regionId && selectedAddress;

  async function lookup() {
    if (!phone.trim()) return;
    setLookingUp(true); setNotFound(false); setFoundUser(null);
    try {
      const res = await fetch(`/api/dispatch/phone-lookup?phone=${encodeURIComponent(phone.trim())}`);
      const data = await res.json();
      if (data.user) setFoundUser(data.user); else setNotFound(true);
    } finally { setLookingUp(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true); setError(null);
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
          dropoff_address: dropoffAddress.trim() || undefined,
          region_id: regionId,
          service_id: serviceId || undefined,
          note: note.trim() || undefined,
          distance_m: distanceM ? parseFloat(distanceM) : undefined,
          estimated_fare: estimatedFare ? parseFloat(estimatedFare) : undefined,
          driver_id: selectedDriver?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to dispatch"); return; }
      onClose();
      router.push(`/orders/${data.id}`);
    } catch { setError("Network error — please try again"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📞</span>
            <h2 className="text-base font-semibold text-white">New Call Order</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
            Loading…
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {/* 2-column grid */}
              <div className="grid grid-cols-2 gap-5 min-h-75">

                {/* LEFT: phone + region + service + pickup */}
                <div className="space-y-3 flex flex-col">
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                      Client Phone <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input type="tel" value={phone}
                        onChange={(e) => { setPhone(e.target.value); setFoundUser(null); setNotFound(false); }}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookup())}
                        placeholder="+998901234567"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                      <button type="button" onClick={lookup} disabled={lookingUp || !phone.trim()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs rounded-lg">
                        {lookingUp ? "…" : "Lookup"}
                      </button>
                    </div>
                    {foundUser && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-green-900/30 border border-green-700/40 rounded-lg mt-1.5">
                        <span className="text-green-400 text-xs">✓</span>
                        <p className="text-xs text-white flex-1">
                          {[foundUser.first_name, foundUser.last_name].filter(Boolean).join(" ") || "—"}
                          <span className="text-gray-500 ml-1">· {foundUser.total_rides} rides</span>
                        </p>
                        <button type="button" onClick={() => setFoundUser(null)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
                      </div>
                    )}
                    {notFound && <p className="text-xs text-amber-400 mt-1">⚠ New client — order with phone only</p>}
                  </div>

                  {/* Region + Service row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Region <span className="text-red-400">*</span></label>
                      <select aria-label="Region" value={regionId} onChange={(e) => { setRegionId(e.target.value); setServiceId(""); setSelectedAddress(null); setSelectedDriver(null); }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                        <option value="">Select…</option>
                        {regions.map((r) => <option key={r.id} value={r.id}>{r.name_ru ?? r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Service</label>
                      <select aria-label="Service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}
                        disabled={!regionId || services.length === 0}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-40">
                        <option value="">{regionId ? "Any" : "Select region first"}</option>
                        {services.map((s) => <option key={s.id} value={s.id}>{s.name_ru ?? s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Pickup */}
                  <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                      Pickup Location <span className="text-red-400">*</span>
                    </label>
                    {selectedAddress ? (
                      <div className="flex items-start gap-2 px-2.5 py-2 bg-indigo-900/30 border border-indigo-600/40 rounded-lg">
                        <span className="text-indigo-400 text-sm shrink-0">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-medium truncate">{selectedAddress.name_ru ?? selectedAddress.name}</p>
                          <p className="text-xs text-gray-500 truncate">{selectedAddress.address}</p>
                        </div>
                        <button type="button" onClick={() => { setSelectedAddress(null); setAddrQuery(""); }}
                          className="text-gray-500 hover:text-gray-300 text-xs shrink-0">✕</button>
                      </div>
                    ) : (
                      <>
                        <input type="text" value={addrQuery} onChange={(e) => setAddrQuery(e.target.value)}
                          placeholder={regionId ? "Search address…" : "Select region first"}
                          disabled={!regionId}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-40 mb-1" />
                        <div className="flex-1 overflow-y-auto border border-gray-800 rounded-lg min-h-0 max-h-40">
                          {filtered.length === 0 && regionId && (
                            <p className="px-3 py-3 text-xs text-gray-600 text-center">No addresses found</p>
                          )}
                          {!regionId && (
                            <p className="px-3 py-3 text-xs text-gray-600 text-center">Select a region to see addresses</p>
                          )}
                          {filtered.slice(0, 30).map((a) => (
                            <button key={a.id} type="button" onClick={() => { setSelectedAddress(a); setAddrQuery(""); }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0">
                              <p className="text-xs text-white">{a.name_ru ?? a.name}</p>
                              <p className="text-xs text-gray-600 truncate">{a.address}</p>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* RIGHT: Driver selector */}
                <div className="flex flex-col">
                  {lat && lon ? (
                    <CompactDriverSelector
                      lat={lat} lon={lon} regionId={regionId}
                      selected={selectedDriver} onSelect={setSelectedDriver}
                    />
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</label>
                        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">optional</span>
                      </div>
                      <div className="flex-1 border border-gray-800 rounded-lg flex items-center justify-center">
                        <p className="text-xs text-gray-600 text-center px-4">Select pickup location<br />to see nearby drivers</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Dropoff + fare + note */}
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Drop-off address</label>
                    <input type="text" value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)}
                      placeholder="Destination…"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Distance (m)</label>
                    <input type="number" min="0" value={distanceM} onChange={(e) => setDistanceM(e.target.value)}
                      placeholder="5400"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Est. fare</label>
                    <input type="number" min="0" value={estimatedFare} onChange={(e) => setEstimatedFare(e.target.value)}
                      placeholder="15000"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Note</label>
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. wheelchair needed, gate code…"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-gray-800 flex items-center gap-3 shrink-0">
              {error && <p className="flex-1 text-xs text-red-400">{error}</p>}
              {!error && <div className="flex-1" />}
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit || submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
                {submitting ? "Dispatching…" : selectedDriver ? "📞 Dispatch & Assign" : "📞 Dispatch"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
