'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  Zap, Loader2, AlertCircle, Clock, TrendingDown, Target,
} from 'lucide-react';

type FunnelData = {
  days: number;
  totalEvents: number;
  counts: Record<string, number>;
  conversions: { from: string; to: string; rate: number | null }[];
  northStar: {
    timeToFirstBidMinutes: { median: number | null; p75: number | null; sampleSize: number };
    timeToClaimMinutes: { median: number | null; p75: number | null; sampleSize: number };
    jobsPostedWithNoBid: number;
  };
};

const STAGE_LABELS: Record<string, string> = {
  diagnosis_run:       'Diagnoses run',
  job_posted:          'Jobs posted',
  contractors_invited: 'Invite waves',
  bid_submitted:       'Bids submitted',
  job_claimed:         'Jobs claimed',
  job_completed:       'Jobs completed',
  job_confirmed:       'Jobs confirmed (paid)',
};

function fmtMinutes(m: number | null): string {
  if (m === null) return '—';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60 * 10) / 10}h`;
  return `${Math.round(m / 1440 * 10) / 10}d`;
}

export default function AdminFunnelPage() {
  const { user } = useAuth();
  const [data, setData]       = useState<FunnelData | null>(null);
  const [days, setDays]       = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    user.getIdToken().then((token: string) =>
      fetch(`/api/admin/funnel?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setData(d);
          else setError(d.error ?? 'Failed to load funnel');
        })
        .catch(() => setError('Failed to load funnel'))
        .finally(() => setLoading(false))
    );
  }, [user, days]);

  const maxCount = data ? Math.max(1, ...Object.values(data.counts)) : 1;
  const ttfb = data?.northStar.timeToFirstBidMinutes;
  // The health verdict: median time-to-first-bid under 15 min = alive
  const verdict = ttfb?.median == null
    ? { label: 'No data yet', color: '#9ca3af' }
    : ttfb.median <= 15
      ? { label: 'Marketplace is ALIVE', color: '#22c55e' }
      : ttfb.median <= 120
        ? { label: 'Needs attention', color: '#fbbf24' }
        : { label: 'Critical — too slow', color: '#f87171' };

  return (
    <div className="space-y-6">
      {/* Header + range picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Marketplace Funnel</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
            {data ? `${data.totalEvents} events in the last ${data.days} days` : 'Loading events…'}
          </p>
        </div>
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-3 py-1.5 text-xs font-medium"
              style={days === d
                ? { background: 'var(--color-brand)', color: '#fff' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-3)' }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-5 h-5" style={{ color: '#f87171' }} />
          <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── North star ── */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4" style={{ color: '#818cf8' }} />
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#818cf8' }}>
                North star: time to first bid
              </h2>
              <span
                className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${verdict.color}1a`, color: verdict.color, border: `1px solid ${verdict.color}40` }}
              >
                {verdict.label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                  {fmtMinutes(ttfb?.median ?? null)}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-4)' }}>Median (target: under 15m)</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-2)' }}>
                  {fmtMinutes(ttfb?.p75 ?? null)}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-4)' }}>75th percentile</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-2)' }}>
                  {ttfb?.sampleSize ?? 0}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-4)' }}>Jobs with a bid</p>
              </div>
              <div>
                <p className="text-3xl font-bold" style={{ color: data.northStar.jobsPostedWithNoBid > 0 ? '#fb923c' : 'var(--color-text-2)' }}>
                  {data.northStar.jobsPostedWithNoBid}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-4)' }}>Posted, still no bid</p>
              </div>
            </div>
            {(data.northStar.timeToClaimMinutes.sampleSize > 0) && (
              <p className="text-xs mt-4 flex items-center gap-1.5" style={{ color: 'var(--color-text-4)' }}>
                <Clock className="w-3 h-3" />
                Time to claim: median {fmtMinutes(data.northStar.timeToClaimMinutes.median)} ·
                p75 {fmtMinutes(data.northStar.timeToClaimMinutes.p75)} ·
                {data.northStar.timeToClaimMinutes.sampleSize} jobs
              </p>
            )}
          </div>

          {/* ── Funnel bars ── */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
                Funnel stages
              </h2>
            </div>
            <div className="space-y-3">
              {Object.entries(STAGE_LABELS).map(([key, label], i) => {
                const count = data.counts[key] ?? 0;
                const conv = i > 0 ? data.conversions[i - 1]?.rate : null;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-2)' }}>{label}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                        {count}
                        {conv !== null && conv !== undefined && (
                          <span className="ml-2" style={{ color: conv >= 50 ? '#22c55e' : conv >= 20 ? '#fbbf24' : '#f87171' }}>
                            {conv}% from prev
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-5 rounded-lg overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${Math.max(count > 0 ? 2 : 0, (count / maxCount) * 100)}%`,
                          background: `linear-gradient(90deg, #6366f1, #8b5cf6)`,
                          opacity: 1 - i * 0.09,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {data.totalEvents === 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs rounded-lg p-3"
                style={{ background: 'rgba(99,102,241,0.06)', color: 'var(--color-text-4)' }}>
                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                No events yet. Events start flowing when someone runs a diagnosis, posts a job,
                or a contractor bids — go get your first real users.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
