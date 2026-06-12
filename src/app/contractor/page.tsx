'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TRADES } from "@/lib/constants";
import { Search, MapPin, Star, Briefcase, Trophy, DollarSign, MessageSquare, X, ChevronRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

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
  qualityScore?: number;        // denormalized overall score (0-100)
  verifiedSpecialties?: number; // count of verified specializations
  responseScore?: number;       // 0-100, higher = faster responder (>=75 ≈ under ~6h)
};

function ContractorCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton w-20 h-20 rounded-full mx-auto" />
      <div className="skeleton h-4 w-1/2 mx-auto rounded" />
      <div className="skeleton h-3 w-2/3 mx-auto rounded" />
      <div className="skeleton h-9 w-full mt-4 rounded-lg" />
      <div className="skeleton h-9 w-full rounded-lg" />
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
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    async function load() {
      try {
        // Public sanitized endpoint — works for signed-out visitors and crawlers
        const res = await fetch("/api/public/contractors");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setContractors(data.contractors ?? []);
      } catch (err) {
        console.error("Contractor load error:", err);
        setError("Could not load contractors. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = contractors
    .filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || (c.name ?? "").toLowerCase().includes(q) || (c.trade ?? "").toLowerCase().includes(q) || (c.city ?? "").toLowerCase().includes(q);
      const matchTrade = !trade || c.trade === trade;
      const matchCity = !city.trim() || (c.city ?? "").toLowerCase().includes(city.toLowerCase());
      return matchSearch && matchTrade && matchCity;
    })
    .sort((a, b) => {
      if (sort === "experience") return (b.experience ?? 0) - (a.experience ?? 0);
      if (sort === "price") return (a.hourly ?? 999) - (b.hourly ?? 999);
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "quality") return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
      return 0;
    });

  const hasActiveFilters = search.trim() || trade || city.trim();

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Find a Contractor</h1>
          {!loading && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
              {filtered.length} of {contractors.length} contractors
            </p>
          )}
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl px-4 py-3 text-sm flex justify-between items-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card p-4 flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, trade, or city…"
              className="input pl-9"
            />
          </div>
          <select value={trade} onChange={(e) => setTrade(e.target.value)} className="input" style={{ width: 'auto', minWidth: '140px' }}>
            <option value="">All Trades</option>
            {TRADES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="input pl-9"
              style={{ width: '140px' }}
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" style={{ width: 'auto', minWidth: '140px' }}>
            <option value="relevance">Sort: Relevance</option>
            <option value="quality">Quality Score</option>
            <option value="rating">Highest Rated</option>
            <option value="experience">Most Experienced</option>
            <option value="price">Lowest Price</option>
          </select>
          {hasActiveFilters && (
            <button onClick={() => { setSearch(""); setTrade(""); setCity(""); }} className="btn btn-ghost btn-sm">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <ContractorCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              👷
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>No contractors match your filters</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Try a different trade or city.</p>
                <button onClick={() => { setSearch(""); setTrade(""); setCity(""); }} className="btn btn-secondary btn-sm">
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>No contractors yet</h3>
                <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-4)' }}>
                  Are you a contractor? Set up your profile to start receiving jobs.
                </p>
                <Link href="/contractor/profile" className="btn btn-primary btn-sm">Set Up Profile</Link>
              </>
            )}
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.slice(0, visibleCount).map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: (i % 6) * 0.05 }}
                viewport={{ once: true, margin: "-50px" }}
                className="card p-5 flex flex-col transition-all duration-200"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                }}
              >
                {/* Avatar */}
                {c.photoUrl ? (
                  <Image
                    src={c.photoUrl}
                    width={80}
                    height={80}
                    alt={c.name ?? "Contractor"}
                    className="rounded-full mx-auto object-cover"
                    style={{ width: '80px', height: '80px', border: '2px solid var(--color-border)' }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))',
                      border: '2px solid rgba(99,102,241,0.3)',
                      color: '#818cf8',
                    }}
                  >
                    {(c.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <h2 className="text-sm font-semibold text-center mt-3" style={{ color: 'var(--color-text)' }}>
                  {c.name ?? "Unnamed Contractor"}
                </h2>

                {/* Trade + city */}
                <p className="text-center text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
                  {c.trade ?? "No trade listed"}
                  {c.city ? ` · ${c.city}` : ""}
                </p>

                {/* Stats row */}
                <div className="flex justify-center gap-3 mt-3 flex-wrap">
                  {c.rating != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#fbbf24' }}>
                      <Star className="w-3 h-3 fill-current" />
                      {c.rating.toFixed(1)}
                      <span style={{ color: 'var(--color-text-4)' }}>({c.reviewCount ?? 0})</span>
                    </div>
                  )}
                  {c.jobsCompleted != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-4)' }}>
                      <Briefcase className="w-3 h-3" />
                      {c.jobsCompleted} jobs
                    </div>
                  )}
                  {c.experience != null && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-4)' }}>
                      <Trophy className="w-3 h-3" />
                      {c.experience}yr
                    </div>
                  )}
                </div>

                {/* Quality score + verified specialties + responsiveness */}
                {(c.qualityScore != null && c.qualityScore > 0) || (c.verifiedSpecialties != null && c.verifiedSpecialties > 0) || (c.responseScore != null && c.responseScore >= 75) ? (
                  <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                    {c.qualityScore != null && c.qualityScore > 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: c.qualityScore >= 80
                            ? 'rgba(34,197,94,0.12)'
                            : c.qualityScore >= 60
                              ? 'rgba(251,191,36,0.12)'
                              : 'rgba(107,114,128,0.12)',
                          color: c.qualityScore >= 80
                            ? '#22c55e'
                            : c.qualityScore >= 60
                              ? '#fbbf24'
                              : '#9ca3af',
                          border: `1px solid ${c.qualityScore >= 80
                            ? 'rgba(34,197,94,0.25)'
                            : c.qualityScore >= 60
                              ? 'rgba(251,191,36,0.25)'
                              : 'rgba(107,114,128,0.25)'}`,
                        }}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Score {c.qualityScore}
                      </span>
                    )}
                    {c.verifiedSpecialties != null && c.verifiedSpecialties > 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                      >
                        ✓ {c.verifiedSpecialties} verified {c.verifiedSpecialties === 1 ? 'specialty' : 'specialties'}
                      </span>
                    )}
                    {c.responseScore != null && c.responseScore >= 75 && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}
                      >
                        ⚡ Fast responder
                      </span>
                    )}
                  </div>
                ) : null}

                {/* Rate */}
                {c.hourly != null && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-sm font-semibold" style={{ color: '#34d399' }}>
                    <DollarSign className="w-3.5 h-3.5" />
                    From ${c.hourly}/hr
                  </div>
                )}

                {/* Portfolio */}
                {Array.isArray(c.portfolio) && c.portfolio.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                    {c.portfolio.slice(0, 3).map((img, i) => (
                      <Image
                        key={i}
                        src={img}
                        width={90}
                        height={60}
                        alt="Portfolio"
                        className="rounded-lg flex-shrink-0 object-cover"
                        style={{ width: '90px', height: '60px', border: '1px solid var(--color-border)' }}
                      />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-4 flex flex-col gap-2">
                  <Link href={`/contractor/${c.id}`} className="btn btn-primary btn-sm text-center">
                    View Profile <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link href={`/jobs/new?contractor=${c.id}`} className="btn btn-secondary btn-sm text-center">
                    <MessageSquare className="w-3.5 h-3.5" /> Request a Quote
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
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
    </div>
  );
}
