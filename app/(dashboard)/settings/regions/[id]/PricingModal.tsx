"use client";

import { useState } from "react";

export type TariffTier = {
  id: string;
  rst_id: string;
  from_km: number;
  to_km: number | null;
  pricing_type: "flat" | "flat_min" | "per_km";
  rate: number;
  sort_order: number;
};

export type PricingRst = {
  id: string;
  display_fare: number;
  start_fare: number;
  minimum_fare: number;
  tariff_tiers: TariffTier[];
  service_types: { name: string; name_uz?: string | null; service_class: string } | null;
};

const EMPTY_TIER = { from_km: 0, to_km: "" as string, pricing_type: "per_km" as "flat" | "flat_min" | "per_km", rate: 0 };

export default function PricingModal({
  rst,
  onClose,
  onSaved,
}: {
  rst: PricingRst;
  onClose: () => void;
  onSaved: () => void;
}) {
  // RST fare fields
  const [displayFare, setDisplayFare] = useState(rst.display_fare ?? 0);
  const [startFare, setStartFare] = useState(rst.start_fare ?? 0);
  const [minimumFare, setMinimumFare] = useState(rst.minimum_fare ?? 0);
  const [fareSaving, setFareSaving] = useState(false);
  const [fareError, setFareError] = useState("");

  // Tiers
  const [tiers, setTiers] = useState<TariffTier[]>(
    [...(rst.tariff_tiers ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  );

  // Add tier form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_TIER);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit tier
  const [editingTier, setEditingTier] = useState<TariffTier | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_TIER);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function saveFares() {
    setFareSaving(true); setFareError("");
    try {
      const res = await fetch(`/api/settings/region-service-tariffs/${rst.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_fare: displayFare, start_fare: startFare, minimum_fare: minimumFare }),
      });
      const json = await res.json();
      if (!res.ok) { setFareError(json.error ?? "Failed"); return; }
      onSaved();
    } finally { setFareSaving(false); }
  }

  async function addTier() {
    setAddSaving(true); setAddError("");
    try {
      const res = await fetch("/api/settings/tariff-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rst_id: rst.id,
          from_km: addForm.from_km,
          to_km: addForm.to_km === "" ? null : parseFloat(String(addForm.to_km)),
          pricing_type: addForm.pricing_type,
          rate: addForm.rate,
          sort_order: tiers.length,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
      setTiers((prev) => [...prev, json.tier]);
      setShowAdd(false);
      setAddForm(EMPTY_TIER);
    } finally { setAddSaving(false); }
  }

  function openEditTier(t: TariffTier) {
    setEditingTier(t);
    setEditForm({
      from_km: t.from_km,
      to_km: t.to_km === null ? "" : String(t.to_km),
      pricing_type: t.pricing_type,
      rate: t.rate,
    });
    setEditError("");
  }

  async function saveEditTier() {
    if (!editingTier) return;
    setEditSaving(true); setEditError("");
    try {
      const res = await fetch(`/api/settings/tariff-tiers/${editingTier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_km: editForm.from_km,
          to_km: editForm.to_km === "" ? null : parseFloat(String(editForm.to_km)),
          pricing_type: editForm.pricing_type,
          rate: editForm.rate,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setEditError(json.error ?? "Failed"); return; }
      setTiers((prev) =>
        prev.map((t) =>
          t.id === editingTier.id
            ? {
                ...t,
                from_km: editForm.from_km,
                to_km: editForm.to_km === "" ? null : parseFloat(String(editForm.to_km)),
                pricing_type: editForm.pricing_type,
                rate: editForm.rate,
              }
            : t
        )
      );
      setEditingTier(null);
    } finally { setEditSaving(false); }
  }

  async function deleteTier(id: string) {
    if (!confirm("Bu bosqichni o'chirasizmi?")) return;
    setDeletingId(id);
    await fetch(`/api/settings/tariff-tiers/${id}`, { method: "DELETE" });
    setTiers((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
  }

  const fmt = (n: number) => String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {rst.service_types?.name ?? "Xizmat"} — Narxlar
            </h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{rst.service_types?.service_class}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Fare fields ── */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Asosiy narxlar</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Ko'rsatish narxi</label>
                <div className="relative">
                  <input
                    type="number"
                    title="Ko'rsatish narxi"
                    className="input-dark w-full pr-12"
                    value={displayFare}
                    onChange={(e) => setDisplayFare(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">so'm</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Boshlash narxi</label>
                <div className="relative">
                  <input
                    type="number"
                    title="Boshlash narxi"
                    className="input-dark w-full pr-12"
                    value={startFare}
                    onChange={(e) => setStartFare(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">so'm</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Minimal to'lov</label>
                <div className="relative">
                  <input
                    type="number"
                    title="Minimal to'lov"
                    className="input-dark w-full pr-12"
                    value={minimumFare}
                    onChange={(e) => setMinimumFare(parseFloat(e.target.value) || 0)}
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">so'm</span>
                </div>
              </div>
            </div>
            {fareError && <p className="text-red-400 text-xs mt-2">{fareError}</p>}
            <div className="flex justify-end mt-3">
              <button
                onClick={saveFares}
                disabled={fareSaving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded-lg disabled:opacity-50"
              >
                {fareSaving ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </div>

          {/* ── Tiers table ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Bosqichli narxlar</h3>
              <button
                onClick={() => { setShowAdd(true); setAddForm(EMPTY_TIER); setAddError(""); }}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg"
              >
                + Bosqich qo'shish
              </button>
            </div>

            {tiers.length === 0 ? (
              <p className="text-gray-500 text-xs py-4 text-center border border-dashed border-gray-700 rounded-lg">
                Hozircha bosqichlar yo'q
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-3 py-2">Dan (km)</th>
                      <th className="px-3 py-2">Gacha (km)</th>
                      <th className="px-3 py-2">Tur</th>
                      <th className="px-3 py-2">Narx</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {tiers.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-gray-300 font-mono">{t.from_km}</td>
                        <td className="px-3 py-2 text-gray-300 font-mono">
                          {t.to_km === null ? <span className="text-gray-500">∞</span> : t.to_km}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                            t.pricing_type === "flat" ? "bg-amber-900/40 text-amber-300" :
                            t.pricing_type === "flat_min" ? "bg-purple-900/40 text-purple-300" :
                            "bg-blue-900/40 text-blue-300"
                          }`}>
                            {t.pricing_type === "flat" ? "Flat (prop)" : t.pricing_type === "flat_min" ? "Flat (min)" : "/km"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white font-medium">
                          {fmt(t.rate)}
                          <span className="text-xs text-gray-500 ml-1">
                            {t.pricing_type === "per_km" ? "so'm/km" : "so'm"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEditTier(t)} className="text-xs text-indigo-400 hover:text-indigo-300">
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteTier(t.id)}
                              disabled={deletingId === t.id}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                            >
                              {deletingId === t.id ? "…" : "🗑"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add tier inline form */}
            {showAdd && (
              <div className="mt-3 p-4 bg-gray-800 border border-gray-600 rounded-lg space-y-3">
                <p className="text-xs text-gray-400 font-semibold">Yangi bosqich</p>
                {addError && <p className="text-red-400 text-xs">{addError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Dan (km)</label>
                    <input
                      type="number"
                      title="Dan (km)"
                      className="input-dark w-full"
                      value={addForm.from_km}
                      min={0}
                      step={0.1}
                      onChange={(e) => setAddForm((p) => ({ ...p, from_km: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Gacha (km) — bo'sh = ∞</label>
                    <input
                      type="number"
                      title="Gacha (km)"
                      className="input-dark w-full"
                      value={addForm.to_km}
                      placeholder="∞"
                      min={0}
                      step={0.1}
                      onChange={(e) => setAddForm((p) => ({ ...p, to_km: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Tur</label>
                    <select
                      title="Pricing type"
                      className="input-dark w-full"
                      value={addForm.pricing_type}
                      onChange={(e) => setAddForm((p) => ({ ...p, pricing_type: e.target.value as "flat" | "flat_min" | "per_km" }))}
                    >
                      <option value="per_km">Har bir km uchun (/km)</option>
                      <option value="flat">Proporsional flat (masofaga qarab)</option>
                      <option value="flat_min">Minimal flat (har doim to'liq)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Narx (so'm)</label>
                    <input
                      type="number"
                      title="Narx"
                      className="input-dark w-full"
                      value={addForm.rate}
                      min={0}
                      onChange={(e) => setAddForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAdd(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5">Bekor</button>
                  <button
                    onClick={addTier}
                    disabled={addSaving}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {addSaving ? "Qo'shilmoqda…" : "Qo'shish"}
                  </button>
                </div>
              </div>
            )}

            {/* Edit tier inline form */}
            {editingTier && (
              <div className="mt-3 p-4 bg-gray-800 border border-indigo-700 rounded-lg space-y-3">
                <p className="text-xs text-gray-400 font-semibold">Bosqichni tahrirlash</p>
                {editError && <p className="text-red-400 text-xs">{editError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Dan (km)</label>
                    <input
                      type="number"
                      title="Dan (km)"
                      className="input-dark w-full"
                      value={editForm.from_km}
                      min={0}
                      step={0.1}
                      onChange={(e) => setEditForm((p) => ({ ...p, from_km: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Gacha (km) — bo'sh = ∞</label>
                    <input
                      type="number"
                      title="Gacha (km)"
                      className="input-dark w-full"
                      value={editForm.to_km}
                      placeholder="∞"
                      min={0}
                      step={0.1}
                      onChange={(e) => setEditForm((p) => ({ ...p, to_km: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Tur</label>
                    <select
                      title="Pricing type"
                      className="input-dark w-full"
                      value={editForm.pricing_type}
                      onChange={(e) => setEditForm((p) => ({ ...p, pricing_type: e.target.value as "flat" | "flat_min" | "per_km" }))}
                    >
                      <option value="per_km">Har bir km uchun (/km)</option>
                      <option value="flat">Proporsional flat (masofaga qarab)</option>
                      <option value="flat_min">Minimal flat (har doim to'liq)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Narx (so'm)</label>
                    <input
                      type="number"
                      title="Narx"
                      className="input-dark w-full"
                      value={editForm.rate}
                      min={0}
                      onChange={(e) => setEditForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingTier(null)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5">Bekor</button>
                  <button
                    onClick={saveEditTier}
                    disabled={editSaving}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {editSaving ? "Saqlanmoqda…" : "Saqlash"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-700">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-white px-5 py-2">
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
