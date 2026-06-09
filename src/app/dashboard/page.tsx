'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, limit } from "firebase/firestore";
import { useAuth, isOnboardingComplete } from "@/lib/auth";
import { Plus, Inbox, MessageSquare, Briefcase, Users, User, ChevronRight, Zap, TrendingUp, Clock, CheckCircle, Shield, Heart } from "lucide-react";
import { motion } from "framer-motion";

type Job = {
  id: string;
  description: string;
  trade?: string;
  status: string;
  claimedBy?: string;
  userId?: string;
  createdAt?: { toDate?: () => Date };
  imageUrl?: string;
  location?: { city?: string } | string;
};

type InboxItem = {
  id: string;
  jobId: string;
  invitationStatus: string;
  invitedAt?: { toDate?: () => Date };
};

type Contractor = {
  name?: string;
  avgRating?: number;
  reviewCount?: number;
  jobsCompleted?: number;
  trustScore?: number;
  availability?: string;
  trade?: string;
};

const STATUS_LABEL: Record<string, string> = {
  triaged:     "Awaiting Match",
  accepted:    "Contractor Assigned",
  in_progress: "Work in Progress",
  completed:   "Awaiting Confirmation",
  confirmed:   "Confirmed",
  verified:    "Verified",
  disputed:    "Disputed",
  cancelled:   "Cancelled",
};

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  triaged:     { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  color: '#fbbf24' },
  accepted:    { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)',  color: '#60a5fa' },
  in_progress: { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)', color: '#818cf8' },
  completed:   { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)', color: '#fb923c' },
  confirmed:   { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', color: '#34d399' },
  verified:    { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', color: '#34d399' },
  disputed:    { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)', color: '#fb923c' },
  cancelled:   { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)',color: '#9ca3af' },
};

const ACTIVE_STATUSES = ["accepted", "in_progress", "completed"];
const OPEN_STATUSES = ["triaged"];

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

function ActiveJobCard({ job }: { job: Job }) {
  const label = STATUS_LABEL[job.status] ?? job.status;
  const s = STATUS_STYLES[job.status] ?? STATUS_STYLES.triaged;
  const isPulsing = job.status === "in_progress";
  const progress =
    job.status === "triaged"     ? 10 :
    job.status === "accepted"    ? 33 :
    job.status === "in_progress" ? 66 :
    job.status === "completed"   ? 90 : 10;

  return (
    <Link href={`/jobs/${job.id}`}>
      <div
        className="relative overflow-hidden rounded-2xl p-5 transition-all duration-200 group"
        style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)';
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPulsing ? 'animate-pulse' : ''}`}
            style={{ background: isPulsing ? '#34d399' : '#818cf8' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-4)' }}>
            Active Job
          </span>
          <div
            className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
          >
            {label}
          </div>
        </div>

        <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1 transition-colors"
          style={{ color: 'var(--color-text)' }}>
          {job.description}
        </h3>

        {job.trade && (
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-4)' }}>{job.trade}</p>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>{timeAgo(job.createdAt as any)}</span>
          <span className="text-xs font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            style={{ color: '#818cf8' }}>
            View Job <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }}
          />
        </div>
      </div>
    </Link>
  );
}

function PendingInviteCard({ count }: { count: number }) {
  return (
    <Link href="/contractor-inbox">
      <div
        className="rounded-2xl p-5 transition-all duration-200 group"
        style={{
          background: 'rgba(249,115,22,0.06)',
          border: '1px solid rgba(249,115,22,0.2)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.35)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.2)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.06)';
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <Inbox className="w-5 h-5" style={{ color: '#fb923c' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              {count} Job {count === 1 ? "Invitation" : "Invitations"} Waiting
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>Review and accept to earn</p>
          </div>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#fb923c', color: '#fff' }}
          >
            {count > 9 ? "9+" : count}
          </div>
        </div>
        <p className="text-xs font-medium mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
          style={{ color: '#fb923c' }}>
          View Invitations <ChevronRight className="w-3 h-3" />
        </p>
      </div>
    </Link>
  );
}

function ContractorStatsBar({ contractor }: { contractor: Contractor }) {
  const trustScore = contractor.trustScore ?? 0;
  const tier =
    trustScore >= 80 ? { label: "Elite",   color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' } :
    trustScore >= 50 ? { label: "Pro",     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)' } :
    trustScore >= 20 ? { label: "Verified",color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)' } :
                       { label: "New",     color: '#9ca3af', bg: 'var(--color-surface-2)', border: 'var(--color-border)' };

  const availColor =
    contractor.availability === "available" ? '#34d399' :
    contractor.availability === "busy"      ? '#fb923c' : 'var(--color-text-4)';

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Contractor Profile</h3>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: tier.bg, border: `1px solid ${tier.border}`, color: tier.color }}
        >
          {tier.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        {[
          { value: contractor.avgRating?.toFixed(1) ?? "—", label: "Rating", color: 'var(--color-text)' },
          { value: contractor.reviewCount ?? 0,              label: "Reviews", color: 'var(--color-text)' },
          { value: contractor.jobsCompleted ?? 0,            label: "Jobs Done", color: 'var(--color-text)' },
          { value: contractor.availability ?? "—",           label: "Status", color: availColor },
        ].map(({ value, label, color }) => (
          <div key={label}>
            <p className="text-base font-bold capitalize" style={{ color }}>{String(value)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</p>
          </div>
        ))}
      </div>
      <Link
        href="/contractor-profile"
        className="mt-4 block text-center text-xs font-medium transition-opacity hover:opacity-70"
        style={{ color: '#818cf8', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}
      >
        Edit Profile →
      </Link>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const label = STATUS_LABEL[job.status] ?? job.status;
  const s = STATUS_STYLES[job.status] ?? STATUS_STYLES.cancelled;
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.25)';
        (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
        (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: s.bg, border: `1px solid ${s.border}` }}
      >
        <span style={{ color: s.color, fontSize: '14px' }}>
          {job.status === "confirmed" || job.status === "verified" ? "✅" :
           job.status === "in_progress" ? "🔧" :
           job.status === "accepted"    ? "🎉" :
           job.status === "completed"   ? "🏁" : "📋"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{job.description}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{job.trade ?? "General"} · {timeAgo(job.createdAt as any)}</p>
      </div>
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
      >
        {label}
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [homeownerJobs, setHomeownerJobs] = useState<Job[]>([]);
  const [contractorJobs, setContractorJobs] = useState<Job[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !isOnboardingComplete(user)) router.push('/onboarding');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, "jobs"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(20));
    const u1 = onSnapshot(q1, (snap) => {
      setHomeownerJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }, () => setLoading(false));

    const q2 = query(collection(db, "jobs"), where("claimedBy", "==", user.uid), orderBy("createdAt", "desc"), limit(10));
    const u2 = onSnapshot(q2, (snap) => {
      setContractorJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});

    const q3 = query(collection(db, "contractors", user.uid, "jobInbox"), where("invitationStatus", "==", "pending"), limit(20));
    const u3 = onSnapshot(q3, (snap) => {
      setInbox(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});

    getDoc(doc(db, "contractors", user.uid)).then((snap) => {
      if (snap.exists()) setContractor(snap.data() as Contractor);
    }).catch(() => {});

    return () => { u1(); u2(); u3(); };
  }, [user]);

  const displayName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const activeHomeownerJobs    = homeownerJobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const openHomeownerJobs      = homeownerJobs.filter((j) => OPEN_STATUSES.includes(j.status));
  const completedHomeownerJobs = homeownerJobs.filter((j) => ["confirmed", "verified"].includes(j.status));
  const activeContractorJobs   = contractorJobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const pendingInvites         = inbox.length;
  const isContractor           = contractor !== null || contractorJobs.length > 0 || inbox.length > 0;
  // "Live" section: active + awaiting-match jobs combined, deduplicated
  const allActiveJobs = [
    ...activeHomeownerJobs,
    ...openHomeownerJobs,
    ...activeContractorJobs.filter((cj) => !activeHomeownerJobs.find((hj) => hj.id === cj.id)),
  ];
  const recentNonActive = homeownerJobs
    .filter((j) => !ACTIVE_STATUSES.includes(j.status) && !OPEN_STATUSES.includes(j.status))
    .slice(0, 5);

  if (!user) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="card p-8 text-center max-w-sm w-full" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-3)' }}>Sign in to view your dashboard.</p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Hey, {displayName} 👋
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
              {allActiveJobs.length > 0
                ? `You have ${allActiveJobs.length} active job${allActiveJobs.length > 1 ? "s" : ""}`
                : "No active jobs right now"}
              {pendingInvites > 0 && ` · ${pendingInvites} pending invite${pendingInvites > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/jobs/new" className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Post Job
            </Link>
            {isContractor && (
              <Link href="/contractor-inbox" className="btn btn-secondary btn-sm relative">
                <Inbox className="w-3.5 h-3.5" /> My Inbox
                {pendingInvites > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: '#fb923c', color: '#fff' }}
                  >
                    {pendingInvites}
                  </span>
                )}
              </Link>
            )}
          </div>
        </motion.div>

        {/* Contractor pending invites */}
        {isContractor && pendingInvites > 0 && <PendingInviteCard count={pendingInvites} />}

        {/* Active jobs */}
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-36 w-full rounded-2xl" />
            <div className="skeleton h-36 w-full rounded-2xl" />
          </div>
        ) : allActiveJobs.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-4)' }}>
              Live Jobs
            </h2>
            <div className="space-y-3">
              {allActiveJobs.map((job) => <ActiveJobCard key={job.id} job={job} />)}
            </div>
          </section>
        ) : (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ border: '2px dashed var(--color-border)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Briefcase className="w-6 h-6" style={{ color: 'var(--color-text-4)' }} />
            </div>
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>No active jobs</p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-4)' }}>Post a job to get matched with a contractor</p>
            <Link href="/jobs/new" className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Post Your First Job
            </Link>
          </div>
        )}

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: homeownerJobs.length,         label: "Total Jobs",    color: 'var(--color-text)',  icon: <Briefcase className="w-4 h-4" /> },
              { value: openHomeownerJobs.length,      label: "Awaiting Match",color: '#818cf8',            icon: <Clock className="w-4 h-4" /> },
              { value: completedHomeownerJobs.length, label: "Completed",     color: '#34d399',            icon: <CheckCircle className="w-4 h-4" /> },
            ].map(({ value, label, color, icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="card p-4 text-center"
              >
                <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Contractor profile */}
        {contractor && <ContractorStatsBar contractor={contractor} />}

        {/* Recent jobs */}
        {!loading && recentNonActive.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-4)' }}>
              Recent Jobs
            </h2>
            <div className="space-y-2">
              {recentNonActive.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
            {homeownerJobs.length > 5 && (
              <div className="mt-3 text-center">
                <Link href="/jobs" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#818cf8' }}>
                  View all jobs →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Quick links */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-4)' }}>
            Quick Links
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: <MessageSquare className="w-4 h-4" />, label: "Messages",         href: "/chat" },
              { icon: <Briefcase className="w-4 h-4" />,    label: "Marketplace",      href: "/jobs" },
              { icon: <Clock className="w-4 h-4" />,        label: "Job History",      href: "/history" },
              { icon: <Heart className="w-4 h-4" />,        label: "Home Health",      href: "/home-health" },
              { icon: <Users className="w-4 h-4" />,        label: "Find Contractors", href: "/contractor" },
              { icon: <User className="w-4 h-4" />,         label: "My Profile",       href: "/contractor-profile" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-3)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.25)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)';
                }}
              >
                <span style={{ color: '#818cf8' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
