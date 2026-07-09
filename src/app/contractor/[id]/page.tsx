'use client';

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import {
  Star, MapPin, Briefcase, Clock, CheckCircle2, Award,
  Share2, ChevronLeft, Brain, Loader2, MessageSquare,
  Shield, Zap, ChevronRight, Copy, Check, TrendingUp, Wrench,
  UserPlus, UserCheck,
} from "lucide-react";
import { ProfileGallery } from "@/components/ProfileGallery";
import { ServiceAreaMap } from "@/components/ServiceAreaMap";
import { CertificationBadges, type Certification } from "@/components/CertificationBadges";
import { ResponseTimeBadge } from "@/components/ResponseTimeBadge";
import VerifiedBadge from "@/components/VerifiedBadge";

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
  verificationStatus?:      'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
  licenseVerified?:         boolean;
  insuranceVerified?:       boolean;
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
  const [embedCopied,    setEmbedCopied]    = useState(false);
  const [following,      setFollowing]      = useState(false);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [followBusy,     setFollowBusy]     = useState(false);
  const [posts,          setPosts]          = useState<any[]>([]);
  const [qualityScore,   setQualityScore]   = useState<any>(null);
  const [specs,          setSpecs]          = useState<any[]>([]);

  if (!contractorId) {
    return <div className="p-6 text-sm" style={{ color: 'var(--color-text-4)' }}>Loading…</div>;
  }

  /* Load profile + reviews via the public sanitized endpoint —
     works for signed-out visitors and search engine crawlers */
  useEffect(() => {
    setProfileLoading(true);
    fetch(`/api/public/contractors/${contractorId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setProfile(d?.contractor ?? null);
        setReviews(d?.reviews ?? []);
      })
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [contractorId]);

  /* Signed-in users get live review updates on top of the public snapshot */
  useEffect(() => {
    if (!user) return;
    const q    = query(collection(db, "contractors", contractorId, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => { /* permission denied for some accounts is fine — public data already loaded */ });
    return unsub;
  }, [contractorId, user]);

  /* Load quality score + specializations (best-effort, non-blocking) */
  useEffect(() => {
    if (!contractorId) return;
    fetch(`/api/contractors/${contractorId}/quality-score`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setQualityScore(d))
      .catch(() => {});
    fetch(`/api/contractors/${contractorId}/specializations`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.specializations && setSpecs(d.specializations))
      .catch(() => {});
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
      setAISummary(data.reply ?? `Analysis unavailable${data.error ? ` — ${data.error}` : ". Please try again."}`);
    } catch {
      setAISummary("Analysis unavailable. Please try again.");
    }
    setAILoading(false);
  }

  /* Recent work posts */
  useEffect(() => {
    if (!contractorId) return;
    fetch(`/api/posts?contractorId=${contractorId}&limit=6`)
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {});
  }, [contractorId]);

  /* Follow state (anonymous gets just the count) */
  useEffect(() => {
    if (!contractorId) return;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
        const res = await fetch(`/api/contractors/${contractorId}/follow`, { headers });
        if (!res.ok) return;
        const d = await res.json();
        setFollowing(d.following ?? false);
        setFollowerCount(d.followerCount ?? 0);
      } catch { /* non-blocking */ }
    })();
  }, [contractorId, user]);

  async function toggleFollow() {
    if (!user) { window.location.href = '/auth/signin'; return; }
    if (followBusy) return;
    setFollowBusy(true);
    // Optimistic
    setFollowing((f) => !f);
    setFollowerCount((c) => c + (following ? -1 : 1));
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/contractors/${contractorId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.ok) {
        setFollowing(d.following);
        setFollowerCount(d.followerCount);
      }
    } catch { /* optimistic state stands */ }
    finally { setFollowBusy(false); }
  }

  function handleShare() {
    const url = window.location.href;
    const title = `${profile?.name ?? 'Contractor'} on RepairAI Pro`;
    // Native share sheet on mobile; clipboard fallback on desktop
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => { /* user dismissed */ });
      return;
    }
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

  /* LocalBusiness structured data for search engines */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: profile.name || 'Professional Contractor',
    description: profile.bio || `${tradesList.join(', ')} services`,
    ...(profile.photoUrl ? { image: profile.photoUrl } : {}),
    ...(profile.city ? {
      address: {
        '@type': 'PostalAddress',
        addressLocality: profile.city,
        ...(profile.state ? { addressRegion: profile.state } : {}),
      },
    } : {}),
    knowsAbout: tradesList,
    ...(avgRating > 0 && reviewCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Math.round(avgRating * 10) / 10,
        reviewCount,
        bestRating: 5,
      },
    } : {}),
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
                  {profile.verificationStatus === 'verified' && (
                    <VerifiedBadge
                      status="verified"
                      licenseVerified={profile.licenseVerified}
                      insuranceVerified={profile.insuranceVerified}
                      size="sm"
                    />
                  )}
                  <TrustBadge score={profile.trustScore ?? 0} plan={profile.subscriptionPlan} />
                  {user?.uid !== contractorId && (
                    <button
                      onClick={toggleFollow}
                      disabled={followBusy}
                      className="h-8 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all"
                      style={following
                        ? { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8' }
                        : { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: '1px solid transparent', color: '#fff' }}
                    >
                      {following ? <UserCheck size={13} /> : <UserPlus size={13} />}
                      {following ? 'Following' : 'Follow'}
                      {followerCount > 0 && <span style={{ opacity: 0.75 }}>· {followerCount}</span>}
                    </button>
                  )}
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
              href={`/jobs/new?contractor=${contractorId}`}
              className="btn btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              <MessageSquare size={15} /> Request a Quote
            </Link>
          </div>
        </div>

        {/* ── Owner-only: embeddable badge for their own website ── */}
        {user?.uid === contractorId && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#818cf8' }}>
              Your embeddable badge
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-4)' }}>
              Put this on your website or social bio — it links customers straight to this profile.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/badge/${contractorId}`} alt="Your RepairAI badge" width={260} height={64} />
              <button
                onClick={() => {
                  const origin = window.location.origin;
                  const snippet = `<a href="${origin}/contractor/${contractorId}"><img src="${origin}/api/badge/${contractorId}" alt="${profile.name ?? 'Contractor'} — verified on RepairAI Pro" width="260" height="64" /></a>`;
                  navigator.clipboard.writeText(snippet).then(() => {
                    setEmbedCopied(true);
                    setTimeout(() => setEmbedCopied(false), 2000);
                  });
                }}
                className="btn btn-secondary btn-sm"
              >
                {embedCopied ? <><Check size={13} /> Copied!</> : <>Copy embed code</>}
              </button>
            </div>
          </div>
        )}

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

        {/* ── Recent Work Posts ── */}
        {posts.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
                Recent Work
              </h2>
              <Link href="/work" className="text-xs hover:underline" style={{ color: '#818cf8' }}>
                See feed →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {posts.slice(0, 6).map((p) => (
                <div key={p.id} className="relative group rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photos?.[0]} alt={p.caption || 'Work post'} className="w-full h-28 object-cover" loading="lazy" />
                  {(p.likeCount ?? 0) > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      style={{ background: 'rgba(0,0,0,0.65)', color: '#f87171' }}>
                      ♥ {p.likeCount}
                    </span>
                  )}
                  {p.caption && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}>
                      <p className="text-[10px] text-white leading-snug line-clamp-2">{p.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {user?.uid === contractorId && (
              <Link href="/work/post" className="btn btn-secondary btn-sm w-full mt-3" style={{ justifyContent: 'center' }}>
                + Share new work
              </Link>
            )}
          </div>
        )}

        {/* Owner with no posts yet — nudge to seed their feed */}
        {posts.length === 0 && user?.uid === contractorId && (
          <Link
            href="/work/post"
            className="block rounded-2xl p-4 text-center text-sm font-medium"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', color: '#818cf8' }}
          >
            📸 Share photos of your work — posts show here and on the public feed
          </Link>
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

        {/* ── Verified Specializations ── */}
        {specs.filter((s) => s.verified || s.completedJobs >= 3).length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--color-text-4)' }}>
              Specializations
            </h2>
            <div className="space-y-2.5">
              {specs
                .filter((s) => s.verified || s.completedJobs >= 3)
                .slice(0, 6)
                .map((s: any) => (
                  <div key={`${s.trade}-${s.specialty}`} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: s.verified ? 'rgba(52,211,153,0.12)' : 'var(--color-surface-2)', border: `1px solid ${s.verified ? 'rgba(52,211,153,0.3)' : 'var(--color-border)'}` }}
                    >
                      <Wrench size={13} style={{ color: s.verified ? '#34d399' : 'var(--color-text-4)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-2)' }}>
                        {s.specialty}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                        {s.trade} · {s.completedJobs} jobs
                        {s.averageRating > 0 && ` · ${s.averageRating.toFixed(1)}★`}
                      </p>
                    </div>
                    {s.verified && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
                      >
                        ✓ Verified
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Quality Score ── */}
        {qualityScore && qualityScore.overallScore > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
                Quality Score
              </h2>
              <span
                className="text-2xl font-black"
                style={{
                  color: qualityScore.overallScore >= 80 ? '#34d399' : qualityScore.overallScore >= 60 ? '#fbbf24' : '#fb923c',
                }}
              >
                {qualityScore.overallScore}
                <span className="text-xs font-normal" style={{ color: 'var(--color-text-4)' }}>/100</span>
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Star Rating',       value: qualityScore.rating,           max: 5,   fmt: (v: number) => v.toFixed(1) + '★' },
                { label: 'Response Time',     value: Math.max(0, 100 - (qualityScore.responseTime ?? 0) * 10), max: 100, fmt: (v: number) => v.toFixed(0) + ' pts' },
                { label: 'On-Time Completion',value: (qualityScore.timeAccuracy ?? 0) * 100, max: 100, fmt: (v: number) => v.toFixed(0) + '%' },
                { label: 'Photo Evidence',    value: (qualityScore.photoEvidenceScore ?? 0) * 100, max: 100, fmt: (v: number) => v.toFixed(0) + '%' },
                { label: 'Dispute-Free Rate', value: (1 - (qualityScore.disputeRate ?? 0)) * 100, max: 100, fmt: (v: number) => v.toFixed(0) + '%' },
              ].map(({ label, value, max, fmt }) => {
                const pct = Math.min(100, (value / max) * 100);
                const barColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#f87171';
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>{label}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-text-2)' }}>{fmt(value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-4)' }}>
              Score based on {qualityScore.jobsCompleted ?? 0} completed jobs · Updated automatically
            </p>
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
