"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  status: string;
};

export default function ReviewActions({ id, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending") return null;

  async function updateStatus(newStatus: "approved" | "rejected") {
    setLoading(newStatus);
    setError(null);

    try {
      const res = await fetch(`/api/driver-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Something went wrong");
        return;
      }

      router.push("/driver-applications");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Review
      </h2>
      <div className="flex gap-3">
        <button
          onClick={() => updateStatus("approved")}
          disabled={loading !== null}
          className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading === "approved" ? "Processing…" : "Approve"}
        </button>
        <button
          onClick={() => updateStatus("rejected")}
          disabled={loading !== null}
          className="px-5 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading === "rejected" ? "Processing…" : "Reject"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
