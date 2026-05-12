'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { collection, collectionGroup, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import {
  ChevronLeft, TrendingUp, DollarSign, Trophy, Clock, X, ChevronRight,
} from 'lucide-react';

/* ── Types ── */
type Bid = {
  jobId:        string;
  amount:       number;
  message?:     string;
  etaDays?:     number;
  submittedAt?: any;
  status:       'pending' | 'selected' | 'declined';
  // Merged job info
  jobDescription?: string;
  jobTrade?:       string;
  jobStatus?:      string;
  jobLocation?:    any;
};

/* ── Helpers ── */
const TRADE_ICONS: Record<string, string> = {
  Plumbing: '🔧', Electrical: '⚡', HVAC: '❄️', Carpentry: '🪚',
  Roofing: '🏠', Appliance: '🍳', Handyman: '🛠', General: '⚙️',
  Painting: '🎨', Landscaping: '🌿',
};

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

function getCity(loc: any): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return loc.city ?? '';
}

/* ── Bid status badge ── */
function BidStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    pending:  { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  label: 'Awaiting Decision', icon: '⏳' },
    selected: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Won!',               icon: '🏆' },
    declined: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Not Selected',       icon: '✕' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 9999,
      background: c.bg, color: c.color,
    }}>
      {c.icon} {c.label}
    </span>
  );
}

export default function BidHistoryPage() {
  const { user } = useAuth();
  const [bids,    setBids]    = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<'all' | 'pending' | 'selected' | 'declined'>('all');

  useEffect(() => {
    if (!user) return;

    // Query across all jobs' bids subcollections using collectionGroup
    const q = query(
      collectionGroup(db, 'bids'),
      where('contractorId', '==', user.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      // Hydrate with job data
      const hydrated = await Promise.all(
        snap.docs.map(async (bidDoc): Promise<Bid> => {
          const bidData = bidDoc.data() as any;
          // Extract jobId from the path: jobs/{jobId}/bids/{uid}
          const jobId = bidDoc.ref.parent.parent?.id ?? '';
          try {
            const jobSnap = await getDoc(doc(db, 'jobs', jobId));
            const job = jobSnap.data() as any;
            return {
              jobId,
              amount:          bidData.amount,
              message:         bidData.message,
              etaDays:         bidData.etaDays,
              submittedAt:     bidData.submittedAt,
              status:          bidData.status ?? 'pending',
              jobDescription:  job?.description,
              jobTrade:        job?.aiDetectedTrade ?? job?.trade,
              jobStatus:       job?.status,
              jobLocation:     job?.location,
            };
          } catch {
            return {
              jobId,
              amount:      bidData.amount,
              status:      bidData.status ?? 'pending',
              submittedAt: bidData.submittedAt,
            };
          }
        })
      );
      setBids(hydrated);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user]);

  if (!user) return null;

  const filtered = filter === 'all' ? bids : bids.filter((b) => b.status === filter);

  const totalBids    = bids.length;
  const wonBids      = bids.filter((b) => b.status === 'selected').length;
  const pendingBids  = bids.filter((b) => b.status === 'pending').length;
  const totalBid     = bids.filter((b) => b.status === 'selected').reduce((s, b) => s + b.amount, 0);
  const winRate      = totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/contractor-inbox"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 13, color: 'var(--color-text-4)', textDecoration: 'none',
              }}
            >
              <ChevronLeft size={15} /> Inbox
            </Link>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                Bid History
              </h1>
              <p style={{ fontSize: 13, color: 'var(--color-text-4)', marginTop: 2 }}>
                All bids you've submitted
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Bids',  value: totalBids,          icon: <TrendingUp size={16} />, color: '#818cf8' },
            { label: 'Won',         value: wonBids,            icon: <Trophy size={16} />,     color: '#22c55e' },
            { label: 'Pending',     value: pendingBids,        icon: <Clock size={16} />,      color: '#fbbf24' },
            { label: 'Win Rate',    value: `${winRate}%`,      icon: <DollarSign size={16} />, color: '#fb923c' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 14, padding: '14px 16px',
            }}>
              <div style={{ color, marginBottom: 6 }}>{icon}</div>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-4)', marginTop: 3 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            { key: 'all',      label: 'All',           count: totalBids },
            { key: 'pending',  label: 'Pending',       count: pendingBids },
            { key: 'selected', label: 'Won',           count: wonBids },
            { key: 'declined', label: 'Not Selected',  count: bids.filter((b) => b.status === 'declined').length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 16px', borderRadius: 9999,
                fontSize: 13, fontWeight: 500, border: '1px solid',
                cursor: 'pointer', transition: 'all 0.15s',
                ...(filter === key ? {
                  background: 'var(--color-brand)', color: '#fff',
                  borderColor: 'var(--color-brand)',
                } : {
                  background: 'var(--color-surface)', color: 'var(--color-text-3)',
                  borderColor: 'var(--color-border)',
                }),
              }}
            >
              {label}
              <span style={{
                marginLeft: 6, fontSize: 11,
                color: filter === key ? 'rgba(255,255,255,0.7)' : 'var(--color-text-4)',
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                height: 90,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
              }} className="animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '2px dashed var(--color-border)',
            borderRadius: 16, padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h3 style={{ color: 'var(--color-text)', fontWeight: 700, marginBottom: 8 }}>
              {filter === 'all' ? "No bids yet" : `No ${filter} bids`}
            </h3>
            <p style={{ color: 'var(--color-text-4)', fontSize: 13, marginBottom: 20 }}>
              {filter === 'all'
                ? 'Start bidding on job invitations to build your history'
                : 'Switch to "All" to see your full history'}
            </p>
            {filter === 'all' && (
              <Link href="/contractor-inbox" className="btn btn-primary btn-sm">
                View Invitations
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((bid) => {
              const trade = bid.jobTrade ?? 'General';
              const city  = getCity(bid.jobLocation);
              const isWon = bid.status === 'selected';

              return (
                <Link
                  key={bid.jobId}
                  href={`/jobs/${bid.jobId}`}
                  style={{
                    display: 'block',
                    background: isWon ? 'rgba(34,197,94,0.04)' : 'var(--color-surface)',
                    border: `1px solid ${isWon ? 'rgba(34,197,94,0.25)' : 'var(--color-border)'}`,
                    borderRadius: 16, padding: '14px 16px',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = isWon ? 'rgba(34,197,94,0.25)' : 'var(--color-border)';
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
                        {bid.jobDescription ?? `${trade} job`}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <BidStatusBadge status={bid.status} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                          ${bid.amount.toFixed(2)}
                        </span>
                        {city && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>
                            📍 {city}
                          </span>
                        )}
                        {bid.submittedAt && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>
                            {timeAgo(bid.submittedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={16} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
                  </div>

                  {/* Message preview */}
                  {bid.message && bid.status !== 'declined' && (
                    <p style={{
                      fontSize: 12, color: 'var(--color-text-4)',
                      marginTop: 10, paddingTop: 10,
                      borderTop: '1px solid var(--color-border)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      "{bid.message}"
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
