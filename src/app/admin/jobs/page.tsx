"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";

type Job = {
  id:               string;
  description:      string;
  trade?:           string;
  status:           string;
  userId?:          string;
  claimedBy?:       string;
  paymentStatus?:   string;
  paymentAmountUsd?: number;
  createdAt?:       any;
};

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  triaged:     { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  color: '#fbbf24', label: 'Triaged' },
  accepted:    { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)',  color: '#60a5fa', label: 'Accepted' },
  in_progress: { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)', color: '#818cf8', label: 'In Progress' },
  completed:   { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)', color: '#fb923c', label: 'Completed' },
  confirmed:   { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', color: '#34d399', label: 'Confirmed' },
  verified:    { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', color: '#34d399', label: 'Verified' },
  disputed:    { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)', color: '#fb923c', label: 'Disputed' },
  cancelled:   { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)',color: '#9ca3af', label: 'Cancelled' },
};

const PAYMENT_COLOR: Record<string, string> = {
  held:     '#fbbf24',
  released: '#34d399',
  refunded: '#818cf8',
  failed:   '#f87171',
  pending:  '#9ca3af',
};

function timeAgo(ts: any): string {
  try {
    const d = ts?.toDate?.() ?? null;
    if (!d) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

const STATUSES = ["all","triaged","accepted","in_progress","completed","confirmed","disputed","cancelled"];

export default function AdminJobsPage() {
  const [jobs,   setJobs]   = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, []);

  const filtered = jobs.filter((j) => {
    const matchStatus = filter === "all" || j.status === filter;
    const matchSearch = !search.trim() ||
      j.description?.toLowerCase().includes(search.toLowerCase()) ||
      j.trade?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Jobs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
            {jobs.length} total · showing {filtered.length}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-4)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs…"
            className="input pl-8 text-sm"
            style={{ width: '200px' }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all duration-150"
              style={{
                background: filter === s ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-2)',
                border: filter === s ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                color: filter === s ? '#a5b4fc' : 'var(--color-text-4)',
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {["Job", "Trade", "Status", "Payment", "When", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-4)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--color-text-4)' }}>
                  No jobs match
                </td>
              </tr>
            )}
            {filtered.map((job) => {
              const s = STATUS_STYLES[job.status] ?? STATUS_STYLES.cancelled;
              return (
                <tr
                  key={job.id}
                  style={{ borderTop: '1px solid var(--color-border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{job.description}</p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-text-4)' }}>{job.id.slice(0,10)}…</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-4)' }}>{job.trade ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {job.paymentAmountUsd ? (
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--color-text-2)' }}>
                          ${job.paymentAmountUsd.toFixed(2)}
                        </p>
                        <p className="text-[10px]" style={{ color: PAYMENT_COLOR[job.paymentStatus ?? ""] ?? 'var(--color-text-4)' }}>
                          {job.paymentStatus ?? "—"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--color-text-4)' }}>
                    {timeAgo(job.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                      style={{ color: '#818cf8' }}
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
