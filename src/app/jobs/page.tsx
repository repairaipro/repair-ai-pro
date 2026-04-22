'use client';

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";

import { TRADES } from "@/lib/constants";

const STATUSES = ["open", "triaged", "matched", "accepted", "in_progress", "completed", "confirmed", "disputed", "cancelled", "closed"];

const STATUS_COLOR: Record<string, string> = {
  open:        "bg-gray-700/40 text-gray-300 border-gray-600",
  triaged:     "bg-amber-900/40 text-amber-300 border-amber-700",
  matched:     "bg-blue-900/40 text-blue-300 border-blue-700",
  accepted:    "bg-indigo-900/40 text-indigo-300 border-indigo-700",
  claimed:     "bg-indigo-900/40 text-indigo-300 border-indigo-700",
  in_progress: "bg-orange-900/40 text-orange-300 border-orange-700",
  completed:   "bg-green-900/40 text-green-300 border-green-700",
  confirmed:   "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  verified:    "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  closed:      "bg-gray-700/40 text-gray-400 border-gray-600",
  cancelled:   "bg-red-900/40 text-red-400 border-red-700",
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

function getCity(location: Job["location"]): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  return (location as any).city ?? "";
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />;
}

function JobCardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-3">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-5 w-16 rounded-full" />
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

    const unsub = onSnapshot(
      q,
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
      getCity(job.location).toLowerCase().includes(search.toLowerCase());

    const matchTrade = tradeFilter === "all" || job.trade?.toLowerCase() === tradeFilter.toLowerCase();
    const matchStatus = statusFilter === "all" || job.status === statusFilter;

    return matchSearch && matchTrade && matchStatus;
  });

  const hasActiveFilters = search.trim() || tradeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">Job Marketplace</h1>
          {!loading && (
            <p className="text-gray-500 text-sm mt-1">
              {filtered.length} of {jobs.length} jobs
            </p>
          )}
        </div>
        <Link
          href="/jobs/new"
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full text-sm font-medium transition"
        >
          + Post a Job
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by description, trade, or city…"
          className="flex-1 min-w-[180px] bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        />
        <select
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Trades</option>
          {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setTradeFilter("all"); setStatusFilter("all"); }}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <span className="text-5xl">🔧</span>
          {hasActiveFilters ? (
            <>
              <h3 className="text-lg font-semibold text-white">No jobs match your filters</h3>
              <p className="text-sm text-gray-500">Try adjusting or clearing the filters above.</p>
              <button
                onClick={() => { setSearch(""); setTradeFilter("all"); setStatusFilter("all"); }}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm px-4 py-2 rounded-lg transition"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white">No jobs posted yet</h3>
              <p className="text-sm text-gray-500">Be the first to post a job and get matched with a contractor.</p>
              <Link
                href="/jobs/new"
                className="bg-indigo-600 hover:bg-indigo-700 text-sm px-5 py-2.5 rounded-lg font-medium transition"
              >
                + Post a Job
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job) => {
            const statusCls = STATUS_COLOR[job.status] ?? "bg-gray-700/40 text-gray-300 border-gray-600";
            const city = getCity(job.location);
            return (
              <Link
                key={job.id}
                href={`/chat?job=${job.id}`}
                className="bg-gray-900 rounded-xl p-4 border border-gray-800 hover:border-indigo-500 transition flex flex-col gap-2"
              >
                {Array.isArray(job.images) && job.images[0] && (
                  <img
                    src={job.images[0]}
                    alt="Job preview"
                    className="w-full h-36 object-cover rounded-lg border border-gray-800"
                  />
                )}

                <h3 className="font-semibold text-white">
                  {job.trade ?? "General"} Repair
                </h3>

                <p className="text-gray-400 text-sm line-clamp-2 flex-1">
                  {job.description}
                </p>

                {city && (
                  <p className="text-xs text-gray-600">📍 {city}</p>
                )}

                <span className={`self-start mt-1 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCls}`}>
                  {job.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
