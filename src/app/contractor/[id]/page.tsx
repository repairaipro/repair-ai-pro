'use client';

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import {
  Star, MapPin, Briefcase, Clock, CheckCircle2, Award,
  Share2, ChevronLeft, Brain, Loader2, MessageSquare,
  Shield, Zap, ChevronRight, Copy, Check,
} from "lucide-react";
import { ProfileGallery } from "@/components/ProfileGallery";
import { ServiceAreaMap } from "@/components/ServiceAreaMap";
import { CertificationBadges, type Certification } from "@/components/CertificationBadges";
import { ResponseTimeBadge } from "@/components/ResponseTimeBadge";

/* ── Types ── */
type Review = {
  id:          string;
  reviewerId?: string;
  rating:      number;
  text:        string;
  createdAt?:  any;
};
interface PortfolioImage {
  url: string;
  serviceType: string;
  caption?: string;
  beforeAfter?: 'before' | 'after';
}

type ContractorProfile = {
  name?:                    string;
  trade?:                   string;
  trades?:                  string[];
  experience?:              number;
  bio?:                     string;
  city?:                    string;
  state?:                   string;
  photoUrl?:                string;
  portfolio?:               string[];
  images?:                  PortfolioImage[];
  certifications?:          Certification[];
  avgRating?:               number;
  reviewCount?:             number;
  jobsCompleted?:           number;
  trustScore?:              number;
  availability?:            string;
  stripeConnectVerified?:   boolean;
  subscriptionPlan?:        string;
  responseTime?:            number;
  responseTimeMinutes?:     number;
  averageResponseMinutes?:  number;
  serviceRadiusMiles?:      number;
  zipCode?:                 string;
};

/* ── Star renderer ── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(rating) ? '#fbbf24' : 'none'}
          style={{ color: n <= Math.round(rating) ? '#fbbf24' : 'var(--color-border)' }}
        />
      ))}
    </span>
  );
}

/* ── Trust badge ── */
function TrustBadge({ score, plan }: { score: number; plan?: string }) {
  const isPro   = plan === "pro" || plan === "elite";
  const isElite = plan === "elite";

  if (isElite) return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>
      <Award size={11} /> Elite
    </span>
  );
  if (isPro) return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8' }}>
      <Zap size={11} /> Pro
    </span>
  );
  if (score >= 20) return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-success)' }}>
      <CheckCircle2 size={11} /> Verified
    </span>
  );
  return null;
}

