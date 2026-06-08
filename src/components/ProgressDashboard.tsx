'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Wrench, CheckCircle2, PackageCheck, ClipboardList,
  Clock, RefreshCw, AlertCircle, ChevronDown, Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { ProgressStatus, ProgressUpdate } from '@/app/api/jobs/[jobId]/progress-updates/route';

/* ── Status metadata ─────────────────────────────────────────────────── */
const STATUS_META: Record<ProgressStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  arrived:            { label: 'Arrived on Site',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: <MapPin size={14} /> },
  diagnosing:         { label: 'Diagnosing',         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <ClipboardList size={14} /> },
  working:            { label: 'Working',            color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: <Wrench size={14} /> },
  milestone_complete: { label: 'Milestone Complete', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: <PackageCheck size={14} /> },
  wrapping_up:        { label: 'Wrapping Up',        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: <CheckCircle2 size={14} /> },
  completed:          { label: 'Job Complete',       color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: <CheckCircle2 size={14} /> },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(mins: number): string {
  if (mins <= 0) return '';
  if (mins < 60) return `${mins}m elapsed`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m elapsed` : `${h}h elapsed`;
}

function formatRemaining(mins: number): string {
  if (mins <= 0) return '';
  if (mins < 60) return `~${mins}m remaining`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}m remaining` : `~${h}h remaining`;
}

/* ── Single update card ──────────────────────────────────────────────── */
function UpdateCard({ update, isLatest }: { update: ProgressUpdate; isLatest: boolean }) {
  const meta = STATUS_META[update.status] ?? STATUS_META['working'];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex',
        gap: 14,
        paddingBottom: 20,
        position: 'relative',
      }}
    >
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 28 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: isLatest ? meta.bg : 'rgba(255,255,255,0.05)',
            border: `2px solid ${isLatest ? meta.color : 'rgba(255,255,255,0.12)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLatest ? meta.color : '#4b5563',
            flexShrink: 0,
          }}
        >
          {meta.icon}
        </div>
        {/* Connector line — shows if not the last item */}
        <div style={{ flex: 1, width: 2, background: 'rgba(255,255,255,0.07)', marginTop: 4 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 3, paddingBottom: 4 }}>
        {/* Status badge + time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              background: isLatest ? meta.bg : 'rgba(255,255,255,0.05)',
              color: isLatest ? meta.color : '#6b7280',
              border: `1px solid ${isLatest ? meta.color + '50' : 'transparent'}`,
            }}
          >
            {meta.label}
          </span>
          {update.createdAt && (
            <span style={{ fontSize: 11, color: '#4b5563' }}>{formatTime(update.createdAt as string)}</span>
          )}
        </div>

        {/* Task */}
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: isLatest ? '#e5e7eb' : '#9ca3af' }}>
          {update.currentTask}
        </p>

        {/* Time chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {update.elapsedMinutes > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
              <Clock size={11} /> {formatElapsed(update.elapsedMinutes)}
            </span>
          )}
          {update.estimatedMinutesRemaining > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
              <Clock size={11} /> {formatRemaining(update.estimatedMinutesRemaining)}
            </span>
          )}
        </div>

        {/* Notes */}
        {update.notes && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>
            "{update.notes}"
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
interface Props {
  jobId: string;
  /** Auto-refresh interval in ms (default: 30000) */
  refreshInterval?: number;
}

export default function ProgressDashboard({ jobId, refreshInterval = 30_000 }: Props) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchUpdates = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/progress-updates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch updates');
      const data = await res.json();
      setUpdates(data.updates ?? []);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err.message ?? 'Could not load progress');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, jobId]);

  // Initial load
  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(() => fetchUpdates(true), refreshInterval);
    return () => clearInterval(id);
  }, [fetchUpdates, refreshInterval]);

  const latestUpdate = updates[updates.length - 1] ?? null;
  const latestMeta = latestUpdate ? (STATUS_META[latestUpdate.status] ?? STATUS_META['working']) : null;
  const isComplete = latestUpdate?.status === 'completed';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${latestMeta ? latestMeta.color + '40' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'border-color 0.3s',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          background: latestMeta ? `${latestMeta.bg}` : 'rgba(255,255,255,0.03)',
          border: 'none',
          borderBottom: expanded ? `1px solid ${latestMeta ? latestMeta.color + '25' : 'rgba(255,255,255,0.06)'}` : 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Activity size={17} color={latestMeta?.color ?? '#6b7280'} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: latestMeta?.color ?? '#9ca3af' }}>
            {isComplete ? '✅ Job Complete' : latestUpdate ? `Currently: ${latestUpdate.currentTask}` : 'Work Progress'}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#6b7280' }}>
            {updates.length > 0
              ? `${updates.length} update${updates.length !== 1 ? 's' : ''} · Last: ${formatTime(latestUpdate?.createdAt as string)}`
              : 'No updates yet'}
            {lastFetched && (
              <span style={{ marginLeft: 8, color: '#374151' }}>
                · refreshed {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>

        {/* Refresh + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fetchUpdates(true); }}
            disabled={refreshing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <ChevronDown
            size={16}
            color="#6b7280"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 18px 4px' }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 14 }}>
                  Loading updates…
                </div>
              )}

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, marginBottom: 16 }}>
                  <AlertCircle size={15} color="#f87171" />
                  <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
                </div>
              )}

              {!loading && !error && updates.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Wrench size={28} color="#374151" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: 14, color: '#4b5563' }}>Waiting for the contractor to start logging progress…</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#374151' }}>This page auto-refreshes every 30 seconds</p>
                </div>
              )}

              {/* Timeline */}
              {updates.length > 0 && (
                <div>
                  {[...updates].reverse().map((u, idx) => (
                    <UpdateCard
                      key={u.id}
                      update={u}
                      isLatest={idx === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin keyframe via inline style tag */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
