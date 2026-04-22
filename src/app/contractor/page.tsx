'use client';

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { collection, getDocs } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";

import { TRADES } from "@/lib/constants";

type Contractor = {
  id: string;
  name?: string;
  trade?: string;
  city?: string;
  bio?: string;
  experience?: number;
  hourly?: number;
  photoUrl?: string;
  portfolio?: string[];
  rating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />;
}

function ContractorCardSkeleton() {
  return (
    <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-3">
      <Skeleton className="w-24 h-24 rounded-full mx-auto" />
      <Skeleton className="h-5 w-1/2 mx-auto" />
      <Skeleton className="h-3 w-2/3 mx-auto" />
      <Skeleton className="h-9 w-full mt-4 rounded-lg" />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export default function ContractorDirectory() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("relevance");

  /* ── Load contractors once ────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "contractors"));
        // Filter out listings that have been claimed/merged into another account
        setContractors(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((c: any) => !c.claimedByUid)
        );
      } catch (err) {
        console.error("Contractor load error:", err);
        setError("Could not load contractors. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Filter + sort ────────────────────────────────────────────────────── */
  const filtered = contractors
    .filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.trade ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q);

      const matchTrade = !trade || c.trade === trade;
      const matchCity = !city.trim() || (c.city ?? "").toLowerCase().includes(city.toLowerCase());

      return matchSearch && matchTrade && matchCity;
    })
    .sort((a, b) => {
      if (sort === "experience") return (b.experience ?? 0) - (a.experience ?? 0);
      if (sort === "price") return (a.hourly ?? 999) - (b.hourly ?? 999);
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });

  const hasActiveFilters = search.trim() || trade || city.trim();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-indigo-400">Find a Contractor 🔍</h1>
        {!loading && (
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} of {contractors.length} contractors
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, trade, or city…"
          className="flex-1 min-w-[180px] bg-gray-900 border border-gray-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        />
        <select
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          className="bg-gray-900 border border-gray-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Trades</option>
          {TRADES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="bg-gray-900 border border-gray-800 px-3 py-2.5 rounded-lg text-sm w-36 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-gray-900 border border-gray-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="relevance">Sort: Relevance</option>
          <option value="rating">Highest Rated</option>
          <option value="experience">Most Experienced</option>
          <option value="price">Lowest Price</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setTrade(""); setCity(""); }}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <ContractorCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <span className="text-5xl">👷</span>
          {hasActiveFilters ? (
            <>
              <h3 className="text-lg font-semibold text-white">No contractors match your filters</h3>
              <p className="text-sm text-gray-500">Try a different trade or city.</p>
              <button
                onClick={() => { setSearch(""); setTrade(""); setCity(""); }}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm px-4 py-2 rounded-lg transition"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white">No contractors yet</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Are you a contractor? Set up your profile to start receiving jobs.
              </p>
              <Link
                href="/contractor/profile"
                className="bg-indigo-600 hover:bg-indigo-700 text-sm px-5 py-2.5 rounded-lg font-medium transition"
              >
                Set Up Profile
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-gray-900 p-5 rounded-xl border border-gray-800 hover:border-indigo-500 transition shadow-md flex flex-col"
            >
              {/* Photo */}
              {c.photoUrl ? (
                <Image
                  src={c.photoUrl}
                  width={96}
                  height={96}
                  alt={c.name ?? "Contractor"}
                  className="rounded-full mx-auto border border-gray-700 w-24 h-24 object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-gray-800 flex items-center justify-center text-2xl">
                  👷
                </div>
              )}

              {/* Name */}
              <h2 className="text-base font-semibold text-center mt-3 text-white">
                {c.name ?? "Unnamed Contractor"}
              </h2>

              {/* Trade + city */}
              <p className="text-center text-sm text-gray-400 mt-1">
                {c.trade ?? "No trade listed"}
                {c.city ? ` • ${c.city}` : ""}
              </p>

              {/* Stats */}
              <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
                {c.rating != null && (
                  <span>⭐ {c.rating.toFixed(1)} ({c.reviewCount ?? 0})</span>
                )}
                {c.jobsCompleted != null && (
                  <span>✅ {c.jobsCompleted} jobs</span>
                )}
                {c.experience != null && (
                  <span>🏆 {c.experience}yr</span>
                )}
              </div>

              {/* Rate */}
              {c.hourly != null && (
                <p className="text-center text-sm text-green-400 mt-2">
                  From ${c.hourly}/hr
                </p>
              )}

              {/* Portfolio preview */}
              {Array.isArray(c.portfolio) && c.portfolio.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
                  {c.portfolio.slice(0, 3).map((img, i) => (
                    <Image
                      key={i}
                      src={img}
                      width={120}
                      height={80}
                      alt="Portfolio"
                      className="rounded-lg border border-gray-700 flex-shrink-0 object-cover"
                    />
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-auto pt-4 flex flex-col gap-2">
                <Link
                  href={`/contractor/${c.id}`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-center py-2 rounded-lg text-sm font-medium transition"
                >
                  View Profile
                </Link>
                <Link
                  href={`/chat?contractor=${c.id}`}
                  className="bg-gray-800 hover:bg-gray-700 text-center py-2 rounded-lg text-sm border border-gray-700 hover:border-indigo-500 transition"
                >
                  Message / Request Quote
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
