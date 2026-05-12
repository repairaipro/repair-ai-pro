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
import { useToast } from "@/components/ToastProvider";
import { BidPackModal } from "@/components/BidPackModal";

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
  estimatedValue?: number;
  createdAt?: { toDate?: () => Date };
};

type BidState = {
  open: boolean;
  amount: string;
  message: string;
  etaDays: string;
  submitting: boolean;
  submitted: boolean;
  submittedAmount?: number;
  error?: string;
};

type InboxEntry = InboxItem & {
  job: JobData | null;
  actionLoading?: boolean;
  bid?: BidState;
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function getCity(location: JobData["location"]): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.city ?? "";
}

function formatDate(ts: InboxItem["invitedAt"]): string {
  try {
    const d =
      typeof (ts as any)?.toDate === "function"
        ? (ts as any).toDate()
        : ts instanceof Date
        ? ts
        : null;
    if (!d) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const TRADE_ICONS: Record<string, string> = {
  Plumbing: "🔧",
  Electrical: "⚡",
  HVAC: "❄️",
  Carpentry: "🪚",
  Roofing: "🏠",
  Appliance: "🍳",
  Handyman: "🛠",
  General: "⚙️",
  Painting: "🎨",
  Landscaping: "🌿",
};

const ETA_OPTIONS = [
  { label: "Same day", value: "0" },
  { label: "1 day", value: "1" },
  { label: "2–3 days", value: "2" },
  { label: "Within a week", value: "7" },
  { label: "1–2 weeks", value: "10" },
];

function defaultBid(): BidState {
  return {
    open: false,
    amount: "",
    message: "",
    etaDays: "2",
    submitting: false,
    submitted: false,
  };
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div
      className="rounded-xl p-5 space-y-3 animate-pulse"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex justify-between items-start">
        <div className="h-4 w-32 rounded" style={{ background: "var(--color-surface-2)" }} />
        <div className="h-4 w-16 rounded-full" style={{ background: "var(--color-surface-2)" }} />
      </div>
      <div className="h-3 w-full rounded" style={{ background: "var(--color-surface-2)" }} />
      <div className="h-3 w-2/3 rounded" style={{ background: "var(--color-surface-2)" }} />
      <div className="flex gap-2 pt-2">
        <div className="h-10 flex-1 rounded-lg" style={{ background: "var(--color-surface-2)" }} />
        <div className="h-10 w-20 rounded-lg" style={{ background: "var(--color-surface-2)" }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "AWAITING BIDS" },
    accepted: { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", label: "ACCEPTED" },
    declined: { bg: "rgba(107,114,128,0.15)", color: "var(--color-text-4)", label: "DECLINED" },
    closed:   { bg: "rgba(107,114,128,0.15)", color: "var(--color-text-4)", label: "CLOSED" },
  };
  const c = configs[status] ?? configs.pending;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.05em",
        padding: "3px 10px",
        borderRadius: 9999,
        border: `1px solid ${c.color}40`,
      }}
    >
      {c.label}
    </span>
  );
}

