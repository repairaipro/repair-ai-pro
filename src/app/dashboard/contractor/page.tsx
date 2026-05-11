'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection, query, where, onSnapshot, orderBy, limit,
  doc, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { EarningsChart } from '@/components/EarningsChart';
import { PushNotificationBanner } from '@/components/PushNotificationBanner';
import {
  Inbox, Settings, DollarSign, Star, Briefcase, CheckCircle2,
  Clock, Zap, ArrowRight, TrendingUp, User, Wrench, MapPin,
  ChevronRight, AlertTriangle, Trophy,
} from 'lucide-react';

/* ── Types ── */
type Payout = { amount: number; date: string | null; status: 'paid' | 'pending'; trade: string };
type ActiveJob = { id: string; description: string; status: string; trade?: string; location?: any; paymentAmountUsd?: number; userId?: string };
type Invite = { id: string; jobId: string; invitationStatus: string; invitedAt?: any };
type Stats = { totalEarned: number; jobsCompleted: number; avgRating: number; reviewCount: number; pendingPayout: number };

/* ── Helpers ── */
function getCity(loc: any): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return loc.city ?? loc.address ?? '';
}

function timeAgo(ts: any): string {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

const STATUS_COLOR: Record<string, string> = {
  accepted:    '#818cf8',
  in_progress: '#34d399',
  completed:   '#fb923c',
  confirmed:   '#22c55e',
};

const TRADE_ICONS: Record<string, string> = {
  Plumbing: '🔧', Electrical: '⚡', HVAC: '❄️', Carpentry: '🪚',
  Roofing: '🏠', Appliance: '🍳', Handyman: '🛠', General: '⚙️',
  Painting: '🎨', Landscaping: '🌿',
};

/* ── Stat card ── */
function StatCard({
  icon, label, value, sub, color, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        if (href) {
          (e.currentTarget as HTMLElement).style.borderColor = color + '55';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: color + '18',
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-4)', marginTop: 3 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

/* ── Job status badge ── */
function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#6b7280';
  const labels: Record<string, string> = {
    accepted: 'Assigned', in_progress: 'In Progress',
    completed: 'Awaiting Confirm', confirmed: 'Done',
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
      background: color + '18', color, border: `1px solid ${color}30`,
    }}>
      {labels[status] ?? status}
    </span>
  );
}

