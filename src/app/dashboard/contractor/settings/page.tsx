'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  DollarSign, Briefcase, CheckCircle2, AlertTriangle,
  Clock, ExternalLink, Loader2, TrendingUp, Banknote,
  Crown, ArrowRight, Shield, RefreshCw, Star, Activity,
  ToggleLeft, ToggleRight, Bell, Mail, MessageCircle, Zap,
  Navigation,
} from 'lucide-react';
import { EarningsChart } from '@/components/EarningsChart';

/* ── Types ── */
interface Earnings {
  totalEarned:   number;
  pendingAmount: number;
  completedJobs: number;
  totalJobs:     number;
  monthlyEarnings: { date: string; amount: number }[];
  payouts: {
    jobId:       string;
    amount:      number;
    status:      'paid' | 'pending';
    trade:       string;
    description: string;
    date:        string | null;
  }[];
}

interface ConnectStatus {
  verified:        boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements?:   { currently_due: string[] };
}

type SubPlan = 'starter' | 'pro' | 'elite';
const PLAN_LABELS: Record<SubPlan, { label: string; detail: string; color: string }> = {
  starter: { label: 'Starter Plan',  detail: '3 leads/month · Standard priority · 12% platform fee',       color: 'var(--color-text-4)' },
  pro:     { label: 'Pro Plan',      detail: 'Unlimited leads · Priority matching · Verified badge · 10% fee', color: '#818cf8' },
  elite:   { label: 'Elite Plan',    detail: 'Featured placement · Emergency early access · 0% fee (3 jobs)', color: '#fbbf24' },
};

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div className="text-xs font-medium" style={{ color: 'var(--color-text-4)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{sub}</div>}
    </div>
  );
}