function BidSubmittedBadge({ amount }: { amount: number }) {
  return (
    <div
      style={{
        background: "rgba(99,102,241,0.12)",
        border: "1px solid rgba(99,102,241,0.3)",
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 20 }}>🎯</span>
      <div>
        <p style={{ color: "#818cf8", fontWeight: 700, fontSize: 14 }}>
          Bid Submitted — ${amount.toFixed(2)}
        </p>
        <p style={{ color: "var(--color-text-4)", fontSize: 12, marginTop: 2 }}>
          Waiting for homeowner to review bids
        </p>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

export default function ContractorInvitationInbox() {
  const { user }    = useAuth();
  const { addToast } = useToast();
  const [entries,     setEntries]     = useState<InboxEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<"all" | "pending" | "accepted" | "declined">("all");
  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState<"newest" | "oldest" | "value">("newest");
  const [bidPackEntry, setBidPackEntry] = useState<InboxEntry | null>(null);

  /* ── Load inbox + hydrate job data ─────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "contractors", user.uid, "jobInbox"),
      orderBy("invitedAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const items: InboxItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as InboxItem));

      const hydrated = await Promise.all(
        items.map(async (item): Promise<InboxEntry> => {
          try {
            const [jobSnap, bidSnap] = await Promise.all([
              getDoc(doc(db, "jobs", item.jobId)),
              getDoc(doc(db, "jobs", item.jobId, "bids", user.uid)),
            ]);
            const existingBid = bidSnap.exists() ? (bidSnap.data() as any) : null;
            const bid: BidState = existingBid
              ? {
                  ...defaultBid(),
                  submitted: true,
                  submittedAmount: existingBid.amount,
                }
              : defaultBid();
            return {
              ...item,
              job: jobSnap.exists() ? (jobSnap.data() as JobData) : null,
              bid,
            };
          } catch {
            return { ...item, job: null, bid: defaultBid() };
          }
        })
      );

      setEntries(hydrated);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  /* ── Bid state helpers ──────────────────────────────────────────────── */
  function updateBid(jobId: string, patch: Partial<BidState>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.jobId === jobId ? { ...e, bid: { ...(e.bid ?? defaultBid()), ...patch } } : e
      )
    );
  }

  /* ── Submit bid ─────────────────────────────────────────────────────── */
  async function submitBid(entry: InboxEntry) {
    if (!user || !entry.bid) return;

    const amount = parseFloat(entry.bid.amount);
    if (isNaN(amount) || amount <= 0) {
      updateBid(entry.jobId, { error: "Please enter a valid bid amount" });
      return;
    }
    if (!entry.bid.message.trim()) {
      updateBid(entry.jobId, { error: "Please add a message to the homeowner" });
      return;
    }

    updateBid(entry.jobId, { submitting: true, error: undefined });

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${entry.jobId}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          message: entry.bid.message.trim(),
          etaDays: parseInt(entry.bid.etaDays, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit bid");

      updateBid(entry.jobId, {
        submitted: true,
        submittedAmount: amount,
        open: false,
        submitting: false,
      });

      addToast({
        type:  'bid',
        title: `🎯 Bid submitted — $${amount.toFixed(2)}`,
        body:  'The homeowner will be notified. You\'ll hear back soon.',
        duration: 5000,
      });
    } catch (err: any) {
      updateBid(entry.jobId, {
        submitting: false,
        error: err.message ?? "Something went wrong",
      });
    }
  }

  /* ── Decline invitation ─────────────────────────────────────────────── */
  async function declineInvitation(jobId: string) {
    if (!user) return;
    setEntries((prev) =>
      prev.map((e) => (e.jobId === jobId ? { ...e, actionLoading: true } : e))
    );
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/decline-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.jobId === jobId
            ? { ...e, invitationStatus: "declined", actionLoading: false }
            : e
        )
      );
    } catch (err: any) {
      setEntries((prev) =>
        prev.map((e) => (e.jobId === jobId ? { ...e, actionLoading: false } : e))
      );
    }
  }

  /* ── Auth guard ─────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div
        className="rounded-xl p-8 text-center text-sm"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-4)",
        }}
      >
        Sign in to view your job invitations.
      </div>
    );
  }

  const pendingCount = entries.filter((e) => e.invitationStatus === "pending").length;

  const filtered = entries
    .filter((e) => filter === "all" || e.invitationStatus === filter)
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const trade = (e.job?.trade ?? "").toLowerCase();
      const desc  = (e.job?.description ?? "").toLowerCase();
      const city  = getCity(e.job?.location).toLowerCase();
      return trade.includes(q) || desc.includes(q) || city.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "value") {
        return (b.job?.estimatedValue ?? 0) - (a.job?.estimatedValue ?? 0);
      }
      const getMs = (e: InboxEntry) => {
        try {
          const ts = e.invitedAt;
          return (typeof (ts as any)?.toDate === "function"
            ? (ts as any).toDate()
            : ts instanceof Date ? ts : new Date(0)
          ).getTime();
        } catch { return 0; }
      };
      return sortBy === "oldest" ? getMs(a) - getMs(b) : getMs(b) - getMs(a);
    });

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "var(--color-text)", fontWeight: 700, fontSize: 18 }}>
            Job Invitations
          </h2>
          <p style={{ color: "var(--color-text-4)", fontSize: 13, marginTop: 2 }}>
            Review jobs, submit competitive bids, and win work
          </p>
        </div>
        {pendingCount > 0 && (
          <div
            style={{
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 9999,
              padding: "4px 14px",
              color: "#f59e0b",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {pendingCount} new
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "accepted", "declined"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 16px",
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid",
              cursor: "pointer",
              transition: "all 0.15s",
              ...(filter === f
                ? {
                    background: "var(--color-brand)",
                    color: "#fff",
                    borderColor: "var(--color-brand)",
                  }
                : {
                    background: "var(--color-surface)",
                    color: "var(--color-text-3)",
                    borderColor: "var(--color-border)",
                  }),
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && pendingCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: "#f59e0b",
                  color: "#000",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 9999,
                }}
              >
                {pendingCount}
              </span>
            )}
            {f === "all" && (
              <span style={{ marginLeft: 5, color: "var(--color-text-4)", fontSize: 12 }}>
                {entries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + sort bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by trade, city, or keyword…"
          className="input flex-1 text-sm"
          style={{ minWidth: 0 }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="input text-sm"
          style={{ width: 130, flexShrink: 0 }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="value">Highest value</option>
        </select>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          className="rounded-xl p-10 text-center space-y-3"
          style={{
            background: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
          }}
        >
          <div style={{ fontSize: 48 }}>
            {filter === "pending" ? "📭" : filter === "accepted" ? "✅" : "📬"}
          </div>
          <h3 style={{ color: "var(--color-text)", fontWeight: 600 }}>
            {filter === "all"
              ? "No invitations yet"
              : filter === "pending"
              ? "No pending invitations"
              : filter === "accepted"
              ? "No accepted jobs yet"
              : "No declined invitations"}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-4)",
              maxWidth: 280,
              margin: "0 auto",
            }}
          >
            {filter === "all"
              ? "When homeowners post jobs that match your trade and location, invitations will appear here."
              : "Switch to 'All' to see your full history."}
          </p>
          {filter === "all" && (
            <p style={{ fontSize: 12, color: "var(--color-text-4)" }}>
              Make sure your{" "}
              <Link
                href="/contractor-profile"
                style={{ color: "var(--color-brand)", textDecoration: "underline" }}
              >
                profile is complete
              </Link>{" "}
              and your availability is set to active.
            </p>
          )}
        </div>
      )}

      {/* Invitation cards */}
      {!loading &&
        filtered.map((entry) => {
          const trade = entry.job?.trade ?? "General";
          const city = getCity(entry.job?.location);
          const isPending = entry.invitationStatus === "pending";
          const isAccepted = entry.invitationStatus === "accepted";
          const bid = entry.bid ?? defaultBid();

          return (
            <div
              key={entry.id}
              style={{
                background: "var(--color-surface)",
                border: `1px solid ${
                  isPending && !bid.submitted
                    ? "rgba(245,158,11,0.35)"
                    : "var(--color-border)"
                }`,
                borderRadius: 16,
                padding: 20,
                transition: "border-color 0.2s",
              }}
            >
              {/* Card header */}
              <div className="flex justify-between items-start gap-3" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "var(--color-surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {TRADE_ICONS[trade] ?? "🔧"}
                  </div>
                  <div>
                    <h3 style={{ color: "var(--color-text)", fontWeight: 700, fontSize: 15 }}>
                      {trade} Job
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                      {city && (
                        <span style={{ fontSize: 12, color: "var(--color-text-4)" }}>
                          📍 {city}
                        </span>
                      )}
                      {entry.job?.estimatedValue && (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#22c55e",
                            fontWeight: 600,
                          }}
                        >
                          ~${entry.job.estimatedValue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <StatusBadge status={entry.invitationStatus} />
                  {entry.auto && (
                    <span style={{ fontSize: 9, color: "var(--color-text-4)", fontWeight: 600 }}>
                      AUTO-MATCHED
                    </span>
                  )}
                </div>
              </div>

              {/* Job description */}
              {entry.job ? (
                <div style={{ marginBottom: 14 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-3)",
                      lineHeight: 1.6,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {entry.job.aiSummary ?? entry.job.description}
                  </p>
                  {entry.invitedAt && (
                    <p style={{ fontSize: 11, color: "var(--color-text-4)", marginTop: 6 }}>
                      Invited {formatDate(entry.invitedAt)}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--color-text-4)", fontStyle: "italic", marginBottom: 14 }}>
                  Job details unavailable
                </p>
              )}

              {/* ── BID SUBMITTED STATE ── */}
              {isPending && bid.submitted && bid.submittedAmount !== undefined && (
                <div style={{ marginBottom: 12 }}>
                  <BidSubmittedBadge amount={bid.submittedAmount} />
                </div>
              )}

              {/* ── BID FORM (expanded) ── */}
              {isPending && !bid.submitted && bid.open && (
                <div
                  style={{
                    background: "var(--color-bg-2)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--color-text-4)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Your Bid
                  </p>

                  <div className="space-y-3">
                    {/* Price */}
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--color-text-3)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Your Price *
                      </label>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--color-text-3)",
                            fontWeight: 600,
                            fontSize: 15,
                          }}
                        >
                          $
                        </span>
                        <input
                          type="number"
                          placeholder="0.00"
                          min="1"
                          step="0.01"
                          value={bid.amount}
                          onChange={(e) =>
                            updateBid(entry.jobId, { amount: e.target.value, error: undefined })
                          }
                          style={{
                            width: "100%",
                            paddingLeft: 28,
                            paddingRight: 12,
                            paddingTop: 10,
                            paddingBottom: 10,
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            color: "var(--color-text)",
                            fontSize: 15,
                            fontWeight: 600,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {/* ETA */}
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--color-text-3)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Estimated Start Time *
                      </label>
                      <select
                        value={bid.etaDays}
                        onChange={(e) => updateBid(entry.jobId, { etaDays: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          color: "var(--color-text)",
                          fontSize: 13,
                          outline: "none",
                          cursor: "pointer",
                          boxSizing: "border-box",
                        }}
                      >
                        {ETA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--color-text-3)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Message to Homeowner *
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Briefly describe your approach, experience with similar jobs, and why you're the right contractor for this work..."
                        value={bid.message}
                        onChange={(e) =>
                          updateBid(entry.jobId, { message: e.target.value, error: undefined })
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          color: "var(--color-text)",
                          fontSize: 13,
                          lineHeight: 1.5,
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* Error */}
                    {bid.error && (
                      <p style={{ fontSize: 12, color: "var(--color-error)", fontWeight: 500 }}>
                        ⚠️ {bid.error}
                      </p>
                    )}

                    {/* Tip */}
                    <p style={{ fontSize: 11, color: "var(--color-text-4)", lineHeight: 1.5 }}>
                      💡 Contractors who respond fastest and include a personal message win 3× more jobs.
                    </p>

                    {/* Submit / Cancel */}
                    <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                      <button
                        onClick={() => submitBid(entry)}
                        disabled={bid.submitting}
                        style={{
                          flex: 1,
                          padding: "10px 0",
                          background: bid.submitting
                            ? "var(--color-surface-2)"
                            : "var(--color-brand)",
                          color: bid.submitting ? "var(--color-text-4)" : "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: bid.submitting ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "background 0.15s",
                        }}
                      >
                        {bid.submitting ? (
                          <>
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                border: "2px solid var(--color-text-4)",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                display: "inline-block",
                                animation: "spin 0.6s linear infinite",
                              }}
                            />
                            Submitting…
                          </>
                        ) : (
                          <>🎯 Submit Bid</>
                        )}
                      </button>
                      <button
                        onClick={() => updateBid(entry.jobId, { open: false, error: undefined })}
                        disabled={bid.submitting}
                        style={{
                          padding: "10px 16px",
                          background: "var(--color-surface-2)",
                          color: "var(--color-text-3)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACTION BUTTONS ── */}
              <div style={{ display: "flex", gap: 8 }}>

                {/* PENDING + NOT YET BID */}
                {isPending && !bid.submitted && !bid.open && (
                  <>
                    <button
                      onClick={() => updateBid(entry.jobId, { open: true })}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        background: "var(--color-brand)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      🎯 Place Bid
                    </button>
                    {/* AI Bid Pack helper */}
                    {entry.job && (
                      <button
                        onClick={() => setBidPackEntry(entry)}
                        title="Generate AI bid pack"
                        style={{
                          padding: "10px 12px",
                          background: "rgba(99,102,241,0.1)",
                          color: "#818cf8",
                          border: "1px solid rgba(99,102,241,0.25)",
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✨
                      </button>
                    )}
                    <button
                      onClick={() => declineInvitation(entry.jobId)}
                      disabled={entry.actionLoading}
                      style={{
                        padding: "10px 16px",
                        background: "var(--color-surface-2)",
                        color: "var(--color-text-4)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: entry.actionLoading ? "not-allowed" : "pointer",
                        opacity: entry.actionLoading ? 0.5 : 1,
                      }}
                    >
                      {entry.actionLoading ? "…" : "✕ Pass"}
                    </button>
                  </>
                )}

                {/* PENDING + BID SUBMITTED — can still view job */}
                {isPending && bid.submitted && (
                  <Link
                    href={`/jobs/${entry.jobId}`}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text-3)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      textAlign: "center",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    📋 View Job
                  </Link>
                )}

                {/* ACCEPTED */}
                {isAccepted && (
                  <Link
                    href={`/chat/${entry.jobId}`}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: "rgba(34,197,94,0.12)",
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    💬 Open Job Chat →
                  </Link>
                )}

                {/* DECLINED / CLOSED */}
                {(entry.invitationStatus === "declined" ||
                  entry.invitationStatus === "closed") && (
                  <div
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text-4)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {entry.invitationStatus === "declined" ? "Declined" : "Closed"}
                  </div>
                )}

                {/* View details (always, when job exists) */}
                {entry.job && !isAccepted && (
                  <Link
                    href={`/jobs/${entry.jobId}`}
                    style={{
                      padding: "10px 14px",
                      background: "var(--color-surface-2)",
                      color: "var(--color-text-4)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 13,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="View job details"
                  >
                    🔍
                  </Link>
                )}
              </div>
            </div>
          );
        })}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Bid Pack Modal */}
      {bidPackEntry && bidPackEntry.job && (
        <BidPackModal
          jobId={bidPackEntry.jobId}
          description={bidPackEntry.job.description ?? ""}
          trade={bidPackEntry.job.trade ?? "General"}
          city={getCity(bidPackEntry.job.location)}
          onClose={() => setBidPackEntry(null)}
        />
      )}
    </div>
  );
}
