"use client";

import React, { useEffect, useState, useRef } from "react";
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
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/db";
import { useSearchParams } from "next/navigation";
import type { JobStatus } from "@/types/firestore";

/* ─── Types ─────────────────────────────────────────────────────────────── */

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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function mergeJobs(prev: Job[], incoming: Job[]): Job[] {
  const map = new Map<string, Job>();
  prev.forEach((j) => map.set(j.id, j));
  incoming.forEach((j) => map.set(j.id, j));
  return Array.from(map.values()).sort((a, b) => {
    // Most recently created first
    const aTime = (a.createdAt as any)?.seconds ?? 0;
    const bTime = (b.createdAt as any)?.seconds ?? 0;
    return bTime - aTime;
  });
}

function getJobCity(location: Job["location"]): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  return (location as any).city ?? "";
}

const STATUS_COLOR: Record<string, string> = {
  draft:                "bg-gray-700 text-gray-300",
  triaged:              "bg-amber-900/60 text-amber-300",
  matched:              "bg-blue-900/60 text-blue-300",
  open:                 "bg-gray-700 text-gray-300",
  contacted:            "bg-sky-900/60 text-sky-300",
  accepted:             "bg-indigo-900/60 text-indigo-300",
  claimed:              "bg-indigo-900/60 text-indigo-300",
  inspection_scheduled: "bg-purple-900/60 text-purple-300",
  quote_proposed:       "bg-violet-900/60 text-violet-300",
  approved:             "bg-teal-900/60 text-teal-300",
  in_progress:          "bg-orange-900/60 text-orange-300",
  completed:            "bg-green-900/60 text-green-300",
  confirmed:            "bg-emerald-900/60 text-emerald-300",
  verified:             "bg-emerald-900/60 text-emerald-300",
  closed:               "bg-gray-700 text-gray-400",
  cancelled:            "bg-red-900/60 text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] ?? "bg-gray-700 text-gray-300";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function UnifiedChatPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const jobFromUrl = searchParams.get("job");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  // Mobile: show sidebar or chat panel
  const [mobilePannel, setMobilePanel] = useState<"sidebar" | "chat">("sidebar");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Load jobs (owned + claimed) ─────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    let firstLoad = true;

    const ownedQ = query(collection(db, "jobs"), where("userId", "==", user.uid));
    const claimedQ = query(collection(db, "jobs"), where("claimedBy", "==", user.uid));

    const unsub1 = onSnapshot(ownedQ, (snap) => {
      setJobs((prev) => mergeJobs(prev, snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
      if (firstLoad) { setJobsLoading(false); firstLoad = false; }
    });

    const unsub2 = onSnapshot(claimedQ, (snap) => {
      setJobs((prev) => mergeJobs(prev, snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  /* ── Auto-select from URL param ──────────────────────────────────────── */
  useEffect(() => {
    if (!jobFromUrl || !jobs.length) return;
    const found = jobs.find((j) => j.id === jobFromUrl);
    if (found && found.id !== selectedJob?.id) {
      setSelectedJob(found);
      setMobilePanel("chat");
    }
  }, [jobFromUrl, jobs]);

  /* ── Keep selectedJob in sync with live job list updates ─────────────── */
  useEffect(() => {
    if (!selectedJob) return;
    const updated = jobs.find((j) => j.id === selectedJob.id);
    if (updated) setSelectedJob(updated);
  }, [jobs]);

  /* ── Load messages ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedJob) { setMessages([]); return; }

    const q = query(
      collection(db, "jobs", selectedJob.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    return () => unsub();
  }, [selectedJob?.id]);

  /* ── Load events ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedJob) { setEvents([]); return; }

    const q = query(
      collection(db, "jobs", selectedJob.id, "events"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => unsub();
  }, [selectedJob?.id]);

  /* ── Send message ────────────────────────────────────────────────────── */
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob || !text.trim() || !user || sending) return;

    const trimmed = text.trim();
    setSending(true);
    setText("");

    try {
      const token = await user.getIdToken();
      await fetch(`/api/jobs/${selectedJob.id}/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: trimmed }),
      });
    } catch (err) {
      console.error("send-message error:", err);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  /* ── Select job ──────────────────────────────────────────────────────── */
  function selectJob(job: Job) {
    setSelectedJob(job);
    setMobilePanel("chat");
  }

  /* ── Filtered job list ───────────────────────────────────────────────── */
  const filteredJobs = jobs.filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.description?.toLowerCase().includes(q) ||
      j.trade?.toLowerCase().includes(q) ||
      getJobCity(j.location).toLowerCase().includes(q)
    );
  });

  /* ── Unread count for current user ──────────────────────────────────── */
  function unreadCount(job: Job): number {
    if (!user) return 0;
    return job.userId === user.uid
      ? job.unreadOwner ?? 0
      : job.unreadContractor ?? 0;
  }

  if (!user) {
    return (
      <div className="flex h-[90vh] items-center justify-center bg-gray-950 text-gray-400">
        Please <Link href="/auth/signin" className="text-indigo-400 mx-1 underline">sign in</Link> to view your chats.
      </div>
    );
  }

  /* ─────────────────────────── RENDER ─────────────────────────────────── */
  return (
    <div className="flex h-[90vh] bg-gray-950 text-white overflow-hidden">

      {/* ══════════════════ JOB SIDEBAR ══════════════════ */}
      <aside
        className={`
          flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0
          border-r border-gray-800 bg-gray-900
          ${mobilePannel === "chat" ? "hidden md:flex" : "flex"}
        `}
      >
        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white mb-2">Your Jobs</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs…"
            className="w-full bg-gray-800 text-sm text-white placeholder-gray-500 px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800">
          {jobsLoading ? (
            /* Loading skeleton */
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="h-3 bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </div>
            ))
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
              <span className="text-3xl">🔧</span>
              <p className="text-sm text-gray-400">
                {search ? "No jobs match your search." : "No jobs yet. Create one to get started."}
              </p>
              {!search && (
                <Link
                  href="/jobs/new"
                  className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
                >
                  + New Job
                </Link>
              )}
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              const unread = unreadCount(job);
              const city = getJobCity(job.location);

              return (
                <button
                  key={job.id}
                  onClick={() => selectJob(job)}
                  className={`
                    w-full text-left px-4 py-3 transition
                    ${isSelected
                      ? "bg-indigo-950/60 border-l-2 border-indigo-500"
                      : "hover:bg-gray-800/60 border-l-2 border-transparent"
                    }
                  `}
                >
                  {/* Row 1: trade + unread badge */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-white truncate">
                      {job.trade ?? "General Repair"}
                    </span>
                    {unread > 0 && (
                      <span className="flex-shrink-0 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  {/* Row 2: description preview */}
                  <p className="text-xs text-gray-400 truncate mb-1.5">
                    {job.description}
                  </p>

                  {/* Row 3: status + city + payment indicator */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={job.status} />
                    {city && (
                      <span className="text-[10px] text-gray-500">{city}</span>
                    )}
                    {(job.paymentStatus === "held" || job.paymentStatus === "released") && (
                      <span className="text-[10px] text-green-400 font-medium">🔒 Paid</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Sidebar footer */}
        <div className="px-4 py-2 border-t border-gray-800">
          <Link
            href="/jobs/new"
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 rounded-lg transition"
          >
            + New Job
          </Link>
        </div>
      </aside>

      {/* ══════════════════ CHAT PANEL ══════════════════ */}
      <section
        className={`
          flex-1 flex flex-col min-w-0
          ${mobilePannel === "sidebar" ? "hidden md:flex" : "flex"}
        `}
      >
        {!selectedJob ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <span className="text-5xl">💬</span>
            <h3 className="text-lg font-semibold text-white">Select a job to start chatting</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Pick a job from the list on the left, or create a new one.
            </p>
            <Link
              href="/jobs/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              + Create a Job
            </Link>
          </div>
        ) : (
          <>
            {/* ── Chat header ───────────────────────────────── */}
            <header className="border-b border-gray-800 px-4 py-3 bg-gray-900 flex items-center gap-3">
              {/* Mobile back button */}
              <button
                onClick={() => setMobilePanel("sidebar")}
                className="md:hidden text-gray-400 hover:text-white mr-1"
                aria-label="Back to job list"
              >
                ←
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm font-semibold text-white truncate">
                    {selectedJob.trade ?? "General Repair"}
                  </h1>
                  <StatusBadge status={selectedJob.status} />
                </div>
                {getJobCity(selectedJob.location) && (
                  <p className="text-xs text-gray-500 truncate">
                    {getJobCity(selectedJob.location)}
                  </p>
                )}
              </div>

              <Link
                href={`/ai-assistant?job=${selectedJob.id}`}
                className="flex-shrink-0 bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                🧠 Ask AI
              </Link>
            </header>

            {/* ── Scrollable body ───────────────────────────── */}
            <div className="flex-1 overflow-y-auto">

              {/* Workflow card + actions — always show when job is active */}
              <div className="p-4 space-y-3 border-b border-gray-800">
                <JobWorkflowCard status={selectedJob.status} />

                <JobCompletionActions
                  jobId={selectedJob.id}
                  status={selectedJob.status}
                  userId={selectedJob.userId}
                  contractorId={selectedJob.claimedBy}
                />

                {selectedJob.claimedBy && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <RevealContactButton
                      jobId={selectedJob.id}
                      contractorId={selectedJob.claimedBy}
                    />
                    <ReputationBadge contractorId={selectedJob.claimedBy} />
                  </div>
                )}
              </div>

              {/* Provider selection — homeowner only, before anyone claimed */}
              {user.uid === selectedJob.userId && !selectedJob.claimedBy && (
                <div className="p-4 border-b border-gray-800">
                  <ProviderSelection
                    jobId={selectedJob.id}
                    trade={selectedJob.trade}
                    location={{ city: getJobCity(selectedJob.location) }}
                  />
                </div>
              )}

              {/* Scheduling — only after contractor accepted */}
              {selectedJob.claimedBy &&
                ["accepted", "in_progress", "completed"].includes(selectedJob.status) && (
                <div className="p-4 border-b border-gray-800">
                  <SchedulingCard
                    jobId={selectedJob.id}
                    jobOwnerId={selectedJob.userId}
                    claimedBy={selectedJob.claimedBy}
                  />
                </div>
              )}

              {/* Payment — homeowner only, after job is accepted */}
              {user.uid === selectedJob.userId &&
                ["accepted", "in_progress"].includes(selectedJob.status) && (
                <div className="p-4 border-b border-gray-800">
                  <PaymentCard
                    jobId={selectedJob.id}
                    amountUsd={selectedJob.paymentAmountUsd}
                    paymentStatus={selectedJob.paymentStatus ?? null}
                    onPaymentHeld={() => {
                      // Optimistically update local state
                      setSelectedJob((j) => j ? { ...j, paymentStatus: "held" } : j);
                    }}
                  />
                </div>
              )}

              {/* Review — only after homeowner confirms */}
              {["confirmed", "verified"].includes(selectedJob.status) && (
                <div className="p-4 border-b border-gray-800">
                  <ReviewCard
                    jobId={selectedJob.id}
                    jobOwnerId={selectedJob.userId}
                    contractorId={selectedJob.claimedBy}
                    jobStatus={selectedJob.status}
                  />
                </div>
              )}

              {/* Dispute / Cancel — shown to participants based on status */}
              {["accepted", "in_progress", "completed", "triaged"].includes(selectedJob.status) && (
                <div className="p-4 border-b border-gray-800">
                  <DisputeCard
                    jobId={selectedJob.id}
                    jobStatus={selectedJob.status}
                    isHomeowner={user.uid === selectedJob.userId}
                    isContractor={user.uid === selectedJob.claimedBy}
                    onStatusChange={() =>
                      setSelectedJob((j) => j ? { ...j, status: "disputed" as any } : j)
                    }
                  />
                </div>
              )}

              {/* Event timeline */}
              {events.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Activity
                  </p>
                  <div className="space-y-1">
                    {events.map((ev) => (
                      <div key={ev.id} className="text-xs text-gray-500 flex gap-1">
                        <span className="text-gray-600">•</span>
                        {ev.type.replace(/_/g, " ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderId === user.uid;
                    return (
                      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                            isMine
                              ? "bg-indigo-600 text-white rounded-br-sm"
                              : "bg-gray-800 text-gray-100 rounded-bl-sm"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* ── Attachments ───────────────────────────────── */}
            <div className="border-t border-gray-800 px-4 pt-3">
              <CaptureWidget jobId={selectedJob.id} />
            </div>

            {/* ── Message input ─────────────────────────────── */}
            <form
              onSubmit={sendMessage}
              className="flex gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900"
            >
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-gray-800 text-white placeholder-gray-500 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm font-medium transition"
              >
                {sending ? "…" : "Send"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
