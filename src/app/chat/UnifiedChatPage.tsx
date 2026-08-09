"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import CaptureWidget from "@/components/CaptureWidget";
import JobWorkflowCard from "@/components/JobWorkflowCard";
import JobCompletionActions from "@/components/JobCompletionActions";
import RevealContactButton from "@/components/RevealContactButton";
import SchedulingCard from "@/components/SchedulingCard";
import ReviewCard from "@/components/ReviewCard";
import DisputeCard from "@/components/DisputeCard";
import ReputationBadge from "@/components/ReputationBadge";
import ProviderSelection from "@/components/ProviderSelection";
import PaymentCard from "@/components/PaymentCard";
import { logJobEvent } from "@/lib/logEvent";
import Link from "next/link";
import {
  collection, query, where, onSnapshot, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/db";
import { useSearchParams } from "next/navigation";
import type { JobStatus } from "@/types/firestore";
import {
  Send, ChevronDown, ChevronUp, ArrowLeft,
  Briefcase, Plus, Search, Loader2, Sparkles,
  Brain, X,
} from "lucide-react";

/* ─────────────────────────────────── Types ── */

type Job = {
  id: string;
  description: string;
  trade?: string;
  location?: string | Record<string, unknown>;
  status: JobStatus;
  claimedBy?: string;
  userId: string;
  unreadOwner?: number;
  unreadContractor?: number;
  aiSummary?: string;
  createdAt?: unknown;
  paymentStatus?: "pending" | "held" | "released" | "refunded" | "failed";
  paymentAmountUsd?: number;
};

type Msg = {
  id: string;
  text: string;
  senderId: string;
  createdAt?: unknown;
};

type JobEvent = {
  id: string;
  type: string;
  message?: string;
  actorId: string;
  meta?: Record<string, unknown>;
  createdAt?: unknown;
};

/* ─────────────────────────────────── Helpers ── */

function mergeJobs(prev: Job[], incoming: Job[]): Job[] {
  const map = new Map<string, Job>();
  prev.forEach((j) => map.set(j.id, j));
  incoming.forEach((j) => map.set(j.id, j));
  return Array.from(map.values()).sort((a, b) => {
    const aTime = (a.createdAt as any)?.seconds ?? 0;
    const bTime = (b.createdAt as any)?.seconds ?? 0;
    return bTime - aTime;
  });
}

function getCity(loc: Job["location"]): string {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  return (loc as any).city ?? "";
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:                 { label: "Open",              color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  draft:                { label: "Draft",             color: "#64748b", bg: "rgba(100,116,139,0.1)" },
  triaged:              { label: "Triaged",           color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  matched:              { label: "Matched",           color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  contacted:            { label: "Contacted",         color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  accepted:             { label: "Accepted",          color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  claimed:              { label: "Claimed",           color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  inspection_scheduled: { label: "Inspection",        color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  quote_proposed:       { label: "Quote Sent",        color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  approved:             { label: "Approved",          color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  in_progress:          { label: "In Progress",       color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  completed:            { label: "Completed",         color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  confirmed:            { label: "Confirmed",         color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  verified:             { label: "Verified",          color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  closed:               { label: "Closed",            color: "#475569", bg: "rgba(71,85,105,0.1)" },
  cancelled:            { label: "Cancelled",         color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status.replace(/_/g, " "), color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: m.color, background: m.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
        style={{ background: m.color }}
      />
      {m.label}
    </span>
  );
}

function timeLabel(ts: unknown): string {
  const secs = (ts as any)?.seconds;
  if (!secs) return "";
  const d = new Date(secs * 1000);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ─────────────────────────────────── Main ── */

export default function UnifiedChatPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const jobFromUrl = searchParams.get("job");

  const [jobs,          setJobs]          = useState<Job[]>([]);
  const [jobsLoading,   setJobsLoading]   = useState(true);
  const [selectedJob,   setSelectedJob]   = useState<Job | null>(null);
  const [messages,      setMessages]      = useState<Msg[]>([]);
  const [events,        setEvents]        = useState<JobEvent[]>([]);
  const [text,          setText]          = useState("");
  const [sending,       setSending]       = useState(false);
  const [search,        setSearch]        = useState("");
  const [detailsOpen,   setDetailsOpen]   = useState(false);
  const [aiAsking,      setAiAsking]      = useState(false);
  const [aiError,       setAiError]       = useState<string | null>(null);
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);
  const [mobileView,    setMobileView]    = useState<"sidebar" | "chat">("sidebar");

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── auto-grow textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  /* ── body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* ── Load jobs ── */
  useEffect(() => {
    if (!user) return;
    let first = true;
    const unsub1 = onSnapshot(
      query(collection(db, "jobs"), where("userId",    "==", user.uid)),
      (snap) => {
        setJobs((p) => mergeJobs(p, snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
        if (first) { setJobsLoading(false); first = false; }
      },
      () => { if (first) { setJobsLoading(false); first = false; } }
    );
    const unsub2 = onSnapshot(
      query(collection(db, "jobs"), where("claimedBy", "==", user.uid)),
      (snap) => setJobs((p) => mergeJobs(p, snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))),
      () => {}
    );
    return () => { unsub1(); unsub2(); };
  }, [user]);

  /* ── Auto-select from URL ── */
  useEffect(() => {
    if (!jobFromUrl || !jobs.length) return;
    const found = jobs.find((j) => j.id === jobFromUrl);
    if (found && found.id !== selectedJob?.id) {
      setSelectedJob(found);
      setMobileView("chat");
    }
  }, [jobFromUrl, jobs]);

  /* ── Keep selected job live ── */
  useEffect(() => {
    if (!selectedJob) return;
    const updated = jobs.find((j) => j.id === selectedJob.id);
    if (updated) setSelectedJob(updated);
  }, [jobs]);

  /* ── Messages ── */
  useEffect(() => {
    if (!selectedJob) { setMessages([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "jobs", selectedJob.id, "messages"), orderBy("createdAt", "asc")),
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      },
      () => {}
    );
    return () => unsub();
  }, [selectedJob?.id]);

  /* ── Events ── */
  useEffect(() => {
    if (!selectedJob) { setEvents([]); return; }
    const unsub = onSnapshot(
      query(collection(db, "jobs", selectedJob.id, "events"), orderBy("createdAt", "asc")),
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => {}
    );
    return () => unsub();
  }, [selectedJob?.id]);

  /* ── Send message ── */
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selectedJob || !text.trim() || !user || sending) return;
    const trimmed = text.trim();
    setSending(true);
    setText("");
    try {
      const token = await user.getIdToken();
      await fetch(`/api/jobs/${selectedJob.id}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: trimmed }),
      });
    } catch (err) { console.error(err); }
    setSending(false);
    textareaRef.current?.focus();
  }

  /* ── Ask AI about this job ── */
  async function askAI() {
    if (!selectedJob || !user || aiAsking) return;
    setAiAsking(true);
    setAiError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: `Analyze this repair job: "${selectedJob.description}". Provide: diagnosis, urgency level, estimated cost range, DIY vs hire a pro recommendation, and 3 key next steps.`,
          mode: "homeowner",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAiError(data.error ?? `AI is unavailable right now (HTTP ${res.status}).`);
      } else if (data.reply && selectedJob && user) {
        // Log as an event so it appears in the timeline
        await logJobEvent(selectedJob.id, "system_ai", "ai_diagnosis", {
          message: data.reply,
        });
      }
    } catch {
      setAiError("AI request failed — check your connection and try again.");
    }
    setAiAsking(false);
  }

  /* ── Voice transcript → text input ── */
  const handleTranscript = useCallback((t: string) => {
    setText((prev) => prev ? `${prev} ${t}` : t);
    textareaRef.current?.focus();
  }, []);

  /* ── Upload complete → show preview or inline message ── */
  const handleUpload = useCallback((url: string, mime: string) => {
    if (mime.startsWith("image")) setImagePreview(url);
  }, []);

  /* ── Enter to send ── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const filteredJobs = jobs.filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.description?.toLowerCase().includes(q) ||
      j.trade?.toLowerCase().includes(q) ||
      getCity(j.location).toLowerCase().includes(q)
    );
  });

  function unread(job: Job): number {
    if (!user) return 0;
    return job.userId === user.uid ? job.unreadOwner ?? 0 : job.unreadContractor ?? 0;
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="text-center space-y-3">
          <p style={{ color: "var(--color-text-2)" }}>
            Please{" "}
            <Link href="/auth/signin" style={{ color: "var(--color-brand-hover)" }}>
              sign in
            </Link>{" "}
            to view your jobs.
          </p>
        </div>
      </div>
    );
  }

  /* ──────────────────────────── RENDER ── */
  return (
    <>
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .msg-in { animation: msgIn 0.2s ease-out forwards; }

        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40%            { transform: scale(1);    opacity: 1;    }
        }
        .dot-pulse { animation: dotPulse 1.2s infinite ease-in-out; }
        .dot-pulse:nth-child(2) { animation-delay: .15s; }
        .dot-pulse:nth-child(3) { animation-delay: .3s; }

        .job-row:hover .job-row-title { color: var(--color-text); }
      `}</style>

      <div
        className="flex"
        style={{
          position: "fixed",
          top: "3.5rem",   /* header height h-14 */
          left: 0, right: 0, bottom: 0,
          background: "var(--color-bg)",
          zIndex: 10,
        }}
      >
        {/* ══════════════════════════════ SIDEBAR ══ */}
        <aside
          style={{
            width: 300,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--color-bg-2)",
            borderRight: "1px solid var(--color-border)",
          }}
          className={mobileView === "chat" ? "hidden md:flex" : "flex w-full md:w-[300px]"}
        >
          {/* Sidebar header */}
          <div
            className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-brand-dim)", border: "1px solid var(--color-brand-border)" }}
              >
                <Briefcase size={12} style={{ color: "var(--color-brand)" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text)" }}>
                Your Jobs
              </span>
            </div>
            <Link
              href="/jobs/new"
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
              style={{
                background: "var(--color-brand)",
                color: "#fff",
                boxShadow: "0 0 12px rgba(99,102,241,0.4)",
              }}
              title="Post new job"
            >
              <Plus size={14} />
            </Link>
          </div>

          {/* Search */}
          <div className="px-3 py-2 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <Search size={13} style={{ color: "var(--color-text-4)", flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--color-text)", fontSize: "0.8125rem" }}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} style={{ color: "var(--color-text-4)" }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Job list */}
          <div className="flex-1 overflow-y-auto">
            {jobsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-brand)" }} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <Briefcase size={20} style={{ color: "var(--color-text-4)" }} />
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-3)" }}>
                  {search ? "No jobs match your search" : "No jobs yet"}
                </p>
                {!search && (
                  <Link href="/jobs/new" className="btn btn-sm btn-primary">
                    + Post your first job
                  </Link>
                )}
              </div>
            ) : (
              filteredJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                const u = unread(job);
                const city = getCity(job.location);
                const meta = STATUS_META[job.status];

                return (
                  <button
                    key={job.id}
                    onClick={() => { setSelectedJob(job); setMobileView("chat"); }}
                    className="job-row w-full text-left px-4 py-3 transition-all duration-100"
                    style={{
                      background: isSelected ? "rgba(99,102,241,0.08)" : "transparent",
                      borderLeft: `2px solid ${isSelected ? "var(--color-brand)" : "transparent"}`,
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span
                        className="job-row-title text-sm font-semibold truncate transition-colors"
                        style={{ color: isSelected ? "var(--color-text)" : "var(--color-text-2)" }}
                      >
                        {job.trade ?? "General Repair"}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {u > 0 && (
                          <span
                            className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                            style={{ background: "var(--color-brand)", color: "#fff" }}
                          >
                            {u > 9 ? "9+" : u}
                          </span>
                        )}
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: meta?.color ?? "#64748b" }}
                        />
                      </div>
                    </div>

                    <p className="text-xs truncate mb-1.5" style={{ color: "var(--color-text-4)" }}>
                      {job.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <StatusPill status={job.status} />
                      {city && (
                        <span style={{ fontSize: "0.7rem", color: "var(--color-text-4)" }}>
                          {city}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Sidebar footer */}
          <div className="flex-shrink-0 p-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <Link
              href="/jobs/new"
              className="btn btn-primary btn-sm btn-full"
            >
              <Plus size={14} /> Post New Job
            </Link>
          </div>
        </aside>

        {/* ══════════════════════════════ CHAT PANEL ══ */}
        <section
          className={`flex-1 flex flex-col min-w-0 ${mobileView === "sidebar" ? "hidden md:flex" : "flex"}`}
          style={{ background: "var(--color-bg)" }}
        >
          {!selectedJob ? (
            /* ── Empty state ── */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))",
                  border: "1px solid var(--color-border-brand)",
                }}
              >
                <Briefcase size={28} style={{ color: "var(--color-brand)" }} />
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text)", marginBottom: "0.35rem" }}>
                  Select a job
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", maxWidth: 280, lineHeight: 1.6 }}>
                  Pick a job from the sidebar to view the conversation and manage the repair.
                </p>
              </div>
              <Link href="/jobs/new" className="btn btn-primary btn-md">
                <Plus size={15} /> Post a New Job
              </Link>
            </div>
          ) : (
            <>
              {/* ── Chat header ── */}
              <div
                className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
                style={{
                  background: "var(--color-bg-2)",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {/* Mobile back */}
                <button
                  type="button"
                  onClick={() => setMobileView("sidebar")}
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                  style={{ background: "var(--color-surface)", color: "var(--color-text-2)" }}
                >
                  <ArrowLeft size={16} />
                </button>

                {/* Job info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text)" }}>
                      {selectedJob.trade ?? "General Repair"}
                    </span>
                    <StatusPill status={selectedJob.status} />
                  </div>
                  {getCity(selectedJob.location) && (
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-4)", marginTop: 1 }}>
                      {getCity(selectedJob.location)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* AI Diagnose */}
                  <button
                    type="button"
                    onClick={askAI}
                    disabled={aiAsking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: aiAsking ? "var(--color-surface)" : "linear-gradient(135deg,#059669,#10b981)",
                      color: "#fff",
                      border: "1px solid rgba(16,185,129,0.4)",
                      boxShadow: aiAsking ? "none" : "0 0 14px rgba(16,185,129,0.3)",
                      opacity: aiAsking ? 0.7 : 1,
                    }}
                    title="Ask AI to analyze this job"
                  >
                    {aiAsking
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Brain size={12} />}
                    Ask AI
                  </button>

                  {/* Details toggle */}
                  <button
                    type="button"
                    onClick={() => setDetailsOpen((o) => !o)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: detailsOpen ? "var(--color-brand-dim)" : "var(--color-surface)",
                      border: `1px solid ${detailsOpen ? "var(--color-brand-border)" : "var(--color-border)"}`,
                      color: detailsOpen ? "var(--color-brand-hover)" : "var(--color-text-3)",
                    }}
                  >
                    Details
                    {detailsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {/* ── AI error strip ── */}
              {aiError && (
                <div
                  className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2 text-xs"
                  style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                >
                  <span>{aiError}</span>
                  <button type="button" onClick={() => setAiError(null)} style={{ color: "#f87171" }} aria-label="Dismiss">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* ── Job Details Panel (collapsible) ── */}
              {detailsOpen && (
                <div
                  className="flex-shrink-0 overflow-y-auto"
                  style={{
                    maxHeight: "45vh",
                    background: "var(--color-bg-2)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div className="p-4 space-y-3">
                    <JobWorkflowCard status={selectedJob.status} />

                    <JobCompletionActions
                      jobId={selectedJob.id}
                      status={selectedJob.status}
                      userId={selectedJob.userId}
                      contractorId={selectedJob.claimedBy}
                    />

                    {selectedJob.claimedBy && (
                      <div className="flex flex-wrap gap-2">
                        <RevealContactButton jobId={selectedJob.id} contractorId={selectedJob.claimedBy} />
                        <ReputationBadge contractorId={selectedJob.claimedBy} />
                      </div>
                    )}

                    {user.uid === selectedJob.userId && !selectedJob.claimedBy && (
                      <ProviderSelection
                        jobId={selectedJob.id}
                        trade={selectedJob.trade}
                        location={{ city: getCity(selectedJob.location) }}
                      />
                    )}

                    {selectedJob.claimedBy &&
                      ["accepted", "in_progress", "completed"].includes(selectedJob.status) && (
                        <SchedulingCard
                          jobId={selectedJob.id}
                          jobOwnerId={selectedJob.userId}
                          claimedBy={selectedJob.claimedBy}
                        />
                    )}

                    {user.uid === selectedJob.userId &&
                      ["accepted", "in_progress"].includes(selectedJob.status) && (
                        <PaymentCard
                          jobId={selectedJob.id}
                          amountUsd={selectedJob.paymentAmountUsd}
                          paymentStatus={selectedJob.paymentStatus ?? null}
                          onPaymentHeld={() =>
                            setSelectedJob((j) => j ? { ...j, paymentStatus: "held" } : j)
                          }
                        />
                    )}

                    {["confirmed", "verified"].includes(selectedJob.status) && (
                      <ReviewCard
                        jobId={selectedJob.id}
                        jobOwnerId={selectedJob.userId}
                        contractorId={selectedJob.claimedBy}
                        jobStatus={selectedJob.status}
                      />
                    )}

                    {["accepted", "in_progress", "completed", "triaged"].includes(selectedJob.status) && (
                      <DisputeCard
                        jobId={selectedJob.id}
                        jobStatus={selectedJob.status}
                        isHomeowner={user.uid === selectedJob.userId}
                        isContractor={user.uid === selectedJob.claimedBy}
                        onStatusChange={() =>
                          setSelectedJob((j) => j ? { ...j, status: "disputed" as any } : j)
                        }
                      />
                    )}

                    {/* Event timeline */}
                    {events.length > 0 && (
                      <div
                        className="rounded-xl p-3 space-y-1.5"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                      >
                        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                          Activity Log
                        </p>
                        {events.slice(-6).map((ev) => (
                          <div key={ev.id} className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: "var(--color-brand)" }}
                            />
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)", lineHeight: 1.5 }}>
                              {ev.message || ev.type.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Messages ── */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                    >
                      <Sparkles size={20} style={{ color: "var(--color-text-4)" }} />
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-text-4)" }}>
                      No messages yet — say hello or upload a photo to get started.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMine = m.senderId === user.uid;
                    const isAI = m.senderId === "system_ai";
                    const prev = messages[idx - 1];
                    const sameSender = prev?.senderId === m.senderId;

                    return (
                      <div
                        key={m.id}
                        className={`msg-in flex ${isMine ? "justify-end" : "justify-start"}`}
                        style={{ marginTop: sameSender ? "2px" : "12px" }}
                      >
                        {/* AI avatar */}
                        {isAI && !sameSender && (
                          <div
                            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mr-2 self-end"
                            style={{ background: "linear-gradient(135deg,#059669,#10b981)", flexShrink: 0 }}
                          >
                            <Brain size={13} style={{ color: "#fff" }} />
                          </div>
                        )}
                        {isAI && sameSender && <div style={{ width: 28, marginRight: 8, flexShrink: 0 }} />}

                        <div style={{ maxWidth: "72%" }}>
                          <div
                            className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                            style={
                              isMine
                                ? {
                                    background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                                    color: "#fff",
                                    borderRadius: sameSender ? "18px 4px 4px 18px" : "18px 18px 4px 18px",
                                    boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
                                  }
                                : isAI
                                ? {
                                    background: "linear-gradient(135deg,rgba(5,150,105,0.12),rgba(16,185,129,0.06))",
                                    color: "var(--color-text-2)",
                                    border: "1px solid rgba(16,185,129,0.2)",
                                    borderRadius: sameSender ? "4px 18px 18px 4px" : "18px 18px 18px 4px",
                                  }
                                : {
                                    background: "var(--color-surface)",
                                    color: "var(--color-text-2)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: sameSender ? "4px 18px 18px 4px" : "18px 18px 18px 4px",
                                  }
                            }
                          >
                            {m.text}
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] px-1 ${isMine ? "text-right" : "text-left"}`}
                            style={{ color: "var(--color-text-4)" }}
                          >
                            {timeLabel(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* AI thinking indicator */}
                {aiAsking && (
                  <div className="flex items-center gap-2 mt-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
                    >
                      <Brain size={13} style={{ color: "#fff" }} />
                    </div>
                    <div
                      className="flex items-center gap-1 px-4 py-3 rounded-2xl"
                      style={{
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: "18px 18px 18px 4px",
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="dot-pulse w-2 h-2 rounded-full block"
                          style={{ background: "#10b981" }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* ── Image preview strip ── */}
              {imagePreview && (
                <div
                  className="flex-shrink-0 px-4 py-2 flex items-center gap-2"
                  style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg-2)" }}
                >
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Attachment preview"
                      className="rounded-xl object-cover"
                      style={{ width: 52, height: 52, border: "1px solid var(--color-border)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                      style={{ background: "var(--color-error)", fontSize: "0.7rem", fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                    Photo attached — AI is analyzing it
                  </span>
                </div>
              )}

              {/* ── Input bar ── */}
              <form
                onSubmit={sendMessage}
                className="flex-shrink-0 flex items-end gap-2 px-4 py-3"
                style={{
                  background: "var(--color-bg-2)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                {/* Camera + Voice (CaptureWidget) */}
                <CaptureWidget
                  jobId={selectedJob.id}
                  onTranscript={handleTranscript}
                  onUploadComplete={handleUpload}
                  disabled={sending}
                />

                {/* Text input */}
                <div
                  className="flex-1 flex items-end rounded-2xl px-3.5 py-2"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    transition: "border-color 0.15s",
                  }}
                  onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--color-brand-border)"}
                  onBlurCapture={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                >
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… or tap 🎤"
                    rows={1}
                    className="flex-1 resize-none bg-transparent outline-none text-sm"
                    style={{
                      color: "var(--color-text)",
                      maxHeight: 120,
                      overflowY: "auto",
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150"
                  style={{
                    background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                    border: "1px solid rgba(99,102,241,0.5)",
                    color: "#fff",
                    boxShadow: "0 0 16px rgba(99,102,241,0.35)",
                    opacity: !text.trim() || sending ? 0.4 : 1,
                    cursor: !text.trim() || sending ? "not-allowed" : "pointer",
                    marginBottom: 2,
                  }}
                >
                  {sending
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Send size={16} />}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
