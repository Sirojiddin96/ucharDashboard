"use client";

import { useState } from "react";

const SERVICE_CLASSES = ["economy", "standard", "comfort", "business", "minivan", "cargo", "intercity"];

export type ServiceType = {
  id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  service_class: string;
  max_passengers: number;
  estimated_pickup_minutes?: number;
  is_active: boolean;
  sort_order: number;
};

const EMPTY: Partial<ServiceType> = {
  name: "", service_class: "economy",
  max_passengers: 4, estimated_pickup_minutes: 5,
  is_active: true, sort_order: 0,
};

export default function ServiceTypeList({ initialServiceTypes }: { initialServiceTypes: ServiceType[] }) {
  const [list, setList] = useState<ServiceType[]>(initialServiceTypes);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [form, setForm] = useState<Partial<ServiceType>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY); setError(""); setShowForm(true); }
  function openEdit(s: ServiceType) { setEditing(s); setForm(s); setError(""); setShowForm(true); }

  const f = (key: keyof ServiceType, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  async function refresh() {
    const res = await fetch("/api/settings/service-types");
    const json = await res.json();
    setList(json.service_types ?? []);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const url = editing ? `/api/settings/service-types/${editing.id}` : "/api/settings/service-types";
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
    if (!confirm("Delete this service type? It will be removed from all region mappings.")) return;
    setDeleting(id);
    await fetch(`/api/settings/service-types/${id}`, { method: "DELETE" });
    await refresh();
    setDeleting(null);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg">
          + New Service Type
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {editing ? "Edit Service Type" : "New Service Type"}
            </h2>
            <p className="text-xs text-gray-500">
              Changes here sync automatically to every region that uses this service type.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Name *</label>
                <input
                  className="input-dark w-full" title="Name" placeholder="e.g. Economy"
                  value={form.name ?? ""} onChange={(e) => f("name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Name (UZ)</label>
                <input className="input-dark w-full" title="Name (UZ)" placeholder="Uzbek" value={form.name_uz ?? ""} onChange={(e) => f("name_uz", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Name (RU)</label>
                <input className="input-dark w-full" title="Name (RU)" placeholder="Russian" value={form.name_ru ?? ""} onChange={(e) => f("name_ru", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Service Class *</label>
                <select title="Service Class" className="input-dark w-full" value={form.service_class ?? "economy"} onChange={(e) => f("service_class", e.target.value)}>
                  {SERVICE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Max Passengers</label>
                <input type="number" title="Max Passengers" placeholder="4" className="input-dark w-full" value={form.max_passengers ?? 4} onChange={(e) => f("max_passengers", parseInt(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Pickup ETA (min)</label>
                <input type="number" title="Pickup ETA" placeholder="5" className="input-dark w-full" value={form.estimated_pickup_minutes ?? ""} onChange={(e) => f("estimated_pickup_minutes", parseInt(e.target.value) || null)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Sort Order</label>
                <input type="number" title="Sort Order" placeholder="0" className="input-dark w-full" value={form.sort_order ?? 0} onChange={(e) => f("sort_order", parseInt(e.target.value))} />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" id="st-active" checked={form.is_active ?? true} onChange={(e) => f("is_active", e.target.checked)} />
                <label htmlFor="st-active" className="text-sm text-gray-300">Active</label>
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
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Max pax</th>
              <th className="px-4 py-3">ETA</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {list.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-10">No service types yet.</td></tr>
            )}
            {list.map((st) => (
              <tr key={st.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-white">
                  {st.name}
                  {st.name_uz && <span className="ml-2 text-xs text-gray-500">{st.name_uz}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs font-mono">{st.service_class}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">{st.max_passengers}</td>
                <td className="px-4 py-3 text-gray-400">{st.estimated_pickup_minutes ? `${st.estimated_pickup_minutes} min` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${st.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {st.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(st)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                    <button
                      onClick={() => del(st.id)}
                      disabled={deleting === st.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                    >
                      {deleting === st.id ? "…" : "Delete"}
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