/* ── Main component ── */
export default function ContractorProfilePage({ params }: { params: { id?: string } }) {
  const { user } = useAuth();
  const contractorId = typeof params?.id === "string" ? params.id : "";

  const [profile,        setProfile]        = useState<ContractorProfile | null>(null);
  const [reviews,        setReviews]        = useState<Review[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [aiSummary,      setAISummary]      = useState("");
  const [aiLoading,      setAILoading]      = useState(false);
  const [copied,         setCopied]         = useState(false);

  if (!contractorId) {
    return <div className="p-6 text-sm" style={{ color: 'var(--color-text-4)' }}>Loading…</div>;
  }

  /* Load profile */
  useEffect(() => {
    setProfileLoading(true);
    getDoc(doc(db, "contractors", contractorId))
      .then((snap) => setProfile(snap.exists() ? (snap.data() as ContractorProfile) : null))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [contractorId]);

  /* Load reviews live */
  useEffect(() => {
    const q    = query(collection(db, "contractors", contractorId, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return unsub;
  }, [contractorId]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return profile?.avgRating ?? 0;
    return reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length;
  }, [reviews, profile]);

  const reviewCount = reviews.length || profile?.reviewCount || 0;

  async function runAIAnalysis() {
    if (!profile) return;
    setAILoading(true);
    setAISummary("");
    try {
      const res  = await fetch("/api/ai-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message: `Analyze this contractor and give a trust assessment, strengths, best job types, and a brief recommendation in 3-4 sentences:
Name: ${profile.name ?? ""}
Trade: ${profile.trade ?? ""}
Experience: ${profile.experience ?? 0} years
City: ${profile.city ?? ""}
Bio: ${profile.bio ?? ""}
Rating: ${avgRating.toFixed(1)} (${reviewCount} reviews)
Reviews: ${reviews.slice(0, 5).map((r) => `${r.rating}★ — "${r.text}"`).join(" | ")}`,
        }),
      });
      const data = await res.json();
      setAISummary(data.reply ?? "Analysis unavailable.");
    } catch {
      setAISummary("Analysis unavailable. Please try again.");
    }
    setAILoading(false);
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatDate(ts: any) {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch { return ""; }
  }

  /* Loading skeleton */
  if (profileLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5" style={{ background: 'var(--color-bg)' }}>
        <div className="h-6 w-24 rounded animate-pulse" style={{ background: 'var(--color-surface)' }} />
        <div className="rounded-2xl p-6 space-y-4 animate-pulse" style={{ background: 'var(--color-surface)' }}>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl" style={{ background: 'var(--color-surface-2)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 rounded" style={{ background: 'var(--color-surface-2)' }} />
              <div className="h-4 w-32 rounded" style={{ background: 'var(--color-surface-2)' }} />
              <div className="h-4 w-24 rounded" style={{ background: 'var(--color-surface-2)' }} />
            </div>
          </div>
        </div>
        {[0,1,2].map(i => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)' }} />
        ))}
      </div>
    );
  }

  /* Not found */
  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Contractor not found</p>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-4)' }}>This profile may have been removed or the link is incorrect.</p>
        <Link href="/contractor" className="btn btn-primary">Browse Contractors</Link>
      </div>
    );
  }

  const tradesList = profile.trades?.length ? profile.trades : profile.trade ? [profile.trade] : ["General Contractor"];
  const isPro      = profile.subscriptionPlan === "pro" || profile.subscriptionPlan === "elite";

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Back nav */}
        <Link
          href="/contractor"
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-3)' }}
        >
          <ChevronLeft size={15} /> All Contractors
        </Link>

        {/* ── Profile hero card ── */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
              >
                {profile.photoUrl ? (
                  <Image src={profile.photoUrl} alt={profile.name ?? ""} fill className="object-cover" />
                ) : (
                  (profile.name ?? "?")[0].toUpperCase()
                )}
              </div>
              {profile.availability === "available" && (
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
                  style={{ background: 'var(--color-success)', borderColor: 'var(--color-surface)' }}
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                    {profile.name || "Professional Contractor"}
                  </h1>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {tradesList.slice(0, 3).map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--color-brand-dim)', color: 'var(--color-brand)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TrustBadge score={profile.trustScore ?? 0} plan={profile.subscriptionPlan} />
                  <button
                    onClick={handleShare}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-4)' }}
                  >
                    {copied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Share2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Location & experience */}
              <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                {(profile.city || profile.state) && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-4)' }}>
                    <MapPin size={11} /> {[profile.city, profile.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {profile.experience && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-4)' }}>
                    <Clock size={11} /> {profile.experience} yrs experience
                  </span>
                )}
                {profile.stripeConnectVerified && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
                    <Shield size={11} /> Payouts verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating + stats bar */}
          <div
            className="grid grid-cols-3 gap-4 mt-5 pt-5"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div className="text-center">
              <div className="flex justify-center mb-1">
                <Stars rating={avgRating} size={15} />
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>{reviewCount} reviews</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: 'var(--color-brand)' }}>
                {profile.jobsCompleted ?? 0}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-4)' }}>Jobs done</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: profile.availability === "available" ? 'var(--color-success)' : '#fb923c' }}>
                {profile.availability === "available" ? "Open" : "Busy"}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-4)' }}>Availability</p>
            </div>
          </div>

          {/* Response Time Badge */}
          {(profile.averageResponseMinutes ?? 0) > 0 && (
            <div className="mt-4">
              <ResponseTimeBadge averageResponseMinutes={profile.averageResponseMinutes ?? 0} />
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3 mt-5">
            <Link
              href={`/jobs/new?contractor=${contractorId}`}
              className="btn btn-primary flex-1"
              style={{ justifyContent: 'center' }}
            >
              <Briefcase size={15} /> Hire {profile.name?.split(" ")[0] ?? "Contractor"}
            </Link>
            <Link
              href={`/chat?contractor=${contractorId}`}
              className="btn btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              <MessageSquare size={15} /> Message
            </Link>
          </div>
        </div>

        {/* ── Bio ── */}
        {profile.bio && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-4)' }}>About</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-2)' }}>
              {profile.bio}
            </p>
          </div>
        )}

        {/* ── Portfolio Gallery ── */}
        {Array.isArray(profile.images) && profile.images.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-4)' }}>Portfolio</h2>
            <ProfileGallery images={profile.images} contractorName={profile.name ?? "Contractor"} />
          </div>
        )}

        {/* ── Legacy Portfolio (backward compat) ── */}
        {(!Array.isArray(profile.images) || profile.images.length === 0) && Array.isArray(profile.portfolio) && profile.portfolio.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-4)' }}>Portfolio</h2>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {profile.portfolio.map((url, i) => (
                <div key={i} className="relative w-36 h-28 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ border: '1px solid var(--color-border)' }}>
                  <Image src={url} alt={`Work ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Certifications ── */}
        {Array.isArray(profile.certifications) && profile.certifications.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-4)' }}>Credentials</h2>
            <CertificationBadges certifications={profile.certifications} />
          </div>
        )}

        {/* ── Service Area Map ── */}
        {profile.zipCode && profile.serviceRadiusMiles && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-4)' }}>Service Area</h2>
            <ServiceAreaMap
              zipCode={profile.zipCode}
              radiusMiles={profile.serviceRadiusMiles}
              city={profile.city}
              state={profile.state}
            />
          </div>
        )}

        {/* ── AI Analysis ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: 'rgba(99,102,241,0.07)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}
          >
            <div className="flex items-center gap-2">
              <Brain size={15} style={{ color: 'var(--color-brand)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>AI Trust Analysis</span>
            </div>
            <button
              onClick={runAIAnalysis}
              disabled={aiLoading}
              className="btn btn-sm btn-primary"
              style={{ opacity: aiLoading ? 0.7 : 1 }}
            >
              {aiLoading ? <><Loader2 size={12} className="animate-spin" /> Analyzing…</> : "Analyze"}
            </button>
          </div>
          <div className="p-5" style={{ background: 'var(--color-surface)' }}>
            {aiSummary ? (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{aiSummary}</p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
                Click "Analyze" to get an AI-powered trust assessment based on this contractor's profile and reviews.
              </p>
            )}
          </div>
        </div>

        {/* ── Reviews ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <Star size={15} style={{ color: '#fbbf24' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                Reviews {reviewCount > 0 && `(${reviewCount})`}
              </span>
            </div>
            {user && (
              <Link
                href={`/contractor/${contractorId}/reviews/new`}
                className="btn btn-sm btn-secondary flex items-center gap-1.5"
              >
                Write Review
              </Link>
            )}
          </div>

          <div style={{ background: 'var(--color-surface)' }}>
            {reviews.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Star size={28} style={{ color: 'var(--color-border)', margin: '0 auto 8px' }} />
                <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>No reviews yet — be the first!</p>
              </div>
            ) : (
              reviews.map((rev, idx) => (
                <div
                  key={rev.id}
                  className="px-5 py-4"
                  style={{ borderBottom: idx < reviews.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Stars rating={rev.rating} size={13} />
                    <span className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                      {formatDate(rev.createdAt)}
                    </span>
                  </div>
                  {rev.text && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{rev.text}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Ready to hire {profile.name?.split(" ")[0] ?? "this contractor"}?
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-4)' }}>
            Post a job and they'll be matched instantly. Payment held in escrow until you confirm.
          </p>
          <Link
            href={`/jobs/new?contractor=${contractorId}`}
            className="btn btn-primary btn-lg inline-flex"
          >
            <Briefcase size={16} /> Post a Job <ChevronRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}
