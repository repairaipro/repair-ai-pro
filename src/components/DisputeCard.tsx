"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

const DISPUTE_CATEGORIES = [
  { value: "work_not_completed",  label: "Work not completed",        icon: "🚫" },
  { value: "work_done_incorrectly", label: "Work done incorrectly",   icon: "❌" },
  { value: "contractor_no_show",  label: "Contractor no-show",        icon: "👻" },
  { value: "safety_concern",      label: "Safety concern",            icon: "⚠️" },
  { value: "overcharged",         label: "Price dispute / overcharged", icon: "💸" },
  { value: "other",               label: "Other",                     icon: "📝" },
];

type View = "idle" | "dispute" | "cancel" | "submitted" | "cancelled";

type Props = {
  jobId:           string;
  jobStatus:       string;
  isHomeowner:     boolean;
  isContractor:    boolean;
  onStatusChange?: () => void;
};

export default function DisputeCard({
  jobId,
  jobStatus,
  isHomeowner,
  isContractor,
  onStatusChange,
}: Props) {
  const { user }                 = useAuth();
  const [view,      setView]     = useState<View>("idle");
  const [category,  setCategory] = useState("");
  const [description, setDesc]   = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState<string | null>(null);

  if (!user) return null;

  // Already in a terminal state
  if (jobStatus === "disputed") {
    return (
      <div className="rounded-2xl border border-orange-700/40 bg-orange-950/20 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-orange-400">Dispute Open</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Payment is frozen. Our team is reviewing the case and will reach out to both parties.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (jobStatus === "cancelled") {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚫</span>
          <div>
            <p className="text-sm font-semibold text-gray-400">Job Cancelled</p>
            <p className="text-xs text-gray-500 mt-0.5">Any held payment will be refunded within 5–10 business days.</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === "submitted") {
    return (
      <div className="rounded-2xl border border-orange-700/40 bg-orange-950/20 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-orange-300">Dispute Submitted</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Payment is now frozen. Both parties have been notified. Our team will review and reach out.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (view === "cancelled") {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚫</span>
          <div>
            <p className="text-sm font-semibold text-gray-400">Job Cancelled</p>
            <p className="text-xs text-gray-500 mt-0.5">Any held payment will be refunded within 5–10 business days.</p>
          </div>
        </div>
      </div>
    );
  }

  async function submitDispute() {
    if (!category || !description.trim() || !user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/dispute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ category, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit dispute");
      setView("submitted");
      onStatusChange?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCancellation() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res   = await fetch(`/api/jobs/${jobId}/cancel`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel job");
      setView("cancelled");
      onStatusChange?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Who can cancel?
  const homeownerCanCancel  = isHomeowner  && ["triaged", "accepted"].includes(jobStatus);
  const contractorCanCancel = isContractor && ["accepted"].includes(jobStatus);
  const canCancel = homeownerCanCancel || contractorCanCancel;

  // Who can dispute?
  const canDispute = ["accepted", "in_progress", "completed"].includes(jobStatus);

  if (!canDispute && !canCancel) return null;

  /* ── Idle: show action buttons ──────────────────────────────────────────── */
  if (view === "idle") {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Need help?</p>
        <div className="flex flex-wrap gap-2">
          {canDispute && (
            <button
              onClick={() => setView("dispute")}
              className="flex items-center gap-1.5 text-xs text-orange-400 border border-orange-800/60 hover:border-orange-600 bg-orange-950/20 hover:bg-orange-950/40 px-3 py-2 rounded-xl transition"
            >
              ⚠️ Open Dispute
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setView("cancel")}
              className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white bg-transparent px-3 py-2 rounded-xl transition"
            >
              🚫 Cancel Job
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── Dispute form ───────────────────────────────────────────────────────── */
  if (view === "dispute") {
    return (
      <div className="rounded-2xl border border-orange-700/40 bg-orange-950/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-orange-400">Open a Dispute</p>
          <button onClick={() => { setView("idle"); setError(null); }} className="text-gray-500 hover:text-white text-xs">Cancel</button>
        </div>

        <p className="text-xs text-gray-500">
          Submitting a dispute freezes payment and notifies both parties. Use this if you cannot resolve the issue through chat.
        </p>

        {/* Category */}
        <div className="grid grid-cols-2 gap-2">
          {DISPUTE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-left p-2.5 rounded-xl border text-xs transition ${
                category === c.value
                  ? "border-orange-500 bg-orange-950/40 text-orange-300"
                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500"
              }`}
            >
              <span className="mr-1.5">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Describe what happened in detail…"
          rows={4}
          className="w-full bg-gray-900 border border-gray-700 focus:border-orange-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
        />

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={submitDispute}
          disabled={!category || description.trim().length < 20 || loading}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition text-sm"
        >
          {loading ? "Submitting…" : "Submit Dispute"}
        </button>
        <p className="text-[10px] text-gray-600 text-center">Minimum 20 characters required</p>
      </div>
    );
  }

  /* ── Cancellation form ──────────────────────────────────────────────────── */
  if (view === "cancel") {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Cancel Job</p>
          <button onClick={() => { setView("idle"); setError(null); }} className="text-gray-500 hover:text-white text-xs">Back</button>
        </div>

        <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-3 py-2.5">
          <p className="text-xs text-yellow-400 font-medium">Before you cancel</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isHomeowner
              ? "Any held payment will be fully refunded. The contractor will be notified."
              : "The homeowner will be notified and any held payment will be fully refunded."}
          </p>
        </div>

        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Reason for cancellation (optional)…"
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none resize-none"
        />

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={submitCancellation}
          disabled={loading}
          className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition text-sm"
        >
          {loading ? "Cancelling…" : "Confirm Cancellation"}
        </button>
      </div>
    );
  }

  return null;
}
