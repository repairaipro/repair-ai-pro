"use client";

import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";

type Dispute = {
  id:           string;
  jobId:        string;
  reporterId:   string;
  reporterRole: string;
  category:     string;
  description:  string;
  status:       "open" | "under_review" | "resolved";
  resolution?:  string;
  adminNote?:   string;
  createdAt?:   any;
  resolvedAt?:  any;
};

const CATEGORY_LABEL: Record<string, string> = {
  work_not_completed:   "Work not completed",
  work_done_incorrectly:"Work done incorrectly",
  contractor_no_show:   "Contractor no-show",
  safety_concern:       "Safety concern",
  overcharged:          "Price dispute",
  other:                "Other",
};

const RESOLUTION_OPTIONS = [
  { value: "contractor_fault", label: "Contractor Fault",  desc: "Refund homeowner",          color: "bg-red-600 hover:bg-red-500" },
  { value: "owner_fault",      label: "Owner Fault",       desc: "Release to contractor",      color: "bg-blue-600 hover:bg-blue-500" },
  { value: "mutual",           label: "Mutual",            desc: "Manual resolution",          color: "bg-yellow-600 hover:bg-yellow-500" },
  { value: "invalid",          label: "Invalid / Dismiss", desc: "Restore job to in_progress", color: "bg-gray-600 hover:bg-gray-500" },
];

function timeAgo(ts: any): string {
  try {
    const d = ts?.toDate?.() ?? (ts instanceof Date ? ts : null);
    if (!d) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

export default function AdminDisputesPage() {
  const { user }                = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filter,   setFilter]   = useState<"open" | "resolved" | "all">("open");
  const [resolving, setResolving] = useState<string | null>(null); // dispute id being resolved
  const [adminNote,  setAdminNote] = useState("");
  const [loading,   setLoading]  = useState<string | null>(null);
  const [error,     setError]    = useState<string | null>(null);

  useEffect(() => {
    const q = collectionGroup(db, "disputes");
    const unsub = onSnapshot(q, (snap) => {
      setDisputes(
        snap.docs.map((d) => ({
          id:         d.id,
          jobId:      d.ref.parent.parent?.id ?? "",
          ...(d.data() as any),
        }))
      );
    });
    return () => unsub();
  }, []);

  async function resolve(dispute: Dispute, resolution: string) {
    if (!user) return;
    setLoading(dispute.id);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/resolve-dispute", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ jobId: dispute.jobId, disputeId: dispute.id, resolution, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resolve");
      setResolving(null);
      setAdminNote("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  const filtered = disputes.filter((d) =>
    filter === "all" ? true : filter === "open" ? d.status !== "resolved" : d.status === "resolved"
  );

  const openCount = disputes.filter((d) => d.status !== "resolved").length;

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Disputes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount > 0
              ? `${openCount} open dispute${openCount > 1 ? "s" : ""} need attention`
              : "No open disputes"}
          </p>
        </div>
        <div className="flex gap-2">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                filter === f ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">✅</p>
          <p className="text-gray-400 text-sm">No {filter === "all" ? "" : filter} disputes</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className={`rounded-2xl border p-5 space-y-4 ${
              d.status === "resolved"
                ? "border-gray-800 bg-gray-900/50"
                : "border-orange-700/40 bg-orange-950/10"
            }`}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    d.status === "resolved" ? "bg-gray-700 text-gray-300" : "bg-orange-500/20 text-orange-400"
                  }`}>
                    {d.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                  <span className="text-xs text-gray-500">{timeAgo(d.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Job: <span className="text-indigo-400 font-mono text-[11px]">{d.jobId}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Reported by</p>
                <p className="text-xs font-medium text-white capitalize">{d.reporterRole}</p>
              </div>
            </div>

            {/* Category + description */}
            <div className="bg-gray-900 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-orange-400">
                {CATEGORY_LABEL[d.category] ?? d.category}
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">{d.description}</p>
            </div>

            {/* Resolved state */}
            {d.status === "resolved" && (
              <div className="bg-green-950/20 border border-green-800/30 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-green-400">
                  Resolution: <span className="capitalize">{d.resolution?.replace(/_/g, " ")}</span>
                </p>
                {d.adminNote && <p className="text-xs text-gray-400">Note: {d.adminNote}</p>}
              </div>
            )}

            {/* Resolution panel */}
            {d.status !== "resolved" && (
              resolving === d.id ? (
                <div className="space-y-3">
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Admin note (optional — shown to both parties)…"
                    rows={2}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => resolve(d, opt.value)}
                        disabled={loading === d.id}
                        className={`${opt.color} disabled:opacity-50 text-white rounded-xl px-3 py-2.5 text-xs font-semibold transition text-left`}
                      >
                        <p>{opt.label}</p>
                        <p className="text-[10px] opacity-70 font-normal mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setResolving(null); setAdminNote(""); setError(null); }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResolving(d.id)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Resolve Dispute →
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
