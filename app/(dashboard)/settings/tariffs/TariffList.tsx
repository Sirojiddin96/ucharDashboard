"use client";

import { useState } from "react";

const SURGE_PRESETS = ["none", "low", "medium", "high", "custom"];

export type Tariff = {
  id: string;
  name: string;
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
};

const EMPTY: Partial<Tariff> = {
  name: "", currency: "UZS",
  base_fare: 0, per_km: 0, per_min_driving: 0, per_min_waiting: 0,
  minimum_fare: 0, cancellation_fee: 0,
  surge_multiplier: 1.0, surge_preset: "none",
  night_surcharge: 0, night_start_hour: 22, night_end_hour: 6,
  is_active: true,
};

export default function TariffList({ initialTariffs }: { initialTariffs: Tariff[] }) {
  const [list, setList] = useState<Tariff[]>(initialTariffs);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [form, setForm] = useState<Partial<Tariff>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setError(""); setShowForm(true); }
  function openEdit(t: Tariff) { setEditing(t); setForm(t); setError(""); setShowForm(true); }

  const f = (key: keyof Tariff, val: unknown) => setForm((p) => ({ ...p, [key]: val }));
  const num = (key: keyof Tariff) => (e: React.ChangeEvent<HTMLInputElement>) => f(key, parseFloat(e.target.value) || 0);
  const int = (key: keyof Tariff) => (e: React.ChangeEvent<HTMLInputElement>) => f(key, parseInt(e.target.value) || 0);

  async function refresh() {
    const res = await fetch("/api/settings/tariffs");
    const json = await res.json();
    setList(json.tariffs ?? []);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const url = editing ? `/api/settings/tariffs/${editing.id}` : "/api/settings/tariffs";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setShowForm(false);
      await refresh();
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this tariff? Any region mapping using it will lose its tariff assignment.")) return;
    setDeleting(id);
    await fetch(`/api/settings/tariffs/${id}`, { method: "DELETE" });
    await refresh();
    setDeleting(null);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg">
          + New Tariff
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-semibold text-white">{editing ? "Edit Tariff" : "New Tariff"}</h2>
            <p className="text-xs text-gray-500">
              Changes here sync instantly to every region that uses this tariff.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Tariff Name *</label>
                <input
                  className="input-dark w-full" title="Tariff Name" placeholder="e.g. Standard Tashkent"
                  value={form.name ?? ""} onChange={(e) => f("name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Currency</label>
                <input className="input-dark w-full" title="Currency" placeholder="UZS" value={form.currency ?? "UZS"} onChange={(e) => f("currency", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Base Fare</label>
                <input type="number" className="input-dark w-full" title="Base Fare" placeholder="0" value={form.base_fare ?? 0} onChange={num("base_fare")} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Per km</label>
                <input type="number" className="input-dark w-full" title="Per km" placeholder="0" value={form.per_km ?? 0} onChange={num("per_km")} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Per min (driving)</label>
                <input type="number" className="input-dark w-full" title="Per min driving" placeholder="0" value={form.per_min_driving ?? 0} onChange={num("per_min_driving")} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Per min (waiting)</label>
                <input type="number" className="input-dark w-full" title="Per min waiting" placeholder="0" value={form.per_min_waiting ?? 0} onChange={num("per_min_waiting")} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Minimum Fare</label>
                <input type="number" className="input-dark w-full" title="Minimum Fare" placeholder="0" value={form.minimum_fare ?? 0} onChange={num("minimum_fare")} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Cancellation Fee</label>
                <input type="number" className="input-dark w-full" title="Cancellation Fee" placeholder="0" value={form.cancellation_fee ?? 0} onChange={num("cancellation_fee")} />
              </div>

              <div className="col-span-2 border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Surge</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Surge Preset</label>
                    <select title="Surge Preset" className="input-dark w-full" value={form.surge_preset ?? "none"} onChange={(e) => f("surge_preset", e.target.value)}>
                      {SURGE_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Multiplier</label>
                    <input type="number" step="0.1" className="input-dark w-full" title="Surge Multiplier" placeholder="1.0" value={form.surge_multiplier ?? 1.0} onChange={num("surge_multiplier")} />
                  </div>
                </div>
              </div>

              <div className="col-span-2 border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Night Surcharge</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Amount</label>
                    <input type="number" className="input-dark w-full" title="Night Surcharge" placeholder="0" value={form.night_surcharge ?? 0} onChange={num("night_surcharge")} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">From (hour)</label>
                    <input type="number" className="input-dark w-full" title="Night Start Hour" placeholder="22" value={form.night_start_hour ?? 22} onChange={int("night_start_hour")} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">To (hour)</label>
                    <input type="number" className="input-dark w-full" title="Night End Hour" placeholder="6" value={form.night_end_hour ?? 6} onChange={int("night_end_hour")} />
                  </div>
                </div>
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Base</th>
              <th className="px-4 py-3">Per km</th>
              <th className="px-4 py-3">Per min</th>
              <th className="px-4 py-3">Min fare</th>
              <th className="px-4 py-3">Surge</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {list.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-500 py-10">No tariffs yet.</td></tr>
            )}
            {list.map((t) => (
              <tr key={t.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-white">{t.name || <span className="text-gray-500 italic">Unnamed</span>}</td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{t.base_fare.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{t.per_km.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{t.per_min_driving.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{t.minimum_fare.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {t.surge_preset !== "none"
                    ? <span className="px-2 py-0.5 rounded bg-yellow-900 text-yellow-300 text-xs">{t.surge_preset} ×{t.surge_multiplier}</span>
                    : <span className="text-gray-600 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${t.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(t)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                    <button
                      onClick={() => del(t.id)}
                      disabled={deleting === t.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                    >
                      {deleting === t.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
