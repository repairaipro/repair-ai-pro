'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Home, DollarSign, CheckCircle,
  Clock, XCircle, AlertTriangle, Wrench, ChevronRight,
  Star, Calendar, Filter, Search, RotateCcw,
} from 'lucide-react';

const TRADE_ICONS: Record<string, string> = {
  plumbing: '🔧', electrical: '⚡', hvac: '❄️', roofing: '🏠',
  appliance: '🍽️', landscaping: '🌿', cleaning: '🧹', general: '🔨',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  triaged:     { label: 'Searching',   color: '#f59e0b', icon: Clock },
  accepted:    { label: 'Assigned',    color: '#3b82f6', icon: Clock },
  in_progress: { label: 'In Progress', color: '#8b5cf6', icon: Wrench },
  completed:   { label: 'Pending Confirm', color: '#f97316', icon: Clock },
  confirmed:   { label: 'Complete',    color: '#10b981', icon: CheckCircle },
  cancelled:   { label: 'Cancelled',   color: '#6b7280', icon: XCircle },
  disputed:    { label: 'Disputed',    color: '#ef4444', icon: AlertTriangle },
};

type Contractor = {
  id: string;
  name: string | null;
  trade: string | null;
  photoUrl: string | null;
  rating: number | null;
};

type Job = {
  id: string;
  description: string;
  trade: string;
  status: string;
  paymentStatus: string | null;
  paymentAmountUsd: number;
  isMaintenanceJob: boolean;
  maintenancePlanTitle: string | null;
  location: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contractor: Contractor | null;
  milestones: { total: number; released: number };
  hasInvoice: boolean;
  invoiceId: string | null;
  hasDispute: boolean;
  aiSummary: string | null;
};

