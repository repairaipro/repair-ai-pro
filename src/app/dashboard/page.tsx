'use client';

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, limit } from "firebase/firestore";
import { useAuth, isOnboardingComplete } from "@/lib/auth";
import {
  Plus, Inbox, MessageSquare, Briefcase, Users, ChevronRight,
  Zap, Clock, CheckCircle, Home, Shield, DollarSign, Brain,
  Star, TrendingUp, AlertTriangle, FileText, Crown, Wrench,
  Activity, ArrowRight, Loader2, BarChart2,
} from "lucide-react";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";

/* ─── Types ─── */
type Job = {
  id: string;
  description: string;
  trade?: string;
  aiDetectedTrade?: string;
  status: string;
  claimedBy?: string;
  userId?: string;
  createdAt?: { toDate?: () => Date };
  imageUrl?: string;
  location?: { city?: string } | string;
  paymentAmountUsd?: number;
  aiSummary?: string;
};
type InboxItem  = { id: string; jobId: string; invitationStatus: string };
type Contractor = {
  name?: string; avgRating?: number; reviewCount?: number;
  jobsCompleted?: number; trustScore?: number; availability?: string;
  trade?: string; subscriptionPlan?: string;
};
type HomeHealth = {
  score: number; totalSpent: number; last30DaysSpent: number;
  avgJobCost: number; totalJobs: number; completedJobs: number;
  tradeBreakdown: Record<string, number>; insights: string[];
};

/* ─── Constants ─── */
const ACTIVE_STATUSES    = ["accepted", "in_progress", "completed"];
const OPEN_STATUSES      = ["triaged"];
const COMPLETE_STATUSES  = ["confirmed", "verified"];

const STATUS_LABEL: Record<string, string> = {
  triaged:     "Awaiting Match",
  accepted:    "Contractor Assigned",
  in_progress: "Work in Progress",
  completed:   "Awaiting Confirmation",
  confirmed:   "Confirmed ✓",
  verified:    "Verified ✓",
  disputed:    "Disputed",
  cancelled:   "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  triaged:     "#fbbf24",
  accepted:    "#60a5fa",
  in_progress: "#818cf8",
  completed:   "#fb923c",
  confirmed:   "#34d399",
  verified:    "#34d399",
  disputed:    "#f87171",
  cancelled:   "#6b7280",
};

