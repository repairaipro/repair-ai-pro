'use client';

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { TRADES } from "@/lib/constants";
import { Search, Plus, MapPin, Briefcase, X, SlidersHorizontal, Clock, Zap, TrendingUp, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { GridSkeletonLoader } from "@/components/AnimatedSkeleton";
import { ScrollReveal } from "@/components/ScrollReveal";

const TRADE_EMOJI: Record<string, string> = {
  plumbing: '🔧', electrical: '⚡', hvac: '❄️', carpentry: '🪚', roofing: '🏠',
  landscaping: '🌿', painting: '🎨', appliance: '🔌', 'appliance repair': '🔌',
  handyman: '🔨', general: '🔨', 'auto mechanic': '🚗', flooring: '🪵',
  cleaning: '🧽', masonry: '🧱', 'pest control': '🐛', 'pool & spa': '🏊',
};

function tradeEmoji(trade?: string): string {
  return TRADE_EMOJI[(trade ?? '').toLowerCase()] ?? '🛠️';
}

function timeAgo(ts: any): string {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d) return '';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
  } catch { return ''; }
}

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
  urgency?: string;
  isEmergency?: boolean;
  bidCount?: number;
  estimatedCost?: { low?: number; high?: number; typical?: number };
  aiDetectedTrade?: string;
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
  const { user } = useAuth();
  const authLoading = user === undefined; // undefined = auth still resolving, null = signed out
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    if (authLoading) return;
    // Jobs contain personal details — Firestore rules require sign-in to read
    if (!user) { setLoading(false); return; }

    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(150));
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
  }, [user, authLoading]);

  /* Signed-out visitors get a sign-in gate instead of a permission error */
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center" style={{ background: 'var(--color-bg)' }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <Briefcase className="w-8 h-8" style={{ color: '#818cf8' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Sign in to browse jobs</h1>
          <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-4)' }}>
            Job posts include location details, so we keep them visible to signed-in members only.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/auth/signin" className="btn btn-primary btn-sm">Sign In</Link>
          <Link href="/contractor" className="btn btn-secondary btn-sm">Browse Contractors</Link>
        </div>
      </div>
    );
  }

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
            {filtered.slice(0, visibleCount).map((job, index) => {
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
                    href={`/jobs/${job.id}`}
                    className="job-card group relative flex flex-col rounded-2xl overflow-hidden h-full"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', transition: 'transform .2s ease, border-color .2s ease, box-shadow .2s ease' }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'rgba(99,102,241,0.45)';
                      el.style.transform = 'translateY(-3px)';
                      el.style.boxShadow = '0 18px 40px -16px rgba(99,102,241,0.35)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'var(--color-border)';
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = 'none';
                    }}
                  >
                    {/* Media / gradient header */}
                    <div className="relative h-40 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.10))' }}>
                      {Array.isArray(job.images) && job.images[0] ? (
                        <>
                          <img
                            src={job.images[0]}
                            alt="Job preview"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,11,17,0.85), transparent 60%)' }} />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span style={{ fontSize: 56, opacity: 0.9, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>{tradeEmoji(job.trade ?? job.aiDetectedTrade)}</span>
                        </div>
                      )}

                      {/* Status pill (top-left) */}
                      <span
                        className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur"
                        style={{ background: 'rgba(10,11,17,0.55)', border: `1px solid ${s.border}`, color: s.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>

                      {/* Emergency flag (top-right) */}
                      {(job.isEmergency || job.urgency === 'emergency') && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                          <Zap className="w-2.5 h-2.5" /> Emergency
                        </span>
                      )}

                      {/* Title overlaid on media */}
                      {Array.isArray(job.images) && job.images[0] && (
                        <h3 className="absolute bottom-2.5 left-3 right-3 font-bold text-sm flex items-center gap-1.5" style={{ color: '#fff' }}>
                          <span>{tradeEmoji(job.trade ?? job.aiDetectedTrade)}</span>
                          {job.trade ?? job.aiDetectedTrade ?? 'General'} Repair
                        </h3>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4 flex flex-col gap-2.5 flex-1">
                      {!(Array.isArray(job.images) && job.images[0]) && (
                        <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                          {job.trade ?? job.aiDetectedTrade ?? 'General'} Repair
                        </h3>
                      )}

                      <p className="text-[13px] leading-relaxed line-clamp-2 flex-1" style={{ color: 'var(--color-text-3)' }}>
                        {job.description}
                      </p>

                      {/* Estimate chip */}
                      {job.estimatedCost?.low && job.estimatedCost?.high && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold w-fit px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                          <TrendingUp className="w-3 h-3" />
                          Est. ${job.estimatedCost.low}–${job.estimatedCost.high}
                        </div>
                      )}

                      {/* Footer meta */}
                      <div className="flex items-center gap-3 pt-2 mt-auto text-[11px]" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-4)' }}>
                        {city && (
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{city}</span>
                          </span>
                        )}
                        {job.createdAt != null && (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3" /> {timeAgo(job.createdAt)}
                          </span>
                        )}
                        <span className="ml-auto flex items-center gap-0.5 font-semibold flex-shrink-0 transition-colors group-hover:text-[var(--color-brand)]" style={{ color: 'var(--color-text-3)' }}>
                          {typeof job.bidCount === 'number' && job.bidCount > 0
                            ? `${job.bidCount} bid${job.bidCount === 1 ? '' : 's'}`
                            : 'View'}
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Show more */}
        {!loading && filtered.length > visibleCount && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setVisibleCount((c) => c + 30)}
              className="btn btn-secondary btn-sm"
            >
              Show more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
