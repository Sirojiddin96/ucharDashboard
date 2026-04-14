"use client";

import { useState } from "react";
import type { ServiceType } from "../../service-types/ServiceTypeList";
import type { Tariff } from "../../tariffs/TariffList";

type Mapping = {
  id: string;
  region_id: string;
  service_type_id: string;
  tariff_id: string | null;
  scat_rate_id: number | null;
  is_active: boolean;
  sort_order: number;
  service_types: Pick<ServiceType, "id" | "name" | "name_uz" | "service_class" | "max_passengers" | "is_active"> | null;
  tariffs: Pick<Tariff, "id" | "name" | "per_km" | "base_fare" | "currency"> | null;
};

const NONE = "none";

export default function MappingsTab({
  regionId,
  initialMappings,
  allServiceTypes,
  allTariffs,
}: {
  regionId: string;
  initialMappings: Mapping[];
  allServiceTypes: ServiceType[];
  allTariffs: Tariff[];
}) {
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);

  // ── Add mapping modal ───────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<{
    service_type_id: string;
    tariff_id: string;
    scat_rate_id: string;
    is_active: boolean;
  }>({ service_type_id: "", tariff_id: NONE, scat_rate_id: "", is_active: true });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // ── Edit mapping modal ──────────────────────────────────────
  const [editing, setEditing] = useState<Mapping | null>(null);
  const [editForm, setEditForm] = useState<{
    tariff_id: string;
    scat_rate_id: string;
    is_active: boolean;
  }>({ tariff_id: NONE, scat_rate_id: "", is_active: true });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // ── Deleting ────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<string | null>(null);

  // Unmapped service types = those not yet in any mapping for this region
  const mappedIds = new Set(mappings.map((m) => m.service_type_id));
  const unmapped = allServiceTypes.filter((st) => !mappedIds.has(st.id));

  async function refresh() {
    const res = await fetch(`/api/settings/region-service-tariffs?region_id=${regionId}`);
    const json = await res.json();
    setMappings(json.mappings ?? []);
  }

  // ── Open add modal ──────────────────────────────────────────
  function openAdd() {
    setAddForm({
      service_type_id: unmapped[0]?.id ?? "",
      tariff_id: allTariffs[0]?.id ?? NONE,
      scat_rate_id: "",
      is_active: true,
    });
    setAddError("");
    setShowAdd(true);
  }

  async function saveAdd() {
    setAddSaving(true); setAddError("");
    try {
      const res = await fetch("/api/settings/region-service-tariffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region_id: regionId,
          service_type_id: addForm.service_type_id,
          tariff_id: addForm.tariff_id === NONE ? null : addForm.tariff_id,
          scat_rate_id: addForm.scat_rate_id ? parseInt(addForm.scat_rate_id) : null,
          is_active: addForm.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
      setShowAdd(false);
      await refresh();
    } finally { setAddSaving(false); }
  }

  // ── Open edit modal ─────────────────────────────────────────
  function openEdit(m: Mapping) {
    setEditing(m);
    setEditForm({
      tariff_id: m.tariff_id ?? NONE,
      scat_rate_id: m.scat_rate_id != null ? String(m.scat_rate_id) : "",
      is_active: m.is_active,
    });
    setEditError("");
  }

  async function saveEdit() {
    if (!editing) return;
    setEditSaving(true); setEditError("");
    try {
      const res = await fetch(`/api/settings/region-service-tariffs/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tariff_id: editForm.tariff_id === NONE ? null : editForm.tariff_id,
          scat_rate_id: editForm.scat_rate_id ? parseInt(editForm.scat_rate_id) : null,
          is_active: editForm.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setEditError(json.error ?? "Failed"); return; }
      setEditing(null);
      await refresh();
    } finally { setEditSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Remove this service from the region?")) return;
    setDeleting(id);
    await fetch(`/api/settings/region-service-tariffs/${id}`, { method: "DELETE" });
    await refresh();
    setDeleting(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          Assign service types and their tariffs to this region. Adding a service type here makes it available for dispatch in this region.
        </p>
        <button
          onClick={openAdd}
          disabled={unmapped.length === 0}
          className="ml-4 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40"
        >
          + Add Service
        </button>
      </div>

      {unmapped.length === 0 && mappings.length > 0 && (
        <p className="text-xs text-gray-500 mb-4">All available service types are already mapped to this region.</p>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Add Service to Region</h2>
            {addError && <p className="text-red-400 text-sm">{addError}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Service Type *</label>
                <select
                  title="Service Type"
                  className="input-dark w-full"
                  value={addForm.service_type_id}
                  onChange={(e) => setAddForm((p) => ({ ...p, service_type_id: e.target.value }))}
                >
                  {unmapped.map((st) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.service_class})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Tariff</label>
                <select
                  title="Tariff"
                  className="input-dark w-full"
                  value={addForm.tariff_id}
                  onChange={(e) => setAddForm((p) => ({ ...p, tariff_id: e.target.value }))}
                >
                  <option value={NONE}>None (assign later)</option>
                  {allTariffs.map((t) => (
                    <option key={t.id} value={t.id}>{t.name || "Unnamed"} — {t.per_km}/km, {t.base_fare} base</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">SCAT Rate ID <span className="text-gray-600">(integer, optional)</span></label>
                <input
                  type="number"
                  title="SCAT Rate ID"
                  placeholder="e.g. 3"
                  className="input-dark w-full"
                  value={addForm.scat_rate_id}
                  onChange={(e) => setAddForm((p) => ({ ...p, scat_rate_id: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-active"
                  checked={addForm.is_active}
                  onChange={(e) => setAddForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                <label htmlFor="add-active" className="text-sm text-gray-300">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
              <button onClick={saveAdd} disabled={addSaving || !addForm.service_type_id} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
                {addSaving ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Edit — {editing.service_types?.name ?? "Service"}
            </h2>
            <p className="text-xs text-gray-500 font-mono">{editing.service_types?.service_class}</p>
            {editError && <p className="text-red-400 text-sm">{editError}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Tariff</label>
                <select
                  title="Tariff"
                  className="input-dark w-full"
                  value={editForm.tariff_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, tariff_id: e.target.value }))}
                >
                  <option value={NONE}>None</option>
                  {allTariffs.map((t) => (
                    <option key={t.id} value={t.id}>{t.name || "Unnamed"} — {t.per_km}/km, {t.base_fare} base</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">SCAT Rate ID <span className="text-gray-600">(integer, optional)</span></label>
                <input
                  type="number"
                  title="SCAT Rate ID"
                  placeholder="e.g. 3"
                  className="input-dark w-full"
                  value={editForm.scat_rate_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, scat_rate_id: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                <label htmlFor="edit-active" className="text-sm text-gray-300">Active in this region</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
              <button onClick={saveEdit} disabled={editSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mappings Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Service Type</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Tariff</th>
              <th className="px-4 py-3">SCAT Rate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {mappings.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-10">
                  No services mapped to this region yet.
                </td>
              </tr>
            )}
            {mappings.map((m) => (
              <tr key={m.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-white">
                  {m.service_types?.name ?? "Unknown"}
                  {m.service_types?.name_uz && (
                    <span className="ml-1 text-xs text-gray-500">{m.service_types.name_uz}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 text-xs font-mono">
                    {m.service_types?.service_class ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {m.tariffs ? (
                    <span className="text-gray-300">
                      {m.tariffs.name || "Unnamed"}
                      <span className="ml-1 text-xs text-gray-500">({m.tariffs.per_km}/km)</span>
                    </span>
                  ) : (
                    <span className="text-yellow-600 text-xs italic">No tariff</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {m.scat_rate_id ?? <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${m.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {m.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)} className="text-xs text-indigo-400 hover:text-indigo-300">Edit</button>
                    <button
                      onClick={() => del(m.id)}
                      disabled={deleting === m.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                    >
                      {deleting === m.id ? "…" : "Remove"}
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