export default function ContractorSettingsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  interface NotifPrefs { email: boolean; push: boolean; sms: boolean }

  const [earnings,        setEarnings]        = useState<Earnings | null>(null);
  const [connectStatus,   setConnectStatus]   = useState<ConnectStatus | null>(null);
  const [subPlan,         setSubPlan]         = useState<SubPlan>('starter');
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [connectLoading,  setConnectLoading]  = useState(true);
  const [connecting,      setConnecting]      = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [isAvailable,     setIsAvailable]     = useState(true);
  const [availSaving,     setAvailSaving]     = useState(false);
  const [notifPrefs,      setNotifPrefs]      = useState<NotifPrefs>({ email: true, push: true, sms: false });
  const [notifSaving,     setNotifSaving]     = useState(false);
  const [notifSaved,      setNotifSaved]      = useState(false);
  const [goLive,          setGoLive]          = useState(false);
  const [goLiveSaving,    setGoLiveSaving]    = useState(false);
  const [locationPermission, setLocationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [batteryLevel,    setBatteryLevel]    = useState(100);

  useEffect(() => {
    if (!user) { router.push('/auth/signin'); return; }
    loadAll();
  }, [user]);

  async function loadAll() {
    if (!user) return;
    const token = await user.getIdToken();
    await Promise.all([loadEarnings(token), loadConnectStatus(token), loadSubPlan(token)]);
  }

  async function loadSubPlan(token: string) {
    try {
      const res  = await fetch('/api/contractors/profile', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        if (data.subscriptionPlan) setSubPlan(data.subscriptionPlan as SubPlan);
        if (typeof data.isAvailable === 'boolean') setIsAvailable(data.isAvailable);
        if (data.notifPrefs) setNotifPrefs({ email: true, push: true, sms: false, ...data.notifPrefs });
      }
    } catch { /* ignore */ }
  }

  async function handleAvailToggle() {
    if (!user) return;
    setAvailSaving(true);
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      const token = await user.getIdToken();
      await fetch('/api/contractors/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: next }),
      });
    } catch { setIsAvailable(!next); /* revert on error */ }
    setAvailSaving(false);
  }

  async function handleNotifSave() {
    if (!user) return;
    setNotifSaving(true);
    try {
      const token = await user.getIdToken();
      await fetch('/api/contractors/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notifPrefs }),
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch { /* ignore */ }
    setNotifSaving(false);
  }

  async function handleGoLiveToggle() {
    if (!goLive) {
      // Turning ON: request permissions
      setGoLiveSaving(true);
      try {
        // Check geolocation support
        if (!navigator.geolocation) {
          alert('Geolocation is not supported on your device');
          setGoLiveSaving(false);
          return;
        }

        // Check battery API
        try {
          const battery = await (navigator as any).getBattery?.();
          if (battery) {
            setBatteryLevel(Math.round(battery.level * 100));
          }
        } catch {
          // Battery API not available, continue anyway
        }

        // Request location permission
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationPermission('granted');
            setGoLive(true);
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              setLocationPermission('denied');
              alert('Location permission denied. You need to enable location access to use this feature.');
            } else {
              alert('Unable to access location: ' + error.message);
            }
          }
        );
      } finally {
        setGoLiveSaving(false);
      }
    } else {
      // Turning OFF: stop tracking
      setGoLive(false);
      setLocationPermission('default');
    }
  }

  async function loadEarnings(token: string) {
    setEarningsLoading(true);
    try {
      const res  = await fetch('/api/contractors/earnings', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setEarnings(data);
    } catch { /* ignore */ }
    setEarningsLoading(false);
  }

  async function loadConnectStatus(token: string) {
    setConnectLoading(true);
    try {
      const res  = await fetch('/api/stripe/connect/status', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setConnectStatus(data);
    } catch { /* ignore */ }
    setConnectLoading(false);
  }

  async function handleConnectBank() {
    if (!user) return;
    setConnecting(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('/api/stripe/connect/create-account', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.onboarding_url) window.location.href = data.onboarding_url;
    } catch { /* ignore */ }
    setConnecting(false);
  }

  async function handleRefresh() {
    if (!user) return;
    setRefreshing(true);
    const token = await user.getIdToken();
    await Promise.all([loadEarnings(token), loadConnectStatus(token), loadSubPlan(token)]);
    setRefreshing(false);
  }

  const isVerified = connectStatus?.verified ?? false;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
            Contractor Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-4)' }}>
            Earnings, payouts &amp; account settings
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-3)' }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      {earningsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: 'var(--color-surface)' }} />
          ))}
        </div>
      ) : earnings ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Earned"    value={`$${earnings.totalEarned.toFixed(2)}`}    icon={<DollarSign size={16}   />} color="var(--color-success)" />
          <StatCard label="Pending Payout"  value={`$${earnings.pendingAmount.toFixed(2)}`}  sub={earnings.pendingAmount > 0 ? 'On confirmation' : 'None pending'} icon={<Clock size={16}        />} color="var(--color-warning)" />
          <StatCard label="Jobs Completed"  value={String(earnings.completedJobs)}           icon={<CheckCircle2 size={16} />} color="var(--color-brand)"   />
          <StatCard label="Jobs Claimed"    value={String(earnings.totalJobs)}               icon={<Briefcase size={16}    />} color="#a78bfa"              />
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p style={{ color: 'var(--color-text-4)', fontSize: '0.875rem' }}>No earnings data yet. Claim your first job!</p>
        </div>
      )}

      {/* Earnings chart */}
      {earnings && earnings.payouts.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} style={{ color: 'var(--color-brand)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
              Earnings Trend
            </span>
          </div>
          <EarningsChart data={earnings.monthlyEarnings} />
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: 'var(--color-success)' }}>
                ${earnings.totalEarned.toFixed(0)}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>Total earned</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: 'var(--color-brand)' }}>
                {earnings.completedJobs > 0
                  ? `$${(earnings.totalEarned / earnings.completedJobs).toFixed(0)}`
                  : '—'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>Avg per job</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                {earnings.totalJobs > 0
                  ? `${Math.round((earnings.completedJobs / earnings.totalJobs) * 100)}%`
                  : '—'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>Completion rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Earnings potential banner */}
      {earnings && earnings.totalEarned === 0 && (
        <div
          className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-brand-dim)' }}>
            <TrendingUp size={18} style={{ color: 'var(--color-brand)' }} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
              Top contractors earn $8,000–$22,000/month
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-3)', lineHeight: 1.6 }}>
              Connect your bank, claim open jobs, and start earning today. Upgrade to{' '}
              <strong style={{ color: '#a5b4fc' }}>Pro ($29/mo)</strong> to get priority matching and be shown first.
            </p>
          </div>
          <Link href="/contractor/pro" className="btn btn-sm btn-primary flex-shrink-0">
            Go Pro <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Stripe Connect / Bank */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <Banknote size={15} style={{ color: 'var(--color-brand)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Bank Account & Payouts</span>
          </div>
          {connectLoading ? (
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-text-4)' }} />
          ) : (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={isVerified
                ? { background: 'rgba(34,197,94,0.12)', color: 'var(--color-success)' }
                : { background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: isVerified ? 'var(--color-success)' : 'var(--color-warning)' }} />
              {isVerified ? 'Verified' : 'Not connected'}
            </span>
          )}
        </div>

        <div className="p-5 space-y-4" style={{ background: 'var(--color-surface)' }}>
          {connectLoading ? (
            <div className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-2)' }} />
          ) : isVerified ? (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Bank account connected</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)', lineHeight: 1.6 }}>
                    Payouts are sent automatically when homeowners confirm job completion. Funds arrive in 1–5 business days.
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleConnectBank} disabled={connecting} className="btn btn-sm btn-secondary">
                {connecting ? <><Loader2 size={13} className="animate-spin" /> Redirecting…</> : <><ExternalLink size={13} /> Manage on Stripe</>}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Bank account required</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)', lineHeight: 1.6 }}>
                    Connect your bank to receive payouts. Takes ~2 minutes — your info is stored securely by Stripe, never on our servers.
                  </p>
                </div>
              </div>
              <button type="button" onClick={handleConnectBank} disabled={connecting} className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                {connecting ? <><Loader2 size={15} className="animate-spin" /> Opening Stripe…</> : <><Banknote size={15} /> Connect Bank Account</>}
              </button>
              <p className="text-center text-xs" style={{ color: 'var(--color-text-4)' }}>
                Powered by Stripe — 256-bit encryption, bank-level security
              </p>
            </>
          )}
        </div>
      </div>

      {/* Payout history */}
      {earnings && earnings.payouts.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)' }}
          >
            <DollarSign size={15} style={{ color: 'var(--color-brand)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Payout History</span>
          </div>
          <div style={{ background: 'var(--color-surface)' }}>
            {earnings.payouts.map((p, idx) => (
              <div
                key={p.jobId}
                className="flex items-center gap-4 px-5 py-3.5"
                style={{ borderBottom: idx < earnings.payouts.length - 1 ? '1px solid var(--color-border)' : 'none' }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={p.status === 'paid'
                    ? { background: 'rgba(34,197,94,0.12)', color: 'var(--color-success)' }
                    : { background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)' }}
                >
                  {p.status === 'paid' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{p.trade}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-4)' }}>{p.description || `Job ${p.jobId.slice(0, 8)}`}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: p.status === 'paid' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {p.status === 'paid' ? '+' : '~'}${p.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                    {p.status === 'paid' ? (p.date ? new Date(p.date).toLocaleDateString() : 'Paid') : 'Pending'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription */}
      {(() => {
        const plan = PLAN_LABELS[subPlan] ?? PLAN_LABELS.starter;
        const isUpgradeable = subPlan === 'starter' || subPlan === 'pro';
        return (
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: 'var(--color-surface)',
              border: subPlan !== 'starter'
                ? `1px solid ${plan.color}40`
                : '1px solid var(--color-border)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: subPlan !== 'starter' ? `${plan.color}15` : 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              {subPlan === 'elite' ? <Crown size={18} style={{ color: plan.color }} /> : subPlan === 'pro' ? <Star size={18} style={{ color: plan.color }} /> : <Shield size={18} style={{ color: 'var(--color-text-4)' }} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: subPlan !== 'starter' ? plan.color : 'var(--color-text)' }}>
                {plan.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{plan.detail}</p>
            </div>
            {isUpgradeable && (
              <Link
                href="/contractor/pro"
                className="btn btn-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: '1px solid rgba(99,102,241,0.4)', boxShadow: '0 0 14px rgba(99,102,241,0.25)' }}
              >
                <Crown size={12} /> {subPlan === 'pro' ? 'Go Elite' : 'Upgrade'}
              </Link>
            )}
          </div>
        );
      })()}

      {/* ── Availability Toggle ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: isAvailable ? 'var(--color-success)' : 'var(--color-text-4)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Job Availability</span>
          </div>
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={isAvailable
              ? { background: 'rgba(34,197,94,0.12)', color: 'var(--color-success)' }
              : { background: 'rgba(107,114,128,0.12)', color: 'var(--color-text-4)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: isAvailable ? 'var(--color-success)' : 'var(--color-text-4)' }} />
            {isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>
        <div
          className="p-5 flex items-center justify-between gap-4"
          style={{ background: 'var(--color-surface)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {isAvailable ? 'Accepting new jobs' : 'Not accepting new jobs'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)', lineHeight: 1.6 }}>
              {isAvailable
                ? 'You will receive job invitations and appear in contractor matching.'
                : 'You won\'t receive new invitations until you turn availability back on.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAvailToggle}
            disabled={availSaving}
            className="flex-shrink-0 transition-all"
            style={{ opacity: availSaving ? 0.6 : 1 }}
            aria-label="Toggle availability"
          >
            {isAvailable
              ? <ToggleRight size={40} style={{ color: 'var(--color-success)' }} />
              : <ToggleLeft size={40} style={{ color: 'var(--color-text-4)' }} />}
          </button>
        </div>
      </div>

      {/* ── Go Live for Real-Time Dispatch ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div
          className="px-5 py-4 flex items-center gap-2"
          style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)' }}
        >
          <Zap size={15} style={{ color: '#fbbf24' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Go Live for Dispatch</span>
        </div>
        <div className="p-5 space-y-4" style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: goLive ? 'rgba(250, 204, 21, 0.15)' : 'var(--color-surface-2)', color: goLive ? '#fbbf24' : 'var(--color-text-4)' }}
              >
                <Navigation size={15} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Share Location</p>
                <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                  {goLive
                    ? 'Your location is shared while heading to jobs. Auto-stops at arrival.'
                    : 'Share real-time location to get better job matches and help customers track your arrival.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGoLiveToggle}
              disabled={goLiveSaving}
              className="flex-shrink-0 transition-all"
              aria-label="Toggle Go Live"
            >
              {goLive
                ? <ToggleRight size={32} style={{ color: '#fbbf24' }} />
                : <ToggleLeft size={32} style={{ color: 'var(--color-text-4)' }} />}
            </button>
          </div>

          {/* Battery Warning */}
          {goLive && batteryLevel < 20 && (
            <div
              className="rounded-lg p-3 flex items-start gap-2"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '12px', color: '#ef4444' }}>
                Battery is low ({batteryLevel}%). Location tracking will be reduced to save power.
              </p>
            </div>
          )}

          {/* Permission Status */}
          {goLive && (
            <div
              className="rounded-lg p-3 flex items-start gap-2"
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}
            >
              <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '12px', color: '#10b981' }}>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>Location tracking active</p>
                <p style={{ opacity: 0.9 }}>Battery: {batteryLevel}%</p>
              </div>
            </div>
          )}

          {/* Privacy Info */}
          <div
            className="rounded-lg p-3"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🔒 Privacy
            </p>
            <ul style={{ fontSize: '11px', color: 'var(--color-text-3)', lineHeight: 1.6, paddingLeft: 16 }}>
              <li>• Location only shared during active jobs</li>
              <li>• Auto-stops when you mark job complete</li>
              <li>• Deleted 60 minutes after job</li>
              <li>• Only customers can see your location</li>
              <li>• You can pause anytime ("Break", "Battery low")</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Notification Preferences ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div
          className="px-5 py-4 flex items-center gap-2"
          style={{ background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)' }}
        >
          <Bell size={15} style={{ color: 'var(--color-brand)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Notification Preferences</span>
        </div>
        <div className="p-5 space-y-4" style={{ background: 'var(--color-surface)' }}>
          {([
            { key: 'email', label: 'Email notifications', sub: 'Bids, job updates, payment confirmations', icon: <Mail size={15} /> },
            { key: 'push',  label: 'Push notifications',  sub: 'Real-time alerts in your browser',        icon: <Bell size={15} /> },
            { key: 'sms',   label: 'SMS notifications',   sub: 'Urgent job alerts via text message',      icon: <MessageCircle size={15} /> },
          ] as const).map(({ key, label, sub, icon }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: notifPrefs[key] ? 'var(--color-brand-dim)' : 'var(--color-surface-2)', color: notifPrefs[key] ? 'var(--color-brand)' : 'var(--color-text-4)' }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{sub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                className="flex-shrink-0 transition-all"
                aria-label={`Toggle ${key} notifications`}
              >
                {notifPrefs[key]
                  ? <ToggleRight size={32} style={{ color: 'var(--color-brand)' }} />
                  : <ToggleLeft size={32} style={{ color: 'var(--color-text-4)' }} />}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleNotifSave}
            disabled={notifSaving}
            className="btn btn-primary btn-sm"
            style={{ marginTop: 4 }}
          >
            {notifSaving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : notifSaved ? <><CheckCircle2 size={13} /> Saved!</> : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/contractor-inbox" className="btn btn-secondary btn-full" style={{ justifyContent: 'center' }}>
          <Briefcase size={15} /> Browse Jobs
        </Link>
        <Link href="/contractor/profile" className="btn btn-secondary btn-full" style={{ justifyContent: 'center' }}>
          <Star size={15} /> Edit Profile
        </Link>
      </div>
    </div>
  );
}
