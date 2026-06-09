'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users, CheckCircle, Clock, XCircle, Star, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

type Invitation = {
  contractorId: string;
  status: 'pending' | 'accepted' | 'declined';
  score: number;
  matchReason: string | null;
  distanceMiles: number | null;
  wave: string;
  invitedAt: string | null;
  contractorName: string;
  contractorTrade: string;
  contractorRating: number | null;
  contractorPhotoUrl: string | null;
};

type MatchData = {
  matchStatus: string;
  matchCount: number;
  matchedAt: string | null;
  summary: { total: number; pending: number; accepted: number; declined: number };
  invitations: Invitation[];
};

type Props = {
  jobId: string;
  authToken: string;
  jobStatus: string;
};

const REASON_LABELS: Record<string, string> = {
  zone:   'Same area',
  zip:    'Same ZIP',
  city:   'Same city',
  radius: 'Within radius',
};

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function Avatar({ name, photoUrl, size = 32 }: { name: string; photoUrl: string | null; size?: number }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function MatchStatus({ jobId, authToken, jobStatus }: Props) {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!authToken || !['triaged', 'accepted'].includes(jobStatus)) return;
    fetchMatches();
    // Poll every 30s while job is triaged (waiting for contractor)
    if (jobStatus === 'triaged') {
      const id = setInterval(fetchMatches, 30_000);
      return () => clearInterval(id);
    }
  }, [authToken, jobStatus]);

  async function fetchMatches() {
    try {
      const res = await fetch(`/api/jobs/${jobId}/match-contractors`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const d = await res.json();
      if (d.success) setData(d);
    } catch { /* silently fail */ } finally {
      setLoading(false);
    }
  }

  if (!['triaged', 'accepted'].includes(jobStatus)) return null;
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: '#6b7280', fontSize: 13 }}>
        <Loader2 size={14} className="animate-spin" /> Finding contractors…
      </div>
    );
  }
  if (!data) return null;

  const { summary, invitations } = data;
  const hasAccepted = summary.accepted > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: hasAccepted
          ? 'rgba(16,185,129,0.06)'
          : 'rgba(99,102,241,0.06)',
        border: `1px solid ${hasAccepted ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.18)'}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: hasAccepted ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Zap size={18} color={hasAccepted ? '#34d399' : '#818cf8'} />
        </div>

        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb' }}>
            {data.matchStatus === 'no_matches'
              ? 'No matches found yet'
              : hasAccepted
              ? `${summary.accepted} contractor${summary.accepted !== 1 ? 's' : ''} responded`
              : `${summary.total} contractor${summary.total !== 1 ? 's' : ''} notified`}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
            {data.matchStatus === 'no_matches'
              ? 'We\'ll keep searching — check back shortly'
              : hasAccepted
              ? 'View their profiles in the bids section below'
              : `${summary.pending} pending · ${summary.declined} declined · updated ${timeAgo(data.matchedAt)}`}
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {summary.accepted > 0 && (
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 700 }}>
              {summary.accepted} ✓
            </span>
          )}
          {summary.pending > 0 && (
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontWeight: 700 }}>
              {summary.pending} pending
            </span>
          )}
          {expanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
        </div>
      </button>

      {/* Expanded contractor list */}
      <AnimatePresence>
        {expanded && invitations.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 18px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invitations.map((inv) => {
                  const statusColor = inv.status === 'accepted' ? '#34d399' : inv.status === 'declined' ? '#6b7280' : '#a5b4fc';
                  const StatusIcon = inv.status === 'accepted' ? CheckCircle : inv.status === 'declined' ? XCircle : Clock;
                  return (
                    <div
                      key={inv.contractorId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        opacity: inv.status === 'declined' ? 0.5 : 1,
                      }}
                    >
                      <Avatar name={inv.contractorName} photoUrl={inv.contractorPhotoUrl} size={34} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.contractorName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          {inv.contractorRating && (
                            <span style={{ fontSize: 11, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Star size={10} fill="#fbbf24" /> {inv.contractorRating.toFixed(1)}
                            </span>
                          )}
                          {inv.matchReason && (
                            <span style={{ fontSize: 11, color: '#6b7280' }}>
                              {REASON_LABELS[inv.matchReason] || inv.matchReason}
                            </span>
                          )}
                          {inv.distanceMiles !== null && inv.distanceMiles !== undefined && (
                            <span style={{ fontSize: 11, color: '#4b5563' }}>
                              {inv.distanceMiles.toFixed(1)}mi
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <StatusIcon size={14} color={statusColor} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: '#4b5563', margin: '12px 0 0', lineHeight: 1.5 }}>
                Contractors are ranked by location proximity, rating, and availability. Additional waves are sent automatically if no one claims your job.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
