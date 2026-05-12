"use client";

import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { AlertTriangle, CheckCircle, Clock, User, Wrench, DollarSign, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

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

type JobContext = {
  description: string;
  trade: string;
  amount: number;
  homeownerName: string;
  contractorName: string;
  homeownerId: string;
  contractorId: string;
};

function JobContextPanel({ jobId }: { jobId: string }) {
  const [ctx,      setCtx]      = useState<JobContext | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    (async () => {
      try {
        const jobSnap = await getDoc(doc(db, "jobs", jobId));
        if (!jobSnap.exists()) { setLoading(false); return; }
        const job = jobSnap.data() as any;

        const [hwSnap, ctSnap] = await Promise.all([
          job.userId    ? getDoc(doc(db, "homeowners",  job.userId))    : Promise.resolve(null),
          job.claimedBy ? getDoc(doc(db, "contractors", job.claimedBy)) : Promise.resolve(null),
        ]);

        setCtx({
          description:    job.description       ?? "No description",
          trade:          job.aiDetectedTrade    ?? job.trade ?? "General",
          amount:         Number(job.paymentAmountUsd ?? 0),
          homeownerName:  hwSnap?.data()?.name   ?? "Homeowner",
          contractorName: ctSnap?.data()?.name   ?? "Contractor",
          homeownerId:    job.userId             ?? "",
          contractorId:   job.claimedBy          ?? "",
        });
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [jobId]);

  if (loading) {
    return (
      <div className="h-8 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-2)' }} />
    );
  }
  if (!ctx) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all"
        style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)' }}
      >
        <span className="flex items-center gap-1.5">
          <Wrench className="w-3 h-3" /> Job Context
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-3" style={{ background: 'var(--color-surface)' }}>
          {/* Job description */}
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>
            {ctx.description}
          </p>

          {/* Trade + amount */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-brand-dim)', color: 'var(--color-brand)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Wrench className="w-2.5 h-2.5" /> {ctx.trade}
            </span>
            {ctx.amount > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
                <DollarSign className="w-2.5 h-2.5" /> ${ctx.amount} escrowed
              </span>
            )}
          </div>

          {/* Both parties */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-lg px-3 py-2 space-y-0.5"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#60a5fa' }}>Homeowner</p>
              <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
                <User className="w-3 h-3" /> {ctx.homeownerName}
              </p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-4)' }}>{ctx.homeownerId.slice(0, 12)}…</p>
            </div>
            <div
              className="rounded-lg px-3 py-2 space-y-0.5"
              style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#a78bfa' }}>Contractor</p>
              <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
                <User className="w-3 h-3" /> {ctx.contractorName || "Not assigned"}
              </p>
              {ctx.contractorId && (
                <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-4)' }}>{ctx.contractorId.slice(0, 12)}…</p>
              )}
            </div>
          </div>

          {/* View job link */}
          <a
            href={`/jobs/${jobId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-brand)' }}
          >
            <ExternalLink className="w-3 h-3" /> View full job
          </a>
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  work_not_completed:    "Work not completed",
  work_done_incorrectly: "Work done incorrectly",
  contractor_no_show:    "Contractor no-show",
  safety_concern:        "Safety concern",
  overcharged:           "Price dispute",
  other:                 "Other",
};

const RESOLUTION_OPTIONS = [
  { value: "contractor_fault", label: "Contractor Fault",  desc: "Refund homeowner",           bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171',  hoverBg: 'rgba(239,68,68,0.2)' },
  { value: "owner_fault",      label: "Owner Fault",       desc: "Release to contractor",       bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)',  color: '#60a5fa',  hoverBg: 'rgba(96,165,250,0.2)' },
  { value: "mutual",           label: "Mutual",            desc: "Manual resolution",           bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24',  hoverBg: 'rgba(245,158,11,0.2)' },
  { value: "invalid",          label: "Dismiss / Invalid", desc: "Restore job to in_progress",  bg: 'var(--color-surface-2)', border: 'var(--color-border)', color: 'var(--color-text-3)', hoverBg: 'var(--color-surface)' },
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
  const { user }                        = useAuth();
  const [disputes,  setDisputes]        = useState<Dispute[]>([]);
  const [filter,    setFilter]          = useState<"open" | "resolved" | "all">("open");
  const [resolving, setResolving]       = useState<string | null>(null);
  const [adminNote, setAdminNote]       = useState("");
  const [loading,   setLoading]         = useState<string | null>(null);
  const [error,     setError]           = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collectionGroup(db, "disputes"), (snap) => {
      setDisputes(snap.docs.map((d) => ({
        id:    d.id,
        jobId: d.ref.parent.parent?.id ?? "",
        ...(d.data() as any),
      })));
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
    filter === "all"      ? true :
    filter === "open"     ? d.status !== "resolved" :
                            d.status === "resolved"
  );

  const openCount = disputes.filter((d) => d.status !== "resolved").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Disputes</h1>
          <p className="text-sm mt-0.5" style={{ color: openCount > 0 ? '#fb923c' : 'var(--color-text-4)' }}>
            {openCount > 0
              ? `${openCount} open dispute${openCount > 1 ? "s" : ""} need attention`
              : "No open disputes ✓"}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-150"
              style={{
                background: filter === f ? 'rgba(99,102,241,0.15)' : 'var(--color-surface)',
                border: filter === f ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                color: filter === f ? '#a5b4fc' : 'var(--color-text-4)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {filtered.length === 0 && (
        <div
          className="card p-12 text-center"
          style={{ border: '2px dashed var(--color-border)' }}
        >
          <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#34d399' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>No disputes</p>
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>No {filter === "all" ? "" : filter} disputes found</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((d) => {
          const isOpen = d.status !== "resolved";
          return (
            <div
              key={d.id}
              className="card p-5 space-y-4"
              style={isOpen ? {
                border: '1px solid rgba(249,115,22,0.25)',
                background: 'rgba(249,115,22,0.03)',
              } : {}}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={isOpen
                        ? { background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c' }
                        : { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }
                      }
                    >
                      {isOpen
                        ? <><AlertTriangle className="w-3 h-3" /> Open</>
                        : <><CheckCircle className="w-3 h-3" /> Resolved</>
                      }
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-4)' }}>
                      <Clock className="w-3 h-3" />{timeAgo(d.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                    Job: <span className="font-mono" style={{ color: '#818cf8' }}>{d.jobId}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Reported by</p>
                  <p className="text-xs font-semibold capitalize" style={{ color: 'var(--color-text-2)' }}>{d.reporterRole}</p>
                </div>
              </div>

              {/* Category + description */}
              <div
                className="rounded-xl px-4 py-3 space-y-2"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs font-semibold" style={{ color: '#fb923c' }}>
                  {CATEGORY_LABEL[d.category] ?? d.category}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{d.description}</p>
              </div>

              {/* Job context */}
              <JobContextPanel jobId={d.jobId} />

              {/* Resolved state */}
              {d.status === "resolved" && (
                <div
                  className="rounded-xl px-4 py-3 space-y-1"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <p className="text-xs font-semibold" style={{ color: '#34d399' }}>
                    Resolution: <span className="capitalize">{d.resolution?.replace(/_/g, " ")}</span>
                  </p>
                  {d.adminNote && <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Note: {d.adminNote}</p>}
                </div>
              )}

              {/* Resolution panel */}
              {isOpen && (
                resolving === d.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Admin note (optional — shown to both parties)…"
                      rows={2}
                      className="input resize-none text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {RESOLUTION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => resolve(d, opt.value)}
                          disabled={loading === d.id}
                          className="text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-50"
                          style={{ background: opt.bg, border: `1px solid ${opt.border}`, color: opt.color }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = opt.hoverBg}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = opt.bg}
                        >
                          <p>{opt.label}</p>
                          <p className="text-[10px] opacity-70 font-normal mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { setResolving(null); setAdminNote(""); setError(null); }}
                      className="text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-text-4)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setResolving(d.id)}
                    className="btn btn-sm"
                    style={{
                      background: 'rgba(249,115,22,0.1)',
                      border: '1px solid rgba(249,115,22,0.3)',
                      color: '#fb923c',
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Resolve Dispute
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
