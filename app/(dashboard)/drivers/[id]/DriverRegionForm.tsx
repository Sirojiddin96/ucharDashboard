"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SERVICE_CLASSES = [
  "economy",
  "standard",
  "comfort",
  "business",
  "minivan",
  "cargo",
  "intercity",
] as const;

interface Region {
  id: string;
  name: string;
}

interface Props {
  driverId: string;
  currentRegionId: string | null;
  currentServiceClass: string | null;
  regions: Region[];
}

export default function DriverRegionForm({
  driverId,
  currentRegionId,
  currentServiceClass,
  regions,
}: Props) {
  const router = useRouter();
  const [regionId, setRegionId] = useState(currentRegionId ?? "");
  const [serviceClass, setServiceClass] = useState(currentServiceClass ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    regionId !== (currentRegionId ?? "") ||
    serviceClass !== (currentServiceClass ?? "");

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/drivers/${driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region_id: regionId || null,
          service_class: serviceClass || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 pt-2 border-t border-gray-800 mt-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Region & Service
      </p>

      <div className="flex flex-col gap-2">
        {/* Region */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Region</label>
          <select
            title="Not assigned"
            value={regionId}
            onChange={(e) => { setRegionId(e.target.value); setSaved(false); }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">— Not assigned —</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Service class */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Service class</label>
          <select
            title="Any class"
            value={serviceClass}
            onChange={(e) => { setServiceClass(e.target.value); setSaved(false); }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">— Any class —</option>
            {SERVICE_CLASSES.map((sc) => (
              <option key={sc} value={sc}>
                {sc.charAt(0).toUpperCase() + sc.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-colors font-medium"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span className="text-xs text-green-400">✓ Saved</span>
        )}
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    </div>
  );
}
