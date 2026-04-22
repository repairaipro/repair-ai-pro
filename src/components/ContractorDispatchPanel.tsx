"use client";

import { useState } from "react";

type Props = {
  jobId: string;
};

export default function ContractorDispatchPanel({ jobId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function runBroadcast() {
    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/broadcast-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Broadcast failed");
      }

      setResult(`Broadcasted to ${data.matchedCount} contractor(s).`);
    } catch (err: any) {
      setResult(err?.message || "Broadcast failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
      <div className="text-sm font-semibold text-indigo-300">
        Smart Contractor Dispatch
      </div>

      <button
        onClick={runBroadcast}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 rounded-md text-sm"
      >
        {loading ? "Dispatching..." : "Broadcast Job"}
      </button>

      {result && <div className="text-xs text-gray-300">{result}</div>}
    </div>
  );
}