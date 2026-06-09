'use client';

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import Link from "next/link";
import { TRADES } from "@/lib/constants";
import { Search, Plus, MapPin, Briefcase, X, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { GridSkeletonLoader } from "@/components/AnimatedSkeleton";
import { ScrollReveal } from "@/components/ScrollReveal";

const STATUSES = ["open","triaged","matched","accepted","in_progress","completed","confirmed","disputed","cancelled","closed"];

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  open:        { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', color: '#9ca3af', label: 'Open' },
  triaged:     { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  color: '#fbbf24', label: 'Triaged' },
  matched:     { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  color: '#60a5fa', label: 'Matched' },
  accepted:    { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  color: '#818cf8', label: 'Accepted' },
  claimed:     { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  color: '#818cf8', label: 'Claimed' },
  in_progress: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)',  color: '#fb923c', label: 'In Progress' },
  completed:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',  color: '#34d399', label: 'Completed' },
  confirmed:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',  color: '#34d399', label: 'Confirmed' },
  verified:    { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)',  color: '#34d399', label: 'Verified' },
  closed:      { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', color: '#9ca3af', label: 'Closed' },
  cancelled:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   color: '#f87171', label: 'Cancelled' },
};

type Job = {
  id: string;
  description: string;
  trade?: string;
  location?: string | Record<string, unknown>;
  status: string;
  images?: string[];
  createdAt?: unknown;
};

function getCity(location: Job["location"], privacyMode?: string): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  if (privacyMode === "zip_only") {
    return (location as any).zipcode ? `ZIP ${(location as any).zipcode}` : "Location hidden";
  }
  return (location as any).city ?? (location as any).zipcode ?? "";
}

function JobCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
      <div className="skeleton h-5 w-20 rounded-full" />
    </div>
  );
}

export default function JobMarketplacePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q,
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Jobs listing error:", err);
        setError("Could not load jobs. Check your connection and try again.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = jobs.filter((job) => {
    const matchSearch =
      !search.trim() ||
      job.description.toLowerCase().includes(search.toLowerCase()) ||
      (job.trade ?? "").toLowerCase().includes(search.toLowerCase()) ||
      getCity(job.location, (job as any).locationPrivacyMode).toLowerCase().includes(search.toLowerCase());
    const matchTrade = tradeFilter === "all" || job.trade?.toLowerCase() === tradeFilter.toLowerCase();
    const matchStatus = statusFilter === "all" || job.status === statusFilter;
    return matchSearch && matchTrade && matchStatus;
  });

  const hasActiveFilters = search.trim() || tradeFilter !== "all" || statusFilter !== "all";

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Job Marketplace</h1>
            {!loading && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                {filtered.length} of {jobs.length} jobs
              </p>
            )}
          </div>
          <Link href="/jobs/new" className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" /> Post a Job
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex justify-between items-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Filter bar */}
        <div
          className="card p-4 flex flex-wrap gap-3 items-center"
        >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description, trade, or city…"
              className="input pl-9"
            />
          </div>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="all">All Trades</option>
            {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setTradeFilter("all"); setStatusFilter("all"); }}
              className="btn btn-ghost btn-sm"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <GridSkeletonLoader count={6} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Briefcase className="w-8 h-8" style={{ color: 'var(--color-text-4)' }} />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>No jobs match your filters</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Try adjusting or clearing the filters above.</p>
                <button
                  onClick={() => { setSearch(""); setTradeFilter("all"); setStatusFilter("all"); }}
                  className="btn btn-secondary btn-sm"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>No jobs posted yet</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Be the first to post a job and get matched with a contractor.</p>
                <Link href="/jobs/new" className="btn btn-primary btn-sm">
                  <Plus className="w-3.5 h-3.5" /> Post a Job
                </Link>
              </>
            )}
          </div>
        ) : (
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {filtered.map((job, index) => {
              const s = STATUS_STYLES[job.status] ?? STATUS_STYLES.open;
              const city = getCity(job.location, (job as any).locationPrivacyMode);
              return (
                <motion.div
                  key={job.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: 'spring',
                        stiffness: 100,
                        damping: 20,
                      },
                    },
                  }}
                >
                  <Link
                    href={`/chat?job=${job.id}`}
                    className="card p-4 flex flex-col gap-3 transition-all duration-200 group"
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                  {Array.isArray(job.images) && job.images[0] && (
                    <img
                      src={job.images[0]}
                      alt="Job preview"
                      className="w-full h-36 object-cover rounded-xl"
                      style={{ border: '1px solid var(--color-border)' }}
                    />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {job.trade ?? "General"} Repair
                    </h3>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>

                  <p className="text-sm line-clamp-2 flex-1" style={{ color: 'var(--color-text-4)' }}>
                    {job.description}
                  </p>

                  {city && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-4)' }}>
                      <MapPin className="w-3 h-3" />
                      {city}
                    </div>
                  )}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
