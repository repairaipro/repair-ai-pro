'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection, query, where, onSnapshot, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import {
  Plus, Search, Clock, CheckCircle2, Wrench, DollarSign,
  ChevronRight, AlertTriangle, X, Briefcase,
} from 'lucide-react';

/* ── Types ── */
type Job = {
  id:               string;
  description:      string;
  trade?:           string;
  aiDetectedTrade?: string;
  status:           string;
  paymentAmountUsd?: number;
  location?:        any;
  createdAt?:       any;
  updatedAt?:       any;
  claimedBy?:       string;
  aiSummary?:       string;
};

/* ── Status config ── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; group: string }> = {
  triaged:     { label: 'Finding Contractors', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  group: 'active' },
  open:        { label: 'Open',                color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  group: 'active' },
  matched:     { label: 'Matched',             color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  group: 'active' },
  accepted:    { label: 'Contractor Assigned', color: '#818cf8', bg: 'rgba(99,102,241,0.1)',  group: 'active' },
  claimed:     { label: 'Contractor Assigned', color: '#818cf8', bg: 'rgba(99,102,241,0.1)',  group: 'active' },
  in_progress: { label: 'In Progress',         color: '#fb923c', bg: 'rgba(249,115,22,0.1)',  group: 'active' },
  completed:   { label: 'Awaiting Confirm',    color: '#fb923c', bg: 'rgba(249,115,22,0.1)',  group: 'active' },
  confirmed:   { label: 'Confirmed ✓',         color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   group: 'done'   },
  verified:    { label: 'Verified ✓',           color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   group: 'done'   },
  disputed:    { label: 'Disputed',            color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   group: 'issue'  },
  cancelled:   { label: 'Cancelled',           color: '#6b7280', bg: 'rgba(107,114,128,0.1)', group: 'done'   },
};

const TRADE_ICONS: Record<string, string> = {
  Plumbing: '🔧', Electrical: '⚡', HVAC: '❄️', Carpentry: '🪚',
  Roofing: '🏠', Appliance: '🍳', Handyman: '🛠', General: '⚙️',
  Painting: '🎨', Landscaping: '🌿',
};

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
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.triaged;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 9999,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function Skeleton() {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 16, padding: '16px 18px',
    }} className="animate-pulse">
      <div className="flex items-center gap-3">
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-surface-2)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: '60%', background: 'var(--color-surface-2)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '40%', background: 'var(--color-surface-2)', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

export default function MyJobsPage() {
  const { user } = useAuth();
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<'all' | 'active' | 'done' | 'issue'>('all');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'jobs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    }, () => setLoading(false));
  }, [user]);

  if (!user) return null;

  /* Filter */
  const filtered = jobs.filter((job) => {
    const cfg = STATUS_CFG[job.status] ?? { group: 'active' };
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && cfg.group === 'active') ||
      (filter === 'done'   && cfg.group === 'done') ||
      (filter === 'issue'  && cfg.group === 'issue');

    const matchSearch =
      !search.trim() ||
      job.description?.toLowerCase().includes(search.toLowerCase()) ||
      (job.trade ?? '').toLowerCase().includes(search.toLowerCase()) ||
      getCity(job.location).toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  /* Summary stats */
  const total     = jobs.length;
  const active    = jobs.filter((j) => (STATUS_CFG[j.status]?.group ?? 'active') === 'active').length;
  const done      = jobs.filter((j) => ['confirmed', 'verified'].includes(j.status)).length;
  const totalSpent = jobs
    .filter((j) => ['confirmed', 'verified'].includes(j.status))
    .reduce((s, j) => s + (j.paymentAmountUsd ?? 0), 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>My Jobs</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-4)', marginTop: 2 }}>
              All your posted jobs and their status
            </p>
          </div>
          <Link href="/jobs/new" className="btn btn-primary btn-sm">
            <Plus size={14} /> New Job
          </Link>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Jobs',  value: total,                    icon: <Briefcase size={16} />,    color: '#818cf8' },
            { label: 'Active',      value: active,                   icon: <Clock size={16} />,        color: '#fbbf24' },
            { label: 'Total Spent', value: `$${totalSpent.toFixed(0)}`, icon: <DollarSign size={16} />, color: '#22c55e' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              padding: '14px 16px',
            }}>
              <div style={{ color, marginBottom: 6 }}>{icon}</div>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-4)', marginTop: 3 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-4)',
          }} />
          <input
            type="text"
            placeholder="Search jobs by description, trade, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 36, paddingRight: search ? 36 : 12,
              paddingTop: 10, paddingBottom: 10,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              color: 'var(--color-text)',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--color-text-4)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            { key: 'all',    label: 'All',      count: total },
            { key: 'active', label: 'Active',   count: active },
            { key: 'done',   label: 'Completed', count: done },
            { key: 'issue',  label: 'Issues',   count: jobs.filter(j => j.status === 'disputed').length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 16px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'all 0.15s',
                ...(filter === key ? {
                  background: 'var(--color-brand)',
                  color: '#fff',
                  borderColor: 'var(--color-brand)',
                } : {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-3)',
                  borderColor: 'var(--color-border)',
                }),
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: filter === key ? 'rgba(255,255,255,0.7)' : 'var(--color-text-4)',
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '2px dashed var(--color-border)',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {filter === 'done' ? '✅' : filter === 'active' ? '⏳' : '📋'}
            </div>
            <h3 style={{ color: 'var(--color-text)', fontWeight: 700, marginBottom: 8 }}>
              {search ? 'No matches found' : filter === 'all' ? "You haven't posted any jobs yet" : `No ${filter} jobs`}
            </h3>
            <p style={{ color: 'var(--color-text-4)', fontSize: 13, marginBottom: 20 }}>
              {search
                ? 'Try a different search term'
                : filter === 'all'
                ? 'Post your first job — describe the problem and AI does the rest'
                : 'Try switching to "All" to see your full history'}
            </p>
            {filter === 'all' && !search && (
              <Link href="/jobs/new" className="btn btn-primary btn-sm">
                <Plus size={14} /> Post a Job
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job) => {
              const trade = job.aiDetectedTrade ?? job.trade ?? 'General';
              const cfg   = STATUS_CFG[job.status] ?? STATUS_CFG.triaged;
              const city  = getCity(job.location);
              const needsAction = job.status === 'completed';

              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  style={{
                    display: 'block',
                    background: 'var(--color-surface)',
                    border: `1px solid ${needsAction ? 'rgba(249,115,22,0.35)' : 'var(--color-border)'}`,
                    borderRadius: 16,
                    padding: '14px 16px',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = needsAction ? 'rgba(249,115,22,0.35)' : 'var(--color-border)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Trade icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: 'var(--color-surface-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0,
                    }}>
                      {TRADE_ICONS[trade] ?? '🔧'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: 'var(--color-text)', fontWeight: 600, fontSize: 14,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 4,
                      }}>
                        {job.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <StatusBadge status={job.status} />
                        {city && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>
                            📍 {city}
                          </span>
                        )}
                        {job.paymentAmountUsd && (
                          <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                            ${job.paymentAmountUsd}
                          </span>
                        )}
                        {job.createdAt && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>
                            {timeAgo(job.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {needsAction && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '3px 8px', borderRadius: 9999,
                          background: 'rgba(249,115,22,0.15)',
                          color: '#fb923c',
                          border: '1px solid rgba(249,115,22,0.3)',
                        }}>
                          Action needed
                        </span>
                      )}
                      <ChevronRight size={16} style={{ color: 'var(--color-text-4)' }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
