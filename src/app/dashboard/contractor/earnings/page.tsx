'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  DollarSign, TrendingUp, Clock, CheckCircle2,
  ChevronLeft, Briefcase, ExternalLink, AlertCircle,
  Loader2, BarChart2, Download,
} from 'lucide-react';
import { EarningsChart } from '@/components/EarningsChart';
import { TradePerformance } from '@/components/TradePerformance';
import { PeerBenchmark } from '@/components/PeerBenchmark';
import { ResponseTimeTrend } from '@/components/ResponseTimeTrend';
import { RatingTrend } from '@/components/RatingTrend';

/* ─── Types ── */
type Payout = {
  jobId:       string;
  amount:      number;
  status:      'paid' | 'pending';
  trade:       string;
  description: string;
  date:        string | null;
};

type TradeData = {
  trade: string;
  total: number;
  count: number;
  avg: number;
};

type MonthlyData = {
  date: string;
  amount: number;
};

type EarningsSummary = {
  totalEarned:   number;
  pendingAmount: number;
  completedJobs: number;
  totalJobs:     number;
  averagePerJob: number;
  monthlyEarnings: MonthlyData[];
  byTrade: TradeData[];
  completionRate: number;
  rating: number;
  responseTime: number;
  percentile: number;
  payouts:       Payout[];
  reviewCount?: number;
};

/* ─── Helpers ── */
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: '🔧', Electrical: '⚡', HVAC: '❄️', Carpentry: '🪚',
  Roofing: '🏠', Landscaping: '🌿', Painting: '🎨', Appliance: '🔌',
  General: '🔨',
};

/* ─── Stat Card ── */
function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: accent ? `${accent}18` : 'var(--color-surface-2)', color: accent ?? 'var(--color-text-3)' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
          {value}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Main ── */
export default function EarningsPage() {
  const { user } = useAuth();
  const [data,    setData]    = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(async (token: string) => {
      try {
        const res = await fetch('/api/contractors/earnings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load');
        setData(await res.json());
      } catch (e: any) {
        setError(e.message ?? 'Could not load earnings');
      } finally {
        setLoading(false);
      }
    });
  }, [user]);

  const filtered = (data?.payouts ?? []).filter((p) =>
    filter === 'all' ? true : p.status === filter,
  );

  const winRate = data && data.totalJobs > 0
    ? Math.round((data.completedJobs / data.totalJobs) * 100)
    : 0;

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <Link
            href="/dashboard/contractor"
            className="inline-flex items-center gap-1.5 text-sm mb-4"
            style={{ color: 'var(--color-text-4)' }}
          >
            <ChevronLeft className="w-4 h-4" /> Contractor Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
                Earnings & Payouts
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                Your payment history and pending payouts
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm opacity-50 cursor-not-allowed"
              disabled
              title="Export coming soon"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<DollarSign className="w-5 h-5" />}
                label="Total earned"
                value={fmtCurrency(data.totalEarned)}
                accent="#22c55e"
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Pending payout"
                value={fmtCurrency(data.pendingAmount)}
                sub={data.pendingAmount > 0 ? 'Releases on job confirm' : 'Nothing pending'}
                accent="#fb923c"
              />
              <StatCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Jobs completed"
                value={String(data.completedJobs)}
                accent="#818cf8"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Avg per job"
                value={fmtCurrency(data.averagePerJob)}
                sub={data.completedJobs > 0 ? `${data.completedJobs} jobs` : 'No jobs yet'}
                accent="#fbbf24"
              />
            </div>

            {/* Charts section */}
            <div className="space-y-4">
              {/* Earnings trend */}
              <EarningsChart data={data.monthlyEarnings} />

              {/* Trade performance */}
              {data.byTrade.length > 0 && <TradePerformance data={data.byTrade} />}
            </div>

            {/* Performance metrics */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  label="Completion rate"
                  value={`${data.completionRate}%`}
                  accent="#22c55e"
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Pending payout"
                  value={fmtCurrency(data.pendingAmount)}
                  sub={data.pendingAmount > 0 ? 'Releases on confirm' : 'Nothing pending'}
                  accent="#fb923c"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ResponseTimeTrend
                  currentAverage={data.responseTime}
                  trend="stable"
                />
                <RatingTrend
                  currentRating={data.rating}
                  reviewCount={data.reviewCount || 0}
                  trend="stable"
                />
              </div>
            </div>

            {/* Peer benchmark */}
            <PeerBenchmark
              percentile={data.percentile}
              totalEarnings={data.totalEarned}
            />

            {/* Fee info */}
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <BarChart2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#a5b4fc' }}>
                  Platform fee: 12% · Your cut: 88%
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
                  Payouts are sent to your connected bank account via Stripe after homeowner confirms the job.
                  Funds typically arrive within 1–2 business days.
                </p>
              </div>
            </div>

            {/* Stripe Connect banner if no earnings yet */}
            {data.totalEarned === 0 && data.completedJobs === 0 && (
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <DollarSign className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-4)' }} />
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-2)' }}>
                  No payouts yet
                </p>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-4)' }}>
                  Complete your first job and confirm payment to see earnings here.
                </p>
                <Link href="/contractor-inbox" className="btn btn-primary btn-sm">
                  <Briefcase className="w-3.5 h-3.5" /> Browse Jobs
                </Link>
              </div>
            )}

            {/* Payout History */}
            {data.payouts.length > 0 && (
              <div>
                {/* Filter tabs */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Payout History
                  </h2>
                  <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                    {(['all', 'paid', 'pending'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="px-3 py-1.5 text-xs font-medium capitalize transition-colors"
                        style={
                          filter === f
                            ? { background: 'var(--color-brand)', color: '#fff' }
                            : { background: 'var(--color-surface)', color: 'var(--color-text-3)' }
                        }
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {filtered.length === 0 && (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-4)' }}>
                      No {filter} payouts
                    </p>
                  )}
                  {filtered.map((p) => (
                    <div
                      key={p.jobId}
                      className="flex items-center gap-3 rounded-xl p-3.5"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      {/* Trade emoji */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ background: 'var(--color-surface-2)' }}
                      >
                        {TRADE_EMOJI[p.trade] ?? '🔨'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {p.description || p.trade}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                          {p.trade} · {fmtDate(p.date)}
                        </p>
                      </div>

                      {/* Amount + status */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className="text-sm font-bold"
                          style={{ color: p.status === 'paid' ? '#22c55e' : '#fb923c' }}
                        >
                          {fmtCurrency(p.amount)}
                        </p>
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={
                            p.status === 'paid'
                              ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e' }
                              : { background: 'rgba(251,146,60,0.1)', color: '#fb923c' }
                          }
                        >
                          {p.status === 'paid' ? (
                            <><CheckCircle2 className="w-2.5 h-2.5" /> Paid</>
                          ) : (
                            <><Clock className="w-2.5 h-2.5" /> Pending</>
                          )}
                        </span>
                      </div>

                      {/* View job link */}
                      <Link
                        href={`/jobs/${p.jobId}`}
                        className="p-1.5 rounded-lg ml-1 flex-shrink-0"
                        style={{ color: 'var(--color-text-4)', background: 'var(--color-surface-2)' }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