/* ─── Helpers ─── */
function timeAgo(ts?: { toDate?: () => Date }) {
  try {
    const d = ts?.toDate?.();
    if (!d) return "";
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

function healthColor(score: number) {
  if (score >= 80) return { color: "var(--color-success)", label: "Excellent" };
  if (score >= 60) return { color: "#fbbf24",              label: "Good" };
  if (score >= 40) return { color: "#fb923c",              label: "Fair" };
  return                  { color: "var(--color-error)",    label: "Needs Attention" };
}

/* ─── Sub-components ─── */

function HomeHealthRing({ score, loading }: { score: number; loading: boolean }) {
  const { color, label } = healthColor(score);
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Home size={14} style={{ color: 'var(--color-brand)' }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
          Home Health Score
        </span>
      </div>
      <div className="flex items-center gap-5">
        {loading ? (
          <div className="w-28 h-28 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--color-surface-2)' }} />
        ) : (
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg width="112" height="112" viewBox="0 0 112 112" className="rotate-[-90deg]">
              <circle cx="56" cy="56" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
              <circle
                cx="56" cy="56" r={r}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 6px ${color}80)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black" style={{ color }}>{score}</span>
              <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--color-text-4)' }}>/100</span>
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 rounded animate-pulse" style={{ background: 'var(--color-surface-2)', width: '70%' }} />
              <div className="h-3 rounded animate-pulse" style={{ background: 'var(--color-surface-2)', width: '90%' }} />
              <div className="h-3 rounded animate-pulse" style={{ background: 'var(--color-surface-2)', width: '60%' }} />
            </div>
          ) : (
            <>
              <p className="font-bold text-base mb-0.5" style={{ color }}>{label}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-4)' }}>
                Based on repair history, active issues, and maintenance activity.
              </p>
              <Link
                href="/home-health"
                className="inline-flex items-center gap-1 text-xs font-semibold mt-2"
                style={{ color: 'var(--color-brand)' }}
              >
                Full report <ArrowRight size={11} />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insights }: { insights: string[] }) {
  if (!insights.length) return null;
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Brain size={13} style={{ color: 'var(--color-brand)' }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#818cf8' }}>
          AI Insights
        </span>
      </div>
      <div className="space-y-2">
        {insights.slice(0, 3).map((insight, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--color-brand)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3)' }}>{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpendingStrip({ health }: { health: HomeHealth | null }) {
  if (!health) return null;
  return (
    <div
      className="rounded-2xl p-5 grid grid-cols-3 gap-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {[
        { label: "Total Invested",    value: `$${health.totalSpent.toLocaleString()}`,           icon: <DollarSign size={14} />, color: 'var(--color-success)' },
        { label: "Last 30 Days",      value: `$${health.last30DaysSpent.toLocaleString()}`,       icon: <TrendingUp size={14} />, color: '#fbbf24' },
        { label: "Avg Job Cost",      value: health.avgJobCost ? `$${Math.round(health.avgJobCost)}` : "—", icon: <BarChart2 size={14} />, color: '#60a5fa' },
      ].map(({ label, value, icon, color }) => (
        <div key={label} className="text-center">
          <div className="flex justify-center mb-1.5" style={{ color }}>{icon}</div>
          <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

function ActiveJobCard({ job }: { job: Job }) {
  const color   = STATUS_COLOR[job.status] ?? "#818cf8";
  const label   = STATUS_LABEL[job.status] ?? job.status;
  const isLive  = job.status === "in_progress";
  const progress =
    job.status === "triaged"     ? 15 :
    job.status === "accepted"    ? 35 :
    job.status === "in_progress" ? 68 :
    job.status === "completed"   ? 90 : 10;

  return (
    <Link href={`/chat?job=${job.id}`}>
      <div
        className="rounded-2xl p-5 transition-all duration-200 group"
        style={{
          background: isLive ? 'rgba(99,102,241,0.09)' : 'var(--color-surface)',
          border: `1px solid ${isLive ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}66`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isLive ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'; }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          {isLive && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399' }} />}
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
          >
            {label}
          </span>
          <span className="ml-auto text-xs" style={{ color: 'var(--color-text-4)' }}>
            {timeAgo(job.createdAt as any)}
          </span>
        </div>

        {/* Description */}
        <p className="font-semibold text-sm leading-snug mb-1 line-clamp-2" style={{ color: 'var(--color-text)' }}>
          {job.description}
        </p>
        {(job.aiDetectedTrade ?? job.trade) && (
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-4)' }}>
            {job.aiDetectedTrade ?? job.trade}
          </p>
        )}

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--color-surface-2)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>{progress}% complete</span>
          <span className="text-xs font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--color-brand)' }}>
            {isLive ? "Watch live" : "Open chat"} <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function QuickActions({ isContractor, pendingInvites }: { isContractor: boolean; pendingInvites: number }) {
  const actions = [
    { icon: <Plus size={18} />,         label: "Post Job",         sub: "Get matched fast",      href: "/jobs/new",   color: 'var(--color-brand)',   bg: 'rgba(99,102,241,0.1)',  primary: true },
    { icon: <Brain size={18} />,        label: "Ask AI",           sub: "Diagnose any issue",    href: "/ai",         color: '#34d399',              bg: 'rgba(34,197,94,0.08)',  primary: false },
    { icon: <Briefcase size={18} />,    label: "My Jobs",          sub: "Track all your jobs",   href: "/my-jobs",    color: '#60a5fa',              bg: 'rgba(96,165,250,0.08)', primary: false },
    { icon: <FileText size={18} />,     label: "Insurance Report", sub: "AI-generated · $49",    href: "/jobs",       color: '#fb923c',              bg: 'rgba(249,115,22,0.08)', primary: false },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="rounded-2xl p-4 flex flex-col gap-2 transition-all duration-200 group"
          style={{ background: a.primary ? a.bg : 'var(--color-surface)', border: `1px solid ${a.primary ? `${a.color}30` : 'var(--color-border)'}` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${a.color}50`; (e.currentTarget as HTMLElement).style.background = a.bg; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = a.primary ? `${a.color}30` : 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = a.primary ? a.bg : 'var(--color-surface)'; }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.bg, color: a.color }}>
            {a.icon}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{a.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{a.sub}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ProUpsellBanner({ onSubscribe, subscribing }: { onSubscribe: () => void; subscribing: boolean }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.06))',
        border: '1px solid rgba(99,102,241,0.25)',
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
      >
        <Crown size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
          Homeowner Pro — $19/mo
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-4)' }}>
          Priority matching · Home Health tracking · 30-day warranty · 5% cashback
        </p>
      </div>
      <button
        onClick={onSubscribe}
        disabled={subscribing}
        className="btn btn-sm flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: '1px solid rgba(99,102,241,0.4)' }}
      >
        {subscribing ? <Loader2 size={13} className="animate-spin" /> : <><Zap size={13} /> Try Free</>}
      </button>
    </div>
  );
}

function ContractorStatsBar({ contractor }: { contractor: Contractor }) {
  const trustScore = contractor.trustScore ?? 0;
  const tier =
    trustScore >= 80 ? { label: "Elite",   color: '#fbbf24' } :
    trustScore >= 50 ? { label: "Pro",     color: '#60a5fa' } :
    trustScore >= 20 ? { label: "Verified",color: '#34d399' } :
                       { label: "New",     color: '#9ca3af' };

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench size={14} style={{ color: 'var(--color-brand)' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
            Contractor Mode
          </span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${tier.color}18`, border: `1px solid ${tier.color}35`, color: tier.color }}
        >
          {tier.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { value: contractor.avgRating?.toFixed(1) ?? "—",             label: "Rating",    color: '#fbbf24' },
          { value: contractor.reviewCount ?? 0,                          label: "Reviews",   color: 'var(--color-text)' },
          { value: contractor.jobsCompleted ?? 0,                        label: "Jobs Done", color: 'var(--color-brand)' },
          { value: contractor.availability === "available" ? "Open" : "Busy", label: "Status", color: contractor.availability === "available" ? 'var(--color-success)' : '#fb923c' },
        ].map(({ value, label, color }) => (
          <div key={label}>
            <p className="text-lg font-bold capitalize" style={{ color }}>{String(value)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Link href="/contractor-inbox" className="btn btn-sm btn-secondary flex-1" style={{ justifyContent: 'center' }}>
          <Inbox size={13} /> Inbox
        </Link>
        <Link href="/dashboard/contractor/settings" className="btn btn-sm btn-secondary flex-1" style={{ justifyContent: 'center' }}>
          <Activity size={13} /> Earnings
        </Link>
        <Link href="/contractor-profile" className="btn btn-sm btn-secondary flex-1" style={{ justifyContent: 'center' }}>
          <Star size={13} /> Profile
        </Link>
      </div>
    </div>
  );
}

function RecentJobRow({ job }: { job: Job }) {
  const color = STATUS_COLOR[job.status] ?? "#6b7280";
  const label = STATUS_LABEL[job.status] ?? job.status;
  const emoji =
    job.status === "confirmed" || job.status === "verified" ? "✅" :
    job.status === "in_progress" ? "🔧" :
    job.status === "accepted"   ? "🎉" :
    job.status === "disputed"   ? "⚠️" : "📋";

  return (
    <Link href={`/chat?job=${job.id}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}50`; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; }}
      >
        <span className="text-base flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{job.description}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            {job.aiDetectedTrade ?? job.trade ?? "General"} · {timeAgo(job.createdAt as any)}
          </p>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

/* ─── Main Page ─── */
export default function DashboardPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [homeownerJobs, setHomeownerJobs] = useState<Job[]>([]);
  const [contractorJobs, setContractorJobs] = useState<Job[]>([]);
  const [inbox,          setInbox]          = useState<InboxItem[]>([]);
  const [contractor,     setContractor]     = useState<Contractor | null>(null);
  const [health,         setHealth]         = useState<HomeHealth | null>(null);
  const [healthLoading,  setHealthLoading]  = useState(true);
  const [jobsLoading,    setJobsLoading]    = useState(true);
  const [subscribing,    setSubscribing]    = useState(false);
  const [homeownerPlan,  setHomeownerPlan]  = useState<string>("free");

  useEffect(() => {
    if (user && !isOnboardingComplete(user)) router.push('/onboarding');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;

    /* Real-time jobs */
    const q1 = query(collection(db, "jobs"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(20));
    const u1 = onSnapshot(q1, (snap) => {
      setHomeownerJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setJobsLoading(false);
    }, () => setJobsLoading(false));

    const q2 = query(collection(db, "jobs"), where("claimedBy", "==", user.uid), orderBy("createdAt", "desc"), limit(10));
    const u2 = onSnapshot(q2, (snap) => {
      setContractorJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});

    const q3 = query(collection(db, "contractors", user.uid, "jobInbox"), where("invitationStatus", "==", "pending"), limit(20));
    const u3 = onSnapshot(q3, (snap) => {
      setInbox(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});

    /* Contractor profile */
    getDoc(doc(db, "contractors", user.uid)).then((snap) => {
      if (snap.exists()) setContractor(snap.data() as Contractor);
    }).catch(() => {});

    /* Homeowner profile / subscription */
    getDoc(doc(db, "homeowners", user.uid)).then((snap) => {
      if (snap.exists()) setHomeownerPlan((snap.data() as any).subscriptionPlan ?? "free");
    }).catch(() => {});

    /* Home Health Score */
    user.getIdToken().then((token: string) =>
      fetch('/api/homeowner/home-health', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => { if (data.score !== undefined) setHealth(data); })
        .catch(() => {})
        .finally(() => setHealthLoading(false))
    );

    return () => { u1(); u2(); u3(); };
  }, [user]);

  async function handleProSubscribe() {
    if (!user) { router.push('/auth/signin'); return; }
    setSubscribing(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('/api/homeowner/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ plan: 'pro' }),
      });
      const data  = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch { /* ignore */ }
    setSubscribing(false);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', maxWidth: 320 }}>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-3)' }}>Sign in to view your dashboard.</p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In</Link>
        </div>
      </div>
    );
  }

  const displayName          = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const activeHomeownerJobs  = homeownerJobs.filter((j) => ACTIVE_STATUSES.includes(j.status) || OPEN_STATUSES.includes(j.status));
  const completedHomeownerJobs = homeownerJobs.filter((j) => COMPLETE_STATUSES.includes(j.status));
  const activeContractorJobs = contractorJobs.filter((j) => [...ACTIVE_STATUSES, ...OPEN_STATUSES].includes(j.status));
  const pendingInvites        = inbox.length;
  const isContractor          = contractor !== null || contractorJobs.length > 0 || inbox.length > 0;
  const recentNonActive       = homeownerJobs.filter((j) => !ACTIVE_STATUSES.includes(j.status) && !OPEN_STATUSES.includes(j.status)).slice(0, 5);
  const isPro                 = homeownerPlan === "pro" || homeownerPlan === "elite";

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">

        {/* ── Greeting ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
              Hey, {displayName} 👋
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
              {activeHomeownerJobs.length > 0
                ? `${activeHomeownerJobs.length} job${activeHomeownerJobs.length > 1 ? "s" : ""} in progress`
                : "Your home command center"}
              {pendingInvites > 0 && ` · ${pendingInvites} contractor invite${pendingInvites > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/jobs/new" className="btn btn-primary btn-sm">
              <Plus size={13} /> Post Job
            </Link>
            {isContractor && (
              <Link href="/contractor-inbox" className="btn btn-secondary btn-sm relative">
                <Inbox size={13} /> Inbox
                {pendingInvites > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: '#fb923c', color: '#fff' }}
                  >
                    {pendingInvites > 9 ? "9+" : pendingInvites}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* ── Push notification opt-in ── */}
        <PushNotificationBanner />

        {/* ── Contractor invite alert ── */}
        {isContractor && pendingInvites > 0 && (
          <Link href="/contractor-inbox">
            <div
              className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-200"
              style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.22)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.07)'; }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.15)' }}>
                <Inbox size={16} style={{ color: '#fb923c' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {pendingInvites} job invitation{pendingInvites > 1 ? "s" : ""} waiting
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Accept to earn — respond fast for best results</p>
              </div>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: '#fb923c', color: '#fff' }}
              >
                {pendingInvites > 9 ? "9+" : pendingInvites}
              </div>
            </div>
          </Link>
        )}

        {/* ── Home Health + Spending ── */}
        <HomeHealthRing score={health?.score ?? 85} loading={healthLoading} />
        {health && health.insights.length > 0 && <InsightCard insights={health.insights} />}
        {health && <SpendingStrip health={health} />}

        {/* ── Pro Upsell (only if not subscribed) ── */}
        {!isPro && (
          <ProUpsellBanner onSubscribe={handleProSubscribe} subscribing={subscribing} />
        )}

        {/* ── Quick actions ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-4)' }}>
            Quick Actions
          </h2>
          <QuickActions isContractor={isContractor} pendingInvites={pendingInvites} />
        </section>

        {/* ── Active jobs ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-4)' }}>
              {activeHomeownerJobs.length > 0 ? "Live Jobs" : "Your Jobs"}
            </h2>
            {homeownerJobs.length > 0 && (
              <Link href="/jobs" className="text-xs font-medium" style={{ color: 'var(--color-brand)' }}>
                View all →
              </Link>
            )}
          </div>
          {jobsLoading ? (
            <div className="space-y-3">
              <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)' }} />
              <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--color-surface)' }} />
            </div>
          ) : activeHomeownerJobs.length > 0 ? (
            <div className="space-y-3">
              {activeHomeownerJobs.map((job) => <ActiveJobCard key={job.id} job={job} />)}
            </div>
          ) : (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ border: '2px dashed var(--color-border)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--color-surface)' }}>
                <Briefcase size={22} style={{ color: 'var(--color-text-4)' }} />
              </div>
              <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>No active jobs</p>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-4)' }}>Describe a problem — AI matches you with the right contractor</p>
              <Link href="/jobs/new" className="btn btn-primary btn-sm inline-flex">
                <Plus size={13} /> Post Your First Job
              </Link>
            </div>
          )}
        </section>

        {/* ── Stats row ── */}
        {!jobsLoading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: homeownerJobs.length,          label: "Total Jobs",     color: 'var(--color-text)',    icon: <Briefcase size={15} /> },
              { value: activeHomeownerJobs.length,    label: "Active",         color: '#818cf8',              icon: <Activity size={15} /> },
              { value: completedHomeownerJobs.length, label: "Completed",      color: 'var(--color-success)', icon: <CheckCircle size={15} /> },
            ].map(({ value, label, color, icon }) => (
              <div key={label} className="rounded-2xl p-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Contractor panel ── */}
        {contractor && <ContractorStatsBar contractor={contractor} />}

        {/* ── Recent jobs ── */}
        {!jobsLoading && recentNonActive.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-4)' }}>
              Past Jobs
            </h2>
            <div className="space-y-2">
              {recentNonActive.map((job) => <RecentJobRow key={job.id} job={job} />)}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
