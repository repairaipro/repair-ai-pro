"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { logJobEvent } from "@/lib/logEvent";

type Props = {
  jobId: string;
  contractorId: string;
};

export default function AcceptJobButton({ jobId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function acceptJob() {
    if (!user) {
      setError("You must be signed in.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 🔑 REQUIRED for server enforcement
      const token = await user.getIdToken();

      const res = await fetch(`/api/jobs/${jobId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to accept job");
      }

      // 🔥 LOG EVENT (only after success)
      await logJobEvent(jobId, user.uid, "job_accepted", {
        message: "Contractor accepted the job",
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-600/20 border border-green-600 text-green-300 px-4 py-2 rounded-md text-sm">
        ✅ Job accepted successfully
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={acceptJob}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-semibold transition"
      >
        {loading ? "Accepting…" : "Accept Job"}
      </button>

      {error && (
        <div className="text-xs text-red-400 bg-red-600/10 border border-red-600/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}