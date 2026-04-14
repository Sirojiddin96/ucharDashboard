"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  service_class?: string;
  is_active?: boolean;
};

export default function DriversTab({ regionId, initialDrivers }: { regionId: string; initialDrivers: Driver[] }) {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Driver[]>([]);
  const [searching, setSearching] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function refreshList() {
    const res = await fetch(`/api/settings/drivers?region_id=${regionId}`);
    const json = await res.json();
    setDrivers(json.drivers ?? []);
  }

  async function searchDrivers() {
    if (!search.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/settings/drivers?q=${encodeURIComponent(search)}&exclude_region=${regionId}`);
    const json = await res.json();
    setSearchResults(json.drivers ?? []);
    setSearching(false);
  }

  async function assignDriver(driverId: string) {
    setAssigning(driverId);
    await fetch(`/api/drivers/${driverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region_id: regionId }),
    });
    await refreshList();
    setSearchResults((prev) => prev.filter((d) => d.id !== driverId));
    setAssigning(null);
    router.refresh();
  }

  async function removeDriver(driverId: string) {
    if (!confirm("Remove this driver from the region?")) return;
    setRemoving(driverId);
    await fetch(`/api/drivers/${driverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region_id: null }),
    });
    setDrivers((prev) => prev.filter((d) => d.id !== driverId));
    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Search & assign */}
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-sm text-gray-400 mb-3">Search drivers by name or phone to assign them to this region:</p>
        <div className="flex gap-2">
          <input
            className="input-dark flex-1"
            placeholder="Name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchDrivers()}
          />
          <button onClick={searchDrivers} disabled={searching} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            {searching ? "…" : "Search"}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-gray-750 border border-gray-700 rounded-lg px-3 py-2">
                <div>
                  <span className="text-white text-sm">{d.full_name}</span>
                  <span className="text-gray-400 text-xs ml-2">{d.phone}</span>
                  {d.service_class && <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-indigo-900 text-indigo-300">{d.service_class}</span>}
                </div>
                <button onClick={() => assignDriver(d.id)} disabled={assigning === d.id} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded disabled:opacity-50">
                  {assigning === d.id ? "…" : "Assign"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned drivers */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300">Assigned Drivers ({drivers.length})</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Service Class</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-8">No drivers assigned to this region.</td></tr>}
            {drivers.map((d) => (
              <tr key={d.id} className="border-b border-gray-700/50 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/drivers/${d.id}`} className="text-white hover:text-indigo-400">{d.full_name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-400">{d.phone}</td>
                <td className="px-4 py-3">
                  {d.service_class
                    ? <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-900 text-indigo-300">{d.service_class}</span>
                    : <span className="text-gray-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${d.is_active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {d.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => removeDriver(d.id)} disabled={removing === d.id} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">
                    {removing === d.id ? "…" : "Remove"}
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
