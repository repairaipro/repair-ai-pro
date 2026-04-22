'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import {
  collection, query, where, onSnapshot,
  orderBy, doc, getDoc, limit,
} from "firebase/firestore";
import { useAuth, isOnboardingComplete } from "@/lib/auth";

/* ─── Types ─────────────────────────────────────────────────────────────── */

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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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

const STATUS_COLOR: Record<string, string> = {
  triaged:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  accepted:    "bg-blue-500/10 text-blue-400 border-blue-500/30",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  completed:   "bg-orange-500/10 text-orange-400 border-orange-500/30",
  confirmed:   "bg-green-500/10 text-green-400 border-green-500/30",
  verified:    "bg-green-500/10 text-green-400 border-green-500/30",
  disputed:    "bg-orange-500/10 text-orange-400 border-orange-500/30",
  cancelled:   "bg-gray-500/10 text-gray-500 border-gray-600",
};

const ACTIVE_STATUSES = ["accepted", "in_progress", "completed"];
const OPEN_STATUSES   = ["triaged"];

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

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />;
}

/* ─── Active Job Hero Card (Uber-style) ──────────────────────────────────── */

function ActiveJobCard({ job }: { job: Job }) {
  const label = STATUS_LABEL[job.status] ?? job.status;
  const isPulsing = job.status === "in_progress";

  return (
    <Link href={`/chat?job=${job.id}`}>
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-gray-900 p-5 hover:border-indigo-400 transition group">
        {/* Live pulse indicator */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPulsing ? "bg-green-400 animate-pulse" : "bg-indigo-400"}`} />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Job</span>
          <span className={`ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLOR[job.status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
            {label}
          </span>
        </div>

        <h3 className="text-white font-semibold text-base leading-snug line-clamp-2 group-hover:text-indigo-300 transition">
          {job.description}
        </h3>

        {job.trade && (
          <p className="text-xs text-gray-500 mt-1">{job.trade}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">{timeAgo(job.createdAt as any)}</span>
          <span className="text-xs text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
            Open Chat →
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
            style={{
              width: job.status === "accepted"    ? "33%"
                   : job.status === "in_progress" ? "66%"
                   : job.status === "completed"   ? "90%"
                   : "10%"
            }}
          />
        </div>
      </div>
    </Link>
  );
}

/* ─── Pending Invitation Card ────────────────────────────────────────────── */

function PendingInviteCard({ count }: { count: number }) {
  return (
    <Link href="/contractor-inbox">
      <div className="relative rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-950/40 to-gray-900 p-5 hover:border-orange-400 transition group">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📬</span>
          <div>
            <p className="text-white font-semibold">
              {count} Job {count === 1 ? "Invitation" : "Invitations"} Waiting
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Review and accept to earn</p>
          </div>
          <span className="ml-auto bg-orange-500 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
            {count > 9 ? "9+" : count}
          </span>
        </div>
        <p className="text-xs text-orange-400 font-medium mt-3 group-hover:translate-x-0.5 transition-transform">
          View Invitations →
        </p>
      </div>
    </Link>
  );
}

/* ─── Contractor Stats ───────────────────────────────────────────────────── */

function ContractorStatsBar({ contractor }: { contractor: Contractor }) {
  const trustScore = contractor.trustScore ?? 0;
  const tier =
    trustScore >= 80 ? { label: "Elite",     color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" } :
    trustScore >= 50 ? { label: "Pro",        color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30"   } :
    trustScore >= 20 ? { label: "Verified",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" } :
                       { label: "New",        color: "text-gray-400",   bg: "bg-gray-800 border-gray-700"         };

  const availColor =
    contractor.availability === "available" ? "text-green-400" :
    contractor.availability === "busy"      ? "text-orange-400" :
                                              "text-gray-500";

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Contractor Profile</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.bg} ${tier.color}`}>
          {tier.label}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-white">{contractor.avgRating?.toFixed(1) ?? "—"}</p>
          <p className="text-[10px] text-gray-500">Rating</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{contractor.reviewCount ?? 0}</p>
          <p className="text-[10px] text-gray-500">Reviews</p>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{contractor.jobsCompleted ?? 0}</p>
          <p className="text-[10px] text-gray-500">Jobs Done</p>
        </div>
        <div>
          <p className={`text-sm font-semibold capitalize ${availColor}`}>
            {contractor.availability ?? "—"}
          </p>
          <p className="text-[10px] text-gray-500">Status</p>
        </div>
      </div>
      <Link
        href="/contractor-profile"
        className="mt-3 block text-center text-xs text-indigo-400 hover:text-indigo-300 transition"
      >
        Edit Profile →
      </Link>
    </div>
  );
}

/* ─── Job Card (list item) ───────────────────────────────────────────────── */

function JobCard({ job }: { job: Job }) {
  const label = STATUS_LABEL[job.status] ?? job.status;
  return (
    <Link
      href={`/chat?job=${job.id}`}
      className="flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl transition group"
    >
      <span className="text-xl flex-shrink-0">
        {job.status === "confirmed" || job.status === "verified" ? "✅" :
         job.status === "in_progress" ? "🔧" :
         job.status === "accepted"    ? "🎉" :
         job.status === "completed"   ? "🏁" : "📋"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{job.description}</p>
        <p className="text-xs text-gray-500">{job.trade ?? "General"} · {timeAgo(job.createdAt as any)}</p>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLOR[job.status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
        {label}
      </span>
    </Link>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [homeownerJobs, setHomeownerJobs] = useState<Job[]>([]);
  const [contractorJobs, setContractorJobs] = useState<Job[]>([]);
  const [inbox, setInbox]                   = useState<InboxItem[]>([]);
  const [contractor, setContractor]         = useState<Contractor | null>(null);
  const [loading, setLoading]               = useState(true);

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (user && !isOnboardingComplete(user)) {
      router.push('/onboarding');
    }
  }, [user, router]);

  /* ── Real-time listeners ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    // Homeowner jobs
    const q1 = query(
      collection(db, "jobs"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const u1 = onSnapshot(q1, (snap) => {
      setHomeownerJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }, () => setLoading(false));

    // Jobs where user is contractor
    const q2 = query(
      collection(db, "jobs"),
      where("claimedBy", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const u2 = onSnapshot(q2, (snap) => {
      setContractorJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});

    // Contractor inbox (pending invites)
    const q3 = query(
      collection(db, "contractors", user.uid, "jobInbox"),
      where("invitationStatus", "==", "pending"),
      limit(20)
    );
    const u3 = onSnapshot(q3, (snap) => {
      setInbox(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});

    // Contractor profile
    getDoc(doc(db, "contractors", user.uid)).then((snap) => {
      if (snap.exists()) setContractor(snap.data() as Contractor);
    }).catch(() => {});

    return () => { u1(); u2(); u3(); };
  }, [user]);

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const displayName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const activeHomeownerJobs    = homeownerJobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const openHomeownerJobs      = homeownerJobs.filter((j) => OPEN_STATUSES.includes(j.status));
  const completedHomeownerJobs = homeownerJobs.filter((j) => ["confirmed", "verified"].includes(j.status));
  const activeContractorJobs   = contractorJobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const pendingInvites         = inbox.length;
  const isContractor           = contractor !== null || contractorJobs.length > 0 || inbox.length > 0;

  const allActiveJobs = [
    ...activeHomeownerJobs,
    ...activeContractorJobs.filter((cj) => !activeHomeownerJobs.find((hj) => hj.id === cj.id)),
  ];

  const recentNonActive = homeownerJobs
    .filter((j) => !ACTIVE_STATUSES.includes(j.status))
    .slice(0, 5);

  /* ── Not signed in ─────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-950 text-white">
        <p className="text-gray-400">Sign in to view your dashboard.</p>
        <Link href="/auth/signin" className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-lg text-sm font-medium transition">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hey, {displayName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {allActiveJobs.length > 0
                ? `You have ${allActiveJobs.length} active job${allActiveJobs.length > 1 ? "s" : ""}`
                : "No active jobs right now"}
              {pendingInvites > 0 && ` · ${pendingInvites} pending invite${pendingInvites > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/jobs/new"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
            >
              + Post Job
            </Link>
            {isContractor && (
              <Link
                href="/contractor-inbox"
                className="relative bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm px-4 py-2 rounded-xl transition"
              >
                My Inbox
                {pendingInvites > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingInvites}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* ── CONTRACTOR: Pending invitations (top priority) ─────────────── */}
        {isContractor && pendingInvites > 0 && (
          <PendingInviteCard count={pendingInvites} />
        )}

        {/* ── Active jobs (Uber-style live cards) ────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        ) : allActiveJobs.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Live Jobs</h2>
            <div className="space-y-3">
              {allActiveJobs.map((job) => (
                <ActiveJobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        ) : (
          /* ── Empty state: no active jobs ──────────────────────────────── */
          <div className="rounded-2xl border border-dashed border-gray-700 p-8 text-center">
            <p className="text-3xl mb-3">🏠</p>
            <p className="text-white font-medium">No active jobs</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">Post a job to get matched with a contractor</p>
            <Link
              href="/jobs/new"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-xl transition"
            >
              Post Your First Job
            </Link>
          </div>
        )}

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{homeownerJobs.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Jobs</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-400">{openHomeownerJobs.length}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting Match</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{completedHomeownerJobs.length}</p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </div>
          </div>
        )}

        {/* ── Contractor profile card ────────────────────────────────────── */}
        {contractor && <ContractorStatsBar contractor={contractor} />}

        {/* ── Recent jobs list ───────────────────────────────────────────── */}
        {!loading && recentNonActive.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Jobs</h2>
            <div className="space-y-2">
              {recentNonActive.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
            {homeownerJobs.length > 5 && (
              <div className="mt-3 text-center">
                <Link href="/jobs" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                  View all jobs →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ── Quick links ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: "💬", label: "Messages",         href: "/chat"              },
              { icon: "📋", label: "Marketplace",      href: "/jobs"              },
              { icon: "🔍", label: "Find Contractors", href: "/contractor"        },
              { icon: "👤", label: "My Profile",       href: "/contractor-profile"},
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl px-3 py-3 text-sm text-gray-300 hover:text-white transition"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
