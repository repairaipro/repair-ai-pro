"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────────────────────── */

type InboxItem = {
  id: string;
  jobId: string;
  invitationStatus: "pending" | "accepted" | "declined" | "closed";
  invitedAt?: { toDate?: () => Date } | Date;
  auto?: boolean;
};

type JobData = {
  description: string;
  trade?: string;
  location?: string | { city?: string };
  status?: string;
  aiSummary?: string;
  createdAt?: { toDate?: () => Date };
};

type InboxEntry = InboxItem & { job: JobData | null; actionLoading?: boolean };

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getCity(location: JobData["location"]): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.city ?? "";
}

function formatDate(ts: InboxItem["invitedAt"]): string {
  try {
    const d = typeof (ts as any)?.toDate === "function"
      ? (ts as any).toDate()
      : ts instanceof Date ? ts : null;
    if (!d) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-900/40 text-amber-300 border-amber-700",
  accepted: "bg-green-900/40 text-green-300 border-green-700",
  declined: "bg-gray-800 text-gray-500 border-gray-700",
  closed:   "bg-gray-800 text-gray-500 border-gray-700",
};

const TRADE_ICONS: Record<string, string> = {
  Plumbing: "🔧", Electrical: "⚡", HVAC: "❄️", Carpentry: "🪚",
  Roofing: "🏠", Appliance: "🍳", Handyman: "🛠", General: "⚙️",
  Painting: "🎨", Landscaping: "🌿",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />;
}

function InboxSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export default function ContractorInvitationInbox() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");

  /* ── Load inbox + hydrate job data ─────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "contractors", user.uid, "jobInbox"),
      orderBy("invitedAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const items: InboxItem[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InboxItem));

      // Fetch job data for each inbox item (parallel)
      const hydrated = await Promise.all(
        items.map(async (item): Promise<InboxEntry> => {
          try {
            const jobSnap = await getDoc(doc(db, "jobs", item.jobId));
            return { ...item, job: jobSnap.exists() ? (jobSnap.data() as JobData) : null };
          } catch {
            return { ...item, job: null };
          }
        })
      );

      setEntries(hydrated);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  /* ── Accept / Decline ───────────────────────────────────────────────── */
  async function handleAction(jobId: string, type: "accept" | "decline") {
    if (!user) return;

    // Optimistic UI update
    setEntries((prev) =>
      prev.map((e) =>
        e.jobId === jobId ? { ...e, actionLoading: true } : e
      )
    );

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/${type}-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Action failed");
      }

      // Optimistic status update (Firestore listener will confirm)
      setEntries((prev) =>
        prev.map((e) =>
          e.jobId === jobId
            ? { ...e, invitationStatus: type === "accept" ? "accepted" : "declined", actionLoading: false }
            : e
        )
      );
    } catch (err: any) {
      console.error(`${type} failed:`, err);
      setEntries((prev) =>
        prev.map((e) =>
          e.jobId === jobId ? { ...e, actionLoading: false } : e
        )
      );
      alert(err.message ?? "Something went wrong. Please try again.");
    }
  }

  /* ── Auth guard ─────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
        Sign in to view your job invitations.
      </div>
    );
  }

  /* ── Filter ─────────────────────────────────────────────────────────── */
  const filtered = filter === "all" ? entries : entries.filter((e) => e.invitationStatus === filter);
  const pendingCount = entries.filter((e) => e.invitationStatus === "pending").length;

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "accepted", "declined"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
            {f === "all" && (
              <span className="ml-1.5 text-gray-600 text-xs">{entries.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <InboxSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center space-y-3">
          <div className="text-5xl">
            {filter === "pending" ? "📭" : filter === "accepted" ? "✅" : "📬"}
          </div>
          <h3 className="font-semibold text-white">
            {filter === "all" ? "No invitations yet" :
             filter === "pending" ? "No pending invitations" :
             filter === "accepted" ? "No accepted jobs yet" :
             "No declined invitations"}
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            {filter === "all"
              ? "When homeowners post jobs that match your trade and location, invitations will appear here."
              : "Switch to 'All' to see your full history."}
          </p>
          {filter === "all" && (
            <p className="text-xs text-gray-600">
              Make sure your{" "}
              <Link href="/contractor-profile" className="text-indigo-400 hover:text-indigo-300 underline">
                profile is complete
              </Link>{" "}
              and your availability is set to active.
            </p>
          )}
        </div>
      )}

      {/* Invitation cards */}
      {!loading && filtered.map((entry) => {
        const trade = entry.job?.trade ?? "General";
        const city = getCity(entry.job?.location);
        const isPending = entry.invitationStatus === "pending";
        const isAccepted = entry.invitationStatus === "accepted";
        const statusStyle = STATUS_STYLES[entry.invitationStatus] ?? STATUS_STYLES.pending;

        return (
          <div
            key={entry.id}
            className={`bg-gray-900 border rounded-xl p-5 transition ${
              isPending ? "border-amber-800/50 hover:border-amber-700" : "border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{TRADE_ICONS[trade] ?? "🔧"}</span>
                <div>
                  <h3 className="font-semibold text-white">
                    {trade} Repair
                  </h3>
                  {city && (
                    <p className="text-xs text-gray-500 mt-0.5">📍 {city}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle}`}>
                  {entry.invitationStatus.toUpperCase()}
                </span>
                {entry.auto && (
                  <span className="text-[9px] text-gray-600 font-medium">AUTO-MATCHED</span>
                )}
              </div>
            </div>

            {/* Job description */}
            {entry.job ? (
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                  {entry.job.aiSummary ?? entry.job.description}
                </p>
                {entry.invitedAt && (
                  <p className="text-xs text-gray-600">
                    Invited {formatDate(entry.invitedAt)}
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-600 italic">Job details unavailable</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {isPending ? (
                <>
                  <button
                    onClick={() => handleAction(entry.jobId, "accept")}
                    disabled={entry.actionLoading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    {entry.actionLoading ? (
                      <span className="animate-spin">⏳</span>
                    ) : "✓"} Accept Job
                  </button>
                  <button
                    onClick={() => handleAction(entry.jobId, "decline")}
                    disabled={entry.actionLoading}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 text-gray-300 text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    {entry.actionLoading ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : "✕"} Decline
                  </button>
                </>
              ) : isAccepted ? (
                <Link
                  href={`/chat?job=${entry.jobId}`}
                  className="flex-1 bg-green-900/40 hover:bg-green-900/60 border border-green-700 text-green-300 text-sm font-medium py-2.5 rounded-lg transition text-center"
                >
                  💬 Open Job Chat →
                </Link>
              ) : (
                <div className="flex-1 bg-gray-800/50 border border-gray-700 text-gray-500 text-sm py-2.5 rounded-lg text-center">
                  {entry.invitationStatus === "declined" ? "Declined" : "Closed"}
                </div>
              )}

              {/* View details always available if job exists */}
              {entry.job && (
                <Link
                  href={`/chat?job=${entry.jobId}`}
                  className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition"
                  title="View job details"
                >
                  🔍
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
