'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, TrendingUp, DollarSign, Clock,
  Briefcase, Calendar, ChevronRight, Shield,
} from 'lucide-react';

const TRADE_ICONS: Record<string, string> = {
  plumbing: '🔧', electrical: '⚡', hvac: '❄️', roofing: '🏠',
  appliance: '🍽️', landscaping: '🌿', cleaning: '🧹', general: '🔨',
};

type Summary = {
  totalGross: number;
  totalNet: number;
  totalPending: number;
  totalJobs: number;
  pendingJobs: number;
  platformFee: number;
  thisMonth: { net: number; jobs: number };
  lastMonth: { net: number; jobs: number };
};

type MonthBucket = {
  year: number;
  month: number;
  label: string;
  gross: number;
  net: number;
  jobs: number;
};

type TradeStat = {
  trade: string;
  gross: number;
  net: number;
  jobs: number;
};

type Payout = {
  id: string;
  description: string;
  trade: string;
  gross: number;
  net: number;
  isMaintenanceJob: boolean;
  maintenancePlanTitle: string | null;
  paidAt: string | null;
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function pct(a: number, b: number) {
  if (!b) return null;
  const diff = ((a - b) / b) * 100;
  return diff;
}

// Pure-CSS bar chart — no external dependency
function BarChart({ data }: { data: MonthBucket[] }) {
  const maxNet = Math.max(...data.map((d) => d.net), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px' }}>
      {data.map((bucket, i) => {
        const height = Math.max((bucket.net / maxNet) * 120, bucket.net > 0 ? 4 : 0);
        const isCurrentMonth = i === data.length - 1;
        return (
          <div
            key={bucket.label}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            title={`${bucket.label}: $${fmt(bucket.net)} net (${bucket.jobs} jobs)`}
          >
            <div
              style={{
                width: '100%',
                height,
                borderRadius: '4px 4px 0 0',
                background: isCurrentMonth
                  ? 'linear-gradient(180deg, #818cf8, #6366f1)'
                  : bucket.net > 0
                  ? 'rgba(99,102,241,0.4)'
                  : 'rgba(255,255,255,0.06)',
                transition: 'height 0.4s ease',
                cursor: 'default',
              }}
            />
            <span style={{
              fontSize: 9,
              color: isCurrentMonth ? '#a5b4fc' : '#4b5563',
              fontWeight: isCurrentMonth ? 700 : 400,
              whiteSpace: 'nowrap',
              transform: 'rotate(-35deg)',
              transformOrigin: 'right center',
              display: 'block',
              marginTop: 4,
            }}>
              {bucket.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ContractorEarningsPage() {
  const { user } = useAuth();
  const authLoading = user === undefined;
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [chart, setChart] = useState<MonthBucket[]>([]);
  const [trades, setTrades] = useState<TradeStat[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token: string) => fetchEarnings(token));
  }, [user]);

  async function fetchEarnings(token: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/contractor/earnings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSummary(data.summary);
      setChart(data.monthlyChart);
      setTrades(data.tradeBreakdown);
      setPayouts(data.recentPayouts);
    } catch (e: any) {
      setError(e.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <Loader2 size={32} className="animate-spin" color="#6366f1" />
      </div>
    );
  }

  const monthChange = summary ? pct(summary.thisMonth.net, summary.lastMonth.net) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Earnings
              </h1>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Your revenue, payouts & income trends</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', color: '#f87171', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {summary && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                {
                  label: 'Total Earned',
                  value: `$${fmt(summary.totalNet)}`,
                  sub: `$${fmt(summary.totalGross)} gross`,
                  color: '#10b981',
                  icon: DollarSign,
                },
                {
                  label: 'This Month',
                  value: `$${fmt(summary.thisMonth.net)}`,
                  sub: monthChange !== null
                    ? `${monthChange >= 0 ? '+' : ''}${monthChange.toFixed(0)}% vs last month`
                    : `${summary.thisMonth.jobs} jobs`,
                  color: monthChange !== null && monthChange >= 0 ? '#6366f1' : '#f59e0b',
                  icon: Calendar,
                },
                {
                  label: 'Pending Payout',
                  value: `$${fmt(summary.totalPending)}`,
                  sub: `${summary.pendingJobs} job${summary.pendingJobs !== 1 ? 's' : ''} awaiting confirm`,
                  color: '#f59e0b',
                  icon: Clock,
                },
                {
                  label: 'Jobs Completed',
                  value: summary.totalJobs.toString(),
                  sub: `${(summary.platformFee * 100).toFixed(0)}% platform fee`,
                  color: '#a78bfa',
                  icon: Briefcase,
                },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <card.icon size={16} color={card.color} />
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{card.label}</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>{card.sub}</div>
                </motion.div>
              ))}
            </div>

            {/* Monthly bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '22px 24px', marginBottom: 20 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#e5e7eb' }}>Monthly Revenue</h2>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Net earnings after 10% platform fee — last 12 months</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#818cf8' }}>${fmt(summary.thisMonth.net)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>this month</div>
                </div>
              </div>
              <BarChart data={chart} />
            </motion.div>

            {/* Trade breakdown + recent payouts — 2-col on wide screens */}
            <div style={{ display: 'grid', gridTemplateColumns: trades.length > 0 ? '1fr 1.6fr' : '1fr', gap: 16, alignItems: 'start' }}>
              {/* Trade breakdown */}
              {trades.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '20px 22px' }}
                >
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#e5e7eb' }}>By Trade</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {trades.map((t) => {
                      const share = summary.totalGross > 0 ? (t.gross / summary.totalGross) * 100 : 0;
                      return (
                        <div key={t.trade}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{TRADE_ICONS[t.trade] || '🔨'}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', textTransform: 'capitalize' }}>{t.trade}</span>
                              <span style={{ fontSize: 11, color: '#6b7280' }}>{t.jobs}j</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>${fmt(t.net)}</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${share}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Recent payouts table */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '20px 22px' }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#e5e7eb' }}>Recent Payouts</h2>

                {payouts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <Briefcase size={28} color="#374151" style={{ margin: '0 auto 10px' }} />
                    <p style={{ color: '#6b7280', fontSize: 13 }}>No payouts yet. Complete your first job to see earnings here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {payouts.map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.04 }}
                      >
                        <Link
                          href={`/jobs/${p.id}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, textDecoration: 'none', background: 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontSize: 22, flexShrink: 0 }}>{TRADE_ICONS[p.trade] || '🔨'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.isMaintenanceJob && p.maintenancePlanTitle
                                ? `🔄 ${p.maintenancePlanTitle}`
                                : p.description}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{formatDate(p.paidAt)}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>${fmt(p.net)}</div>
                            <div style={{ fontSize: 11, color: '#4b5563' }}>${fmt(p.gross)} gross</div>
                          </div>
                          <ChevronRight size={14} color="#374151" />
                        </Link>
                        {i < payouts.length - 1 && (
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 12px' }} />
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Platform fee explainer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, padding: '12px 16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12 }}
            >
              <Shield size={16} color="#818cf8" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
                A <strong style={{ color: '#a5b4fc' }}>10% platform fee</strong> is deducted from each job. This covers payment processing, escrow, insurance verification, and platform support. Your net earnings are transferred directly to your bank via Stripe Connect.
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
