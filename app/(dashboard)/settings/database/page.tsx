"use client";

import { useState, useEffect } from "react";

interface ConnectionStatus {
  connected: boolean;
  supabase_url?: string;
  supabase_anon_key?: string;
  status?: string;
  connected_at?: string;
}

export default function DatabaseSettingsPage() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/settings/tenant-database")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        if (data.connected) {
          setSupabaseUrl(data.supabase_url ?? "");
          setAnonKey(data.supabase_anon_key ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const res = await fetch("/api/settings/tenant-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supabaseUrl, serviceKey, anonKey }),
    });

    const data = await res.json();
    if (res.ok) {
      setSuccess("Database connected successfully.");
      setServiceKey(""); // clear sensitive field
      setStatus({ connected: true, supabase_url: supabaseUrl, status: "active" });
    } else {
      setError(data.error ?? "Failed to save connection");
    }
    setSaving(false);
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect this database? The dashboard will fall back to the platform database.")) return;
    setError("");
    const res = await fetch("/api/settings/tenant-database", { method: "DELETE" });
    if (res.ok) {
      setStatus({ connected: false });
      setSupabaseUrl("");
      setServiceKey("");
      setAnonKey("");
      setSuccess("Database disconnected.");
    } else {
      setError("Failed to disconnect.");
    }
  }

  if (loading) {
    return <p className="text-gray-400 text-sm">Loading…</p>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Database Connection</h2>
        <p className="text-sm text-gray-400 mt-1">
          Connect your organization&apos;s own Supabase project. Each organization
          gets fully isolated data.
        </p>
      </div>

      {/* Current status badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            status?.connected
              ? "bg-green-950/50 border border-green-800 text-green-400"
              : "bg-gray-800 border border-gray-700 text-gray-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${status?.connected ? "bg-green-400" : "bg-gray-500"}`}
          />
          {status?.connected ? "Connected" : "Not connected"}
        </span>
        {status?.connected && status.supabase_url && (
          <span className="text-gray-500 text-xs truncate">{status.supabase_url}</span>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-400">
        <p className="text-gray-300 font-medium text-xs uppercase tracking-wider">Setup steps</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Create a new Supabase project at <span className="text-indigo-400">supabase.com</span></li>
          <li>Run the provided migration SQL in the Supabase SQL Editor</li>
          <li>Copy your project URL and service role key below</li>
        </ol>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Project URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            required
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Service Role Key <span className="text-red-400">*</span>
            <span className="text-gray-600 ml-1 text-xs">(stored encrypted)</span>
          </label>
          <input
            type="password"
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            required={!status?.connected}
            placeholder={status?.connected ? "Leave blank to keep existing key" : "eyJhbGci…"}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Anon Key <span className="text-gray-600 text-xs">(optional — for realtime)</span>
          </label>
          <input
            type="text"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJhbGci…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-400 text-sm bg-green-950/40 border border-green-800 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {saving ? "Verifying & saving…" : status?.connected ? "Update connection" : "Connect database"}
          </button>

          {status?.connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
