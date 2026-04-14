"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SURGE_PRESETS = ["none", "low", "medium", "high", "custom"];

type Service = { id: string; name: string; service_class: string };
type Tariff = {
  id: string;
  region_id: string;
  service_id: string;
  name?: string;
  currency: string;
  base_fare: number;
  per_km: number;
  per_min_driving: number;
  per_min_waiting: number;
  minimum_fare: number;
  cancellation_fee: number;
  surge_multiplier: number;
  surge_preset: string;
  night_surcharge: number;
  night_start_hour: number;
  night_end_hour: number;
  is_active: boolean;
  services?: { name: string; service_class: string };
};

const EMPTY = (regionId: string, services: Service[]): Partial<Tariff> => ({
  region_id: regionId,
  service_id: services[0]?.id ?? "",
  name: "",
  currency: "UZS",
  base_fare: 0, per_km: 0, per_min_driving: 0, per_min_waiting: 0,
  minimum_fare: 0, cancellation_fee: 0,
  surge_multiplier: 1.0, surge_preset: "none",
  night_surcharge: 0, night_start_hour: 22, night_end_hour: 6,
  is_active: true,
});

export default function TariffsTab({
  regionId,
  initialTariffs,
  services,
}: {
  regionId: string;
  initialTariffs: Tariff[];
  services: Service[];
}) {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<Tariff[]>(initialTariffs);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [form, setForm] = useState<Partial<Tariff>>(EMPTY(regionId, services));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY(regionId, services)); setError(""); setShowForm(true); }
  function openEdit(t: Tariff) { setEditing(t); setForm(t); setError(""); setShowForm(true); }

  async function refreshList() {
    const res = await fetch(`/api/settings/tariffs?region_id=${regionId}`);
    const json = await res.json();
    setTariffs(json.tariffs ?? []);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const url = editing ? `/api/settings/tariffs/${editing.id}` : "/api/settings/tariffs";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setShowForm(false);
      await refreshList();
      router.refresh();
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this tariff?")) return;
    setDeleting(id);
    await fetch(`/api/settings/tariffs/${id}`, { method: "DELETE" });
    await refreshList();
    setDeleting(null);
  }

  const f = (key: keyof Tariff, val: unknown) => setForm((p) => ({ ...p, [key]: val }));
  const num = (key: keyof Tariff, e: React.ChangeEvent<HTMLInputElement>) => f(key, parseFloat(e.target.value) || 0);
  const int = (key: keyof Tariff, e: React.ChangeEvent<HTMLInputElement>) => f(key, parseInt(e.target.value) || 0);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} disabled={services.length === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
          + New Tariff
        </button>
      </div>
      {services.length === 0 && (
        <p className="text-yellow-400 text-sm mb-4">Add services first before creating tariffs.</p>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white">{editing ? "Edit Tariff" : "New Tariff"}</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Name</label>
                <input className="input-dark w-full" value={form.name ?? ""} onChange={(e) => f("name", e.target.value)} placeholder="Optional label" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Service *</label>
                <select title="Service" className="input-dark w-full" value={form.service_id ?? ""} onChange={(e) => f("service_id", e.target.value)}>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.service_class})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Base Fare</label>
                <input type="number" step="any" title="Base Fare" placeholder="0" className="input-dark w-full" value={form.base_fare ?? 0} onChange={(e) => num("base_fare", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Per km</label>
                <input type="number" step="any" title="Per km" placeholder="0" className="input-dark w-full" value={form.per_km ?? 0} onChange={(e) => num("per_km", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Per min (driving)</label>
                <input type="number" step="any" title="Per min driving" placeholder="0" className="input-dark w-full" value={form.per_min_driving ?? 0} onChange={(e) => num("per_min_driving", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Per min (waiting)</label>
                <input type="number" step="any" title="Per min waiting" placeholder="0" className="input-dark w-full" value={form.per_min_waiting ?? 0} onChange={(e) => num("per_min_waiting", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Minimum Fare</label>
                <input type="number" step="any" title="Minimum Fare" placeholder="0" className="input-dark w-full" value={form.minimum_fare ?? 0} onChange={(e) => num("minimum_fare", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Cancellation Fee</label>
                <input type="number" step="any" title="Cancellation Fee" placeholder="0" className="input-dark w-full" value={form.cancellation_fee ?? 0} onChange={(e) => num("cancellation_fee", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Surge Preset</label>
                <select title="Surge Preset" className="input-dark w-full" value={form.surge_preset ?? "none"} onChange={(e) => f("surge_preset", e.target.value)}>
                  {SURGE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Surge Multiplier</label>
                <input type="number" step="0.1" title="Surge Multiplier" placeholder="1.0" className="input-dark w-full" value={form.surge_multiplier ?? 1.0} onChange={(e) => num("surge_multiplier", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Night Surcharge</label>
                <input type="number" step="any" title="Night Surcharge" placeholder="0" className="input-dark w-full" value={form.night_surcharge ?? 0} onChange={(e) => num("night_surcharge", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Night Start Hour</label>
                <input type="number" min="0" max="23" title="Night Start Hour" placeholder="22" className="input-dark w-full" value={form.night_start_hour ?? 22} onChange={(e) => int("night_start_hour", e)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Night End Hour</label>
                <input type="number" min="0" max="23" title="Night End Hour" placeholder="6" className="input-dark w-full" value={form.night_end_hour ?? 6} onChange={(e) => int("night_end_hour", e)} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="tariff-active" checked={form.is_active ?? true} onChange={(e) => f("is_active", e.target.checked)} />
                <label htmlFor="tariff-active" className="text-sm text-gray-300">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
              <th className="text-left px-4 py-3">Service</th>
              <th className="text-left px-4 py-3">Base</th>
              <th className="text-left px-4 py-3">Per km</th>
              <th className="text-left px-4 py-3">Min Fare</th>
              <th className="text-left px-4 py-3">Surge</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tariffs.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-8">No tariffs yet.</td></tr>}
            {tariffs.map((t) => (
              <tr key={t.id} className="border-b border-gray-700/50 last:border-0">
                <td className="px-4 py-3">
                  <div className="text-white">{t.services?.name ?? "—"}</div>
                  {t.name && <div className="text-xs text-gray-500">{t.name}</div>}
                </td>
                <td className="px-4 py-3 text-gray-300">{t.base_fare.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{t.per_km.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{t.minimum_fare.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{t.surge_preset} ×{t.surge_multiplier}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${t.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>{t.is_active ? "Active" : "Inactive"}</span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(t)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                  <button onClick={() => del(t.id)} disabled={deleting === t.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">{deleting === t.id ? "…" : "Delete"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
