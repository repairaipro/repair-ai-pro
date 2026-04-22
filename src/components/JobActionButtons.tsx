"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { logJobEvent } from "@/lib/logEvent";

type Props = {
  jobId: string;
  contractorId: string; // kept for UI logic, server trusts auth token
  status: string;
};

export default function JobActionButtons({ jobId, status }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function setStatus(nextStatus: string) {
    if (!user) return;

    setLoading(true);
    setErr("");

    try {
      const token = await user.getIdToken();

      const res = await fetch(`/api/jobs/${jobId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nextStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        const proof = data?.proof;
        if (
          proof &&
          (proof.hasAttachment === false || proof.hasMessage === false)
        ) {
          const parts: string[] = [];
          if (!proof.hasAttachment) parts.push("upload at least 1 attachment");
          if (!proof.hasMessage) parts.push("send at least 1 message");
          throw new Error(
            `Before you can proceed, please ${parts.join(" and ")}.`
          );
        }
        throw new Error(data?.error || "Failed to update status");
      }

      // 🔥 LOG LIFECYCLE EVENTS
      if (nextStatus === "in_progress") {
        await logJobEvent(jobId, user.uid, "job_started", {
          message: "Contractor started the job",
        });
      }

      if (nextStatus === "completed") {
        await logJobEvent(jobId, user.uid, "job_completed_pending", {
          message: "Contractor marked job as completed",
        });
      }

    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="text-sm text-gray-300">
        Contractor actions (hard-gated)
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={loading || status === "in_progress"}
          onClick={() => setStatus("in_progress")}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3 py-2 rounded-md text-xs"
        >
          {loading ? "..." : "Start Work (in_progress)"}
        </button>

        <button
          disabled={loading || status === "completed"}
          onClick={() => setStatus("completed")}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-2 rounded-md text-xs"
        >
          {loading ? "..." : "Mark Completed"}
        </button>
      </div>

      {err ? <div className="text-xs text-red-400">{err}</div> : null}

      <div className="text-[11px] text-gray-500">
        You must upload at least 1 attachment and send at least 1 message before
        starting/completing work.
      </div>
    </div>
  );
}