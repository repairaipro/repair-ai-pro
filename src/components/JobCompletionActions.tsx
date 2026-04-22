"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { logJobEvent } from "@/lib/logEvent";

type Props = {
  jobId: string;
  status: string;
  userId: string;         // homeowner uid
  contractorId?: string;  // claimedBy uid
};

type ActionState = "idle" | "loading" | "done" | "error";

const STAGE_ORDER = ["accepted", "in_progress", "completed", "confirmed"];

function StageBar({ status }: { status: string }) {
  const idx = STAGE_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-0 mb-4">
      {STAGE_ORDER.map((s, i) => {
        const done    = i < idx;
        const current = i === idx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition
                ${done    ? "bg-indigo-600 border-indigo-500 text-white" :
                  current ? "bg-indigo-900 border-indigo-400 text-indigo-300 ring-2 ring-indigo-500/40" :
                            "bg-gray-800 border-gray-700 text-gray-600"}`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] mt-1 font-medium whitespace-nowrap
                ${current ? "text-indigo-400" : done ? "text-gray-500" : "text-gray-700"}`}>
                {s === "accepted"    ? "Accepted"   :
                 s === "in_progress" ? "In Progress":
                 s === "completed"   ? "Complete"   : "Confirmed"}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-3 transition ${i < idx ? "bg-indigo-600" : "bg-gray-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function JobCompletionActions({ jobId, status, userId, contractorId }: Props) {
  const { user } = useAuth();
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorMsg,    setErrorMsg]    = useState("");

  if (!user) return null;

  const isOwner      = user.uid === userId;
  const isContractor = !!contractorId && user.uid === contractorId;

  // Only show for active-lifecycle statuses
  if (!STAGE_ORDER.includes(status)) return null;

  async function advance(nextStatus: string) {
    if (!user) return;
    setActionState("loading");
    setErrorMsg("");

    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/progress`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Action failed");

      await logJobEvent(jobId, user.uid, "status_change" as any, {
        from: status,
        to:   nextStatus,
      });

      setActionState("done");
      // Reset after a moment so the updated status from Firestore takes over
      setTimeout(() => setActionState("idle"), 2000);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Something went wrong");
      setActionState("error");
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
      <StageBar status={status} />

      {/* ── CONTRACTOR actions ─────────────────────────────────────────────── */}
      {isContractor && (
        <>
          {status === "accepted" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                When you arrive and begin work, tap the button below so the homeowner knows you've started.
              </p>
              <button
                onClick={() => advance("in_progress")}
                disabled={actionState === "loading"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {actionState === "loading"
                  ? <><span className="animate-spin">⏳</span> Starting…</>
                  : "🔧 Start Job"}
              </button>
            </div>
          )}

          {status === "in_progress" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                When work is done, mark it complete. The homeowner will be asked to confirm.
              </p>
              <button
                onClick={() => advance("completed")}
                disabled={actionState === "loading"}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {actionState === "loading"
                  ? <><span className="animate-spin">⏳</span> Submitting…</>
                  : "✅ Mark as Complete"}
              </button>
            </div>
          )}

          {status === "completed" && (
            <div className="bg-amber-950/40 border border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-300">
              ⏳ Waiting for the homeowner to confirm your work is done.
            </div>
          )}

          {status === "confirmed" && (
            <div className="bg-green-950/40 border border-green-800 rounded-lg px-4 py-3 text-sm text-green-300">
              🎉 Job confirmed! The homeowner accepted your work. A review may follow.
            </div>
          )}
        </>
      )}

      {/* ── HOMEOWNER actions ──────────────────────────────────────────────── */}
      {isOwner && (
        <>
          {status === "accepted" && (
            <div className="bg-indigo-950/40 border border-indigo-800 rounded-lg px-4 py-3 text-sm text-indigo-300">
              👷 Your contractor has accepted the job. They'll mark it started when they begin work.
            </div>
          )}

          {status === "in_progress" && (
            <div className="bg-orange-950/40 border border-orange-800 rounded-lg px-4 py-3 text-sm text-orange-300">
              🔨 Work is in progress. You'll be notified when the contractor marks it complete.
            </div>
          )}

          {status === "completed" && (
            <div className="space-y-3">
              <div className="bg-amber-950/40 border border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-300">
                🔔 Your contractor says the work is done. Please review and confirm.
              </div>
              <button
                onClick={() => advance("confirmed")}
                disabled={actionState === "loading"}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {actionState === "loading"
                  ? <><span className="animate-spin">⏳</span> Confirming…</>
                  : "✅ Confirm Work is Done"}
              </button>
            </div>
          )}

          {status === "confirmed" && (
            <div className="bg-green-950/40 border border-green-800 rounded-lg px-4 py-3 text-sm text-green-300">
              🎉 You've confirmed the job is complete. Leave a review below to help other homeowners.
            </div>
          )}
        </>
      )}

      {/* ── Status messages ────────────────────────────────────────────────── */}
      {actionState === "done" && (
        <p className="text-xs text-green-400 text-center">✓ Status updated successfully</p>
      )}
      {actionState === "error" && (
        <p className="text-xs text-red-400 text-center">{errorMsg}</p>
      )}
    </div>
  );
}
