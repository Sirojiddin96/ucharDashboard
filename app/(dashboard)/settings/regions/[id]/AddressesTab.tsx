"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-65 rounded-lg border border-gray-600 bg-gray-700/40 animate-pulse" />
  ),
});

const CATEGORIES = [
  "airport", "train_station", "bus_terminal", "metro_station",
  "hotel", "shopping_mall", "hospital", "university",
  "government", "park", "stadium", "restaurant", "other",
];

type Address = {
  id: string;
  region_id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  short_name?: string;
  address?: string;
  latitude: number;
  longitude: number;
  category: string;
  icon_key?: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY = (regionId: string): Partial<Address> => ({
  region_id: regionId, name: "", latitude: 0, longitude: 0,
  category: "other", is_active: true, sort_order: 0,
});

export default function AddressesTab({ regionId, initialAddresses }: { regionId: string; initialAddresses: Address[] }) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<Partial<Address>>(EMPTY(regionId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() { setEditing(null); setForm(EMPTY(regionId)); setError(""); setShowForm(true); }
  function openEdit(a: Address) { setEditing(a); setForm(a); setError(""); setShowForm(true); }

  async function refreshList() {
    const res = await fetch(`/api/settings/addresses?region_id=${regionId}`);
    const json = await res.json();
    setAddresses(json.addresses ?? []);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const url = editing ? `/api/settings/addresses/${editing.id}` : "/api/settings/addresses";
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
    if (!confirm("Delete this address?")) return;
    setDeleting(id);
    await fetch(`/api/settings/addresses/${id}`, { method: "DELETE" });
    await refreshList();
    setDeleting(null);
  }

  const f = (key: keyof Address, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg">+ New Address</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white">{editing ? "Edit Address" : "New Address"}</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Name *</label>
                <input className="input-dark w-full" title="Name" placeholder="Location name" value={form.name ?? ""} onChange={(e) => f("name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Name (UZ)</label>
                <input className="input-dark w-full" title="Name (UZ)" placeholder="Uzbek name" value={form.name_uz ?? ""} onChange={(e) => setForm({ ...form, name_uz: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Name (RU)</label>
                <input className="input-dark w-full" title="Name (RU)" placeholder="Russian name" value={form.name_ru ?? ""} onChange={(e) => setForm({ ...form, name_ru: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Short Name</label>
                <input className="input-dark w-full" title="Short Name" placeholder="e.g. TAS" value={form.short_name ?? ""} onChange={(e) => f("short_name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Category</label>
                <select title="Category" className="input-dark w-full" value={form.category ?? "other"} onChange={(e) => f("category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Address</label>
                <input className="input-dark w-full" value={form.address ?? ""} onChange={(e) => f("address", e.target.value)} placeholder="Street address" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1.5">Location (search or click map) *</label>
                <MapPicker
                  key={editing?.id ?? "new"}
                  lat={form.latitude ?? 0}
                  lon={form.longitude ?? 0}
                  onChange={(lat, lon, addr, force) =>
                    setForm((p) => ({
                      ...p,
                      latitude: lat,
                      longitude: lon,
                      ...(addr && (force || !p.address) ? { address: addr } : {}),
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Latitude *</label>
                <input type="number" step="any" title="Latitude" placeholder="41.2995" className="input-dark w-full" value={form.latitude ?? 0} onChange={(e) => f("latitude", parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Longitude *</label>
                <input type="number" step="any" title="Longitude" placeholder="69.2401" className="input-dark w-full" value={form.longitude ?? 0} onChange={(e) => f("longitude", parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Icon Key</label>
                <input className="input-dark w-full" value={form.icon_key ?? ""} onChange={(e) => f("icon_key", e.target.value)} placeholder="e.g. airplane" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Sort Order</label>
                <input type="number" title="Sort Order" placeholder="0" className="input-dark w-full" value={form.sort_order ?? 0} onChange={(e) => f("sort_order", parseInt(e.target.value))} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="addr-active" checked={form.is_active ?? true} onChange={(e) => f("is_active", e.target.checked)} />
                <label htmlFor="addr-active" className="text-sm text-gray-300">Active</label>
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
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Coords</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {addresses.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-8">No addresses yet.</td></tr>}
            {addresses.map((a) => (
              <tr key={a.id} className="border-b border-gray-700/50 last:border-0">
                <td className="px-4 py-3">
                  <div className="text-white">{a.name}</div>
                  {a.short_name && <div className="text-xs text-gray-500">{a.short_name}</div>}
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-300">{a.category}</span></td>
                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${a.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>{a.is_active ? "Active" : "Inactive"}</span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(a)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                  <button onClick={() => del(a.id)} disabled={deleting === a.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">{deleting === a.id ? "…" : "Delete"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