type Summary = {
  total: number;
  confirmed: number;
  inProgress: number;
  cancelled: number;
  totalSpent: number;
  tradeBreakdown: Record<string, number>;
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ContractorAvatar({ contractor, size = 32 }: { contractor: Contractor; size?: number }) {
  if (contractor.photoUrl) {
    return (
      <img src={contractor.photoUrl} alt={contractor.name || ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  const initials = (contractor.name || 'C').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function JobCard({ job, index }: { job: Job; index: number }) {
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.triaged;
  const StatusIcon = cfg.icon;
  const tradeIcon = TRADE_ICONS[job.trade?.toLowerCase()] || '🔨';
  const isComplete = job.status === 'confirmed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        href={`/jobs/${job.id}`}
        style={{ display: 'block', textDecoration: 'none' }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 16,
            padding: '16px 18px',
            transition: 'border-color 0.15s, background 0.15s',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget as HTMLElement).style.borderColor = isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)';
          }}
        >
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{tradeIcon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                  {job.isMaintenanceJob && job.maintenancePlanTitle ? `🔄 ${job.maintenancePlanTitle}` : job.description}
                </span>
                <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: `${cfg.color}18`, color: cfg.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <StatusIcon size={10} /> {cfg.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> {formatDate(job.createdAt)}
                </span>
                {job.location && (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{job.location}</span>
                )}
                {job.milestones.total > 0 && (
                  <span style={{ fontSize: 12, color: '#6366f1' }}>
                    {job.milestones.released}/{job.milestones.total} milestones
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {job.paymentAmountUsd > 0 && (
                <div style={{ fontSize: 18, fontWeight: 800, color: isComplete ? '#10b981' : '#e5e7eb' }}>
                  ${fmt(job.paymentAmountUsd)}
                </div>
              )}
              <ChevronRight size={16} color="#374151" style={{ marginTop: 4 }} />
            </div>
          </div>

          {/* Contractor row */}
          {job.contractor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <ContractorAvatar contractor={job.contractor} size={24} />
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
                {job.contractor.name || 'Contractor'}
              </span>
              {job.contractor.rating && (
                <span style={{ fontSize: 11, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Star size={10} fill="#fbbf24" /> {job.contractor.rating.toFixed(1)}
                </span>
              )}
              {job.hasDispute && (
                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: '#f87171', fontWeight: 600, marginLeft: 'auto' }}>
                  Disputed
                </span>
              )}
              {job.hasInvoice && !job.hasDispute && (
                <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 'auto' }}>Invoice available</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const authLoading = user === undefined;
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [allTrades, setAllTrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrade, setFilterTrade] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token: string) => fetchHistory(token));
  }, [user]);

  async function fetchHistory(token: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/homeowner/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
        setSummary(data.summary);
        setAllTrades(data.allTrades || []);
      }
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }

  const filtered = jobs.filter((j) => {
    if (filterStatus !== 'all' && j.status !== filterStatus) return false;
    if (filterTrade !== 'all' && j.trade?.toLowerCase() !== filterTrade.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        j.description.toLowerCase().includes(q) ||
        j.contractor?.name?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.trade?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasFilters = filterStatus !== 'all' || filterTrade !== 'all' || search !== '';

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <Loader2 size={32} className="animate-spin" color="#6366f1" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9ca3af', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={22} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Home Service History
              </h1>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Every job, contractor, and payment — all in one place</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="animate-spin" color="#6366f1" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#6b7280', fontSize: 14 }}>Loading your service history…</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Jobs', value: summary.total.toString(), color: '#e5e7eb', icon: Home },
                  { label: 'Completed', value: summary.confirmed.toString(), color: '#10b981', icon: CheckCircle },
                  { label: 'In Progress', value: summary.inProgress.toString(), color: '#6366f1', icon: Wrench },
                  { label: 'Total Spent', value: `$${fmt(summary.totalSpent)}`, color: '#f59e0b', icon: DollarSign },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <card.icon size={13} color={card.color} />
                      <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{card.label}</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Top trades by spend */}
            {summary && Object.keys(summary.tradeBreakdown).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}
              >
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Spending by Trade</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(summary.tradeBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([trade, amount]) => (
                      <div key={trade} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 20 }}>
                        <span style={{ fontSize: 16 }}>{TRADE_ICONS[trade.toLowerCase()] || '🔨'}</span>
                        <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600, textTransform: 'capitalize' }}>{trade}</span>
                        <span style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>${fmt(amount)}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={14} color="#6b7280" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs, contractors, locations…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 34px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e5e7eb', fontSize: 13, outline: 'none' }}
                />
              </div>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e5e7eb', fontSize: 13, cursor: 'pointer', outline: 'none' }}
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="accepted">Assigned</option>
                <option value="triaged">Searching</option>
                <option value="cancelled">Cancelled</option>
                <option value="disputed">Disputed</option>
              </select>

              {/* Trade filter */}
              {allTrades.length > 0 && (
                <select
                  value={filterTrade}
                  onChange={(e) => setFilterTrade(e.target.value)}
                  style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e5e7eb', fontSize: 13, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">All Trades</option>
                  {allTrades.map((t) => (
                    <option key={t} value={t} style={{ textTransform: 'capitalize' }}>
                      {TRADE_ICONS[t.toLowerCase()] || '🔨'} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              )}

              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setFilterStatus('all'); setFilterTrade('all'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  <RotateCcw size={13} /> Clear
                </button>
              )}
            </div>

            {/* Result count */}
            {hasFilters && (
              <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 12 }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </p>
            )}

            {/* Job list */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                {jobs.length === 0 ? (
                  <>
                    <Home size={40} color="#1f2937" style={{ margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>No jobs yet</h2>
                    <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Post your first home repair job to get started.</p>
                    <Link
                      href="/jobs/new"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}
                    >
                      Post a Job
                    </Link>
                  </>
                ) : (
                  <>
                    <Filter size={32} color="#374151" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: '#6b7280', fontSize: 14 }}>No jobs match your filters.</p>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
