"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapPicker = dynamic(
  () => import("./[id]/MapPicker"),
  { ssr: false, loading: () => <div className="h-70 bg-gray-800 rounded-xl animate-pulse" /> }
);

type Region = {
  id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  slug: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  sort_order: number;
  center_lat: number;
  center_lon: number;
};

const EMPTY: Partial<Region> = {
  name: "", slug: "", currency: "UZS", timezone: "Asia/Tashkent",
  is_active: true, sort_order: 0, center_lat: 0, center_lon: 0,
};

export default function RegionList({ initialRegions }: { initialRegions: Region[] }) {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>(initialRegions);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [form, setForm] = useState<Partial<Region>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setShowForm(true);
  }

  function openEdit(r: Region) {
    setEditing(r);
    setForm(r);
    setError("");
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/settings/regions/${editing.id}` : "/api/settings/regions";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setShowForm(false);
      router.refresh();
      // Re-fetch list
      const listRes = await fetch("/api/settings/regions");
      const listJson = await listRes.json();
      setRegions(listJson.regions ?? []);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRegion(id: string) {
    if (!confirm("Delete this region? This will also delete its services, tariffs, and addresses.")) return;
    setDeleting(id);
    const res = await fetch(`/api/settings/regions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRegions((prev) => prev.filter((r) => r.id !== id));
    }
    setDeleting(null);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg"
        >
          + New Region
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700/60 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-800">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/80 mb-1">Configuration</p>
              <h2 className="text-[17px] font-semibold text-white leading-tight">
                {editing ? "Update Region" : "New Region"}
              </h2>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
              {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}

              {/* Name */}
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Name <span className="text-gray-600">*</span></label>
                <input
                  className="region-input w-full"
                  placeholder="e.g. Tashkent"
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Name UZ + Name RU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Name <span className="text-gray-500">(UZ)</span></label>
                  <input
                    className="region-input w-full"
                    placeholder="Toshkent"
                    value={form.name_uz ?? ""}
                    onChange={(e) => setForm({ ...form, name_uz: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Name <span className="text-gray-500">(RU)</span></label>
                  <input
                    className="region-input w-full"
                    placeholder="Ташкент"
                    value={form.name_ru ?? ""}
                    onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
                  />
                </div>
              </div>

              {/* Slug + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Slug <span className="text-gray-600">*</span></label>
                  <input
                    className="region-input w-full font-mono"
                    placeholder="tashkent"
                    value={form.slug ?? ""}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Currency</label>
                  <select
                    title="Currency"
                    className="region-input w-full"
                    value={form.currency ?? "UZS"}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="UZS">UZS — Uzbekistani Som</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="RUB">RUB — Russian Ruble</option>
                    <option value="KZT">KZT — Kazakhstani Tenge</option>
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Timezone</label>
                <select
                  title="Timezone"
                  className="region-input w-full"
                  value={form.timezone ?? "Asia/Tashkent"}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                >
                  <option value="Asia/Tashkent">Asia/Tashkent (UTC+5)</option>
                  <option value="Asia/Almaty">Asia/Almaty (UTC+6)</option>
                  <option value="Asia/Dhaka">Asia/Dhaka (UTC+6)</option>
                  <option value="Asia/Bishkek">Asia/Bishkek (UTC+6)</option>
                  <option value="Asia/Dushanbe">Asia/Dushanbe (UTC+5)</option>
                  <option value="Asia/Ashgabat">Asia/Ashgabat (UTC+5)</option>
                  <option value="Asia/Kabul">Asia/Kabul (UTC+4:30)</option>
                  <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              {/* Center Lat + Center Lon + Sort Order */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Center Lat</label>
                  <input
                    type="number"
                    step="any"
                    className="region-input w-full"
                    placeholder="41.2995"
                    value={form.center_lat ?? ""}
                    onChange={(e) => setForm({ ...form, center_lat: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Center Lon</label>
                  <input
                    type="number"
                    step="any"
                    className="region-input w-full"
                    placeholder="69.2401"
                    value={form.center_lon ?? ""}
                    onChange={(e) => setForm({ ...form, center_lon: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    className="region-input w-full"
                    placeholder="0"
                    value={form.sort_order ?? 0}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Map picker */}
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
                  Region Center
                  <span className="ml-2 text-gray-600 normal-case font-normal">click on the map to set lat/lon</span>
                </label>
                <div className="h-70 rounded-xl overflow-hidden border border-gray-700/50 relative">
                  <MapPicker
                    lat={form.center_lat || 0}
                    lon={form.center_lon || 0}
                    onChange={(lat, lon) => setForm((f) => ({ ...f, center_lat: lat, center_lon: lon }))}
                  />
                </div>
              </div>

              {/* Active toggle row */}
              <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-gray-200">Active</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Region will be visible to users</p>
                </div>
                <button
                  type="button"
                  aria-label="Toggle active"
                  onClick={() => setForm({ ...form, is_active: !(form.is_active ?? true) })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    (form.is_active ?? true) ? "bg-indigo-600" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                      (form.is_active ?? true) ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="text-[13px] font-medium text-gray-400 hover:text-white px-4 h-9.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="h-9.5 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? "Saving…" : editing ? "Update Region" : "Create Region"}
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
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Currency</th>
              <th className="text-left px-4 py-3">Timezone</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {regions.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-8">No regions yet.</td></tr>
            )}
            {regions.map((r) => (
              <tr key={r.id} className="border-b border-gray-700/50 hover:bg-gray-750 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/settings/regions/${r.id}`} className="text-white font-medium hover:text-indigo-400">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.slug}</td>
                <td className="px-4 py-3 text-gray-300">{r.currency}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.timezone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(r)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                  <button onClick={() => deleteRegion(r.id)} disabled={deleting === r.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
                    {deleting === r.id ? "…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