/* ── Main page ── */
export default function ContractorDashboard() {
  const { user } = useAuth();

  const [profile,     setProfile]     = useState<any>(null);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [activeJobs,  setActiveJobs]  = useState<ActiveJob[]>([]);
  const [invites,     setInvites]     = useState<Invite[]>([]);
  const [payouts,     setPayouts]     = useState<Payout[]>([]);
  const [loading,     setLoading]     = useState(true);

  /* Load contractor profile */
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'contractors', user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    });
  }, [user]);

  /* Load active jobs (real-time) */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'jobs'),
      where('claimedBy', '==', user.uid),
      where('status', 'in', ['accepted', 'in_progress', 'completed']),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );
    return onSnapshot(q, (snap) => {
      setActiveJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [user]);

  /* Load pending inbox invitations (real-time) */
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'contractors', user.uid, 'jobInbox'),
      where('invitationStatus', '==', 'pending'),
      orderBy('invitedAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snap) => {
      setInvites(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [user]);

  /* Load earnings via API */
  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(async (token: string) => {
      try {
        const res = await fetch('/api/contractors/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setStats({
          totalEarned:  data.totalEarned   ?? 0,
          jobsCompleted: data.jobsCompleted ?? 0,
          avgRating:    data.rating         ?? 0,
          reviewCount:  data.reviewCount    ?? 0,
          pendingPayout: data.pendingPayout ?? 0,
        });
        // Build payout array for chart
        if (Array.isArray(data.recentPayouts)) {
          setPayouts(data.recentPayouts);
        }
      } catch { /* ignore */ }
    });
  }, [user]);

  if (!user) return null;

  const pendingCount = invites.length;
  const name = profile?.name ?? user?.displayName ?? 'Contractor';
  const firstName = name.split(' ')[0];
  const isVerified = profile?.stripeConnectVerified;
  const plan = profile?.subscriptionPlan ?? 'free';
  const isPro = plan === 'pro' || plan === 'elite';

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                Welcome back, {firstName} 👋
              </h1>
              {isPro && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}>
                  {plan.toUpperCase()}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-4)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/contractor-inbox" className="btn btn-primary btn-sm" style={{ position: 'relative' }}>
              <Inbox size={14} /> Inbox
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#ef4444', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--color-bg)',
                }}>
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </Link>
            <Link href="/dashboard/contractor/settings" className="btn btn-secondary btn-sm">
              <Settings size={14} />
            </Link>
          </div>
        </div>

        {/* ── Push notification opt-in ── */}
        <PushNotificationBanner />

        {/* ── Stripe Connect alert ── */}
        {!isVerified && (
          <div
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1.5px solid rgba(245,158,11,0.3)',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(245,158,11,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                Connect your bank to receive payments
              </p>
              <p style={{ color: 'var(--color-text-4)', fontSize: 12 }}>
                You need a verified Stripe account to accept jobs and receive payouts.
              </p>
            </div>
            <Link href="/dashboard/contractor/settings" className="btn btn-sm btn-primary" style={{ flexShrink: 0 }}>
              Set Up <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<DollarSign size={18} />}
            label="Total Earned"
            value={stats ? `$${stats.totalEarned.toLocaleString()}` : '—'}
            sub={stats?.pendingPayout ? `$${stats.pendingPayout} pending` : undefined}
            color="#22c55e"
            href="/dashboard/contractor/earnings"
          />
          <StatCard
            icon={<Briefcase size={18} />}
            label="Jobs Done"
            value={stats ? `${stats.jobsCompleted}` : '—'}
            color="#818cf8"
          />
          <StatCard
            icon={<Star size={18} />}
            label="Avg Rating"
            value={stats?.avgRating ? `${stats.avgRating.toFixed(1)}★` : '—'}
            sub={stats?.reviewCount ? `${stats.reviewCount} reviews` : undefined}
            color="#fbbf24"
          />
          <StatCard
            icon={<Inbox size={18} />}
            label="Pending Bids"
            value={`${pendingCount}`}
            sub={pendingCount > 0 ? 'Respond now' : undefined}
            color="#fb923c"
            href="/contractor-inbox"
          />
        </div>

        {/* ── Active jobs ── */}
        {activeJobs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
                Active Jobs ({activeJobs.length})
              </h2>
              <Link href="/dashboard/contractor/jobs" style={{ fontSize: 12, color: 'var(--color-brand)' }}>
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {activeJobs.map((job) => {
                const trade = job.trade ?? 'General';
                const city  = getCity(job.location);
                return (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    style={{
                      display: 'block',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 16,
                      padding: '16px 18px',
                      textDecoration: 'none',
                      transition: 'border-color 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: 'var(--color-surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20, flexShrink: 0,
                        }}>
                          {TRADE_ICONS[trade] ?? '🔧'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            color: 'var(--color-text)', fontWeight: 600, fontSize: 14,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {job.description}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <StatusBadge status={job.status} />
                            {city && (
                              <span style={{ fontSize: 11, color: 'var(--color-text-4)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <MapPin size={9} /> {city}
                              </span>
                            )}
                            {job.paymentAmountUsd && (
                              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                                ${job.paymentAmountUsd}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Pending invitations preview ── */}
        {pendingCount > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
                New Invitations
              </h2>
              <Link href="/contractor-inbox" style={{ fontSize: 12, color: 'var(--color-brand)' }}>
                View all ({pendingCount}) →
              </Link>
            </div>
            <div
              style={{
                background: 'rgba(249,115,22,0.06)',
                border: '1.5px solid rgba(249,115,22,0.25)',
                borderRadius: 16,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(249,115,22,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 22,
              }}>
                📬
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 15 }}>
                  {pendingCount} job{pendingCount !== 1 ? 's' : ''} waiting for your bid
                </p>
                <p style={{ color: 'var(--color-text-4)', fontSize: 12, marginTop: 2 }}>
                  Contractors who respond within 30 minutes win 2× more jobs
                </p>
              </div>
              <Link
                href="/contractor-inbox"
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Bid Now <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        )}

        {/* ── Empty state (no jobs, no invitations) ── */}
        {activeJobs.length === 0 && pendingCount === 0 && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '2px dashed var(--color-border)',
              borderRadius: 16,
              padding: '32px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h3 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              Ready to earn?
            </h3>
            <p style={{ color: 'var(--color-text-4)', fontSize: 13, maxWidth: 280, margin: '0 auto 20px' }}>
              Make sure your profile is complete and availability is set to active — invitations will start coming in.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/contractor-profile" className="btn btn-primary btn-sm">
                <User size={14} /> Complete Profile
              </Link>
              <Link href="/jobs" className="btn btn-secondary btn-sm">
                <Briefcase size={14} /> Browse Jobs
              </Link>
            </div>
          </div>
        )}

        {/* ── Earnings chart ── */}
        <section
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 20,
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Earnings
              </p>
              {stats && (
                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)' }}>
                  ${stats.totalEarned.toLocaleString()}
                  <span style={{ fontSize: 13, color: 'var(--color-text-4)', fontWeight: 400, marginLeft: 6 }}>total</span>
                </p>
              )}
            </div>
            <Link href="/dashboard/contractor/settings" style={{ fontSize: 12, color: 'var(--color-brand)' }}>
              Full report →
            </Link>
          </div>
          <EarningsChart payouts={payouts} />
        </section>

        {/* ── Quick actions ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-4)' }}>
            Quick Actions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '📬', label: 'Job Inbox',     href: '/contractor-inbox',             badge: pendingCount },
              { icon: '👤', label: 'My Profile',    href: '/contractor-profile' },
              { icon: '💬', label: 'Messages',      href: '/chat' },
              { icon: '⚙️', label: 'Settings',      href: '/dashboard/contractor/settings' },
            ].map(({ icon, label, href, badge }) => (
              <Link
                key={label}
                href={href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '18px 12px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 16,
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {badge && badge > 0 && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: '#ef4444', color: '#fff',
                    fontSize: 10, fontWeight: 800,
                    width: 18, height: 18, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {badge}
                  </span>
                )}
                <span style={{ fontSize: 26 }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)' }}>{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Pro upgrade nudge (free users) ── */}
        {!isPro && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 16,
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(99,102,241,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 22,
            }}>
              <Trophy size={22} style={{ color: '#818cf8' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                Go Pro — Win 3× More Jobs
              </p>
              <p style={{ color: 'var(--color-text-4)', fontSize: 12 }}>
                Verified badge, priority matching, reduced 10% fee. 7-day free trial.
              </p>
            </div>
            <Link href="/contractor/pro" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              Try Free
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
