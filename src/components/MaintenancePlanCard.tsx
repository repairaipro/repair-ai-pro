'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar, Wrench, CheckCircle, PauseCircle, XCircle,
  ChevronRight, Play, Pause, Loader2, AlertTriangle,
} from 'lucide-react';

type Plan = {
  id: string;
  title: string;
  description: string;
  trade: string;
  frequency: string;
  frequencyLabel: string;
  pricePerService: number;
  status: 'active' | 'paused' | 'cancelled';
  nextServiceDate: string | null;
  lastServiceDate: string | null;
  jobsCreated: number;
};

type Props = {
  plan: Plan;
  authToken: string;
  onUpdate: () => void;
};

const STATUS_CONFIG = {
  active:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle },
  paused:    { label: 'Paused',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: PauseCircle },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: XCircle },
};

const TRADE_ICONS: Record<string, string> = {
  plumbing: '🔧', electrical: '⚡', hvac: '❄️', roofing: '🏠',
  appliance: '🍽️', landscaping: '🌿', cleaning: '🧹', general: '🔨',
};

function formatDate(iso: string | null) {
  if (!iso) return 'Not scheduled';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function MaintenancePlanCard({ plan, authToken, onUpdate }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cfg = STATUS_CONFIG[plan.status];
  const StatusIcon = cfg.icon;
  const tradeIcon = TRADE_ICONS[plan.trade?.toLowerCase()] || '🔨';
  const days = daysUntil(plan.nextServiceDate);

  async function doAction(action: 'pause' | 'resume' | 'cancel') {
    if (action === 'cancel' && !confirm('Cancel this maintenance plan? Your subscription will end.')) return;
    setLoading(action);
    setError('');
    try {
      const res = await fetch(`/api/maintenance-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onUpdate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: plan.status === 'cancelled' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${plan.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        opacity: plan.status === 'cancelled' ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{tradeIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{plan.title}</h3>
            <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <StatusIcon size={11} /> {cfg.label}
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{plan.description || plan.trade}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
            ${plan.pricePerService}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{plan.frequencyLabel}</div>
        </div>
      </div>

      {/* Next service date */}
      {plan.status !== 'cancelled' && (
        <div style={{ margin: '0 22px', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={16} color="#6366f1" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Next Service</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 1 }}>{formatDate(plan.nextServiceDate)}</div>
          </div>
          {days !== null && days >= 0 && (
            <div style={{
              fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
              background: days <= 7 ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
              color: days <= 7 ? '#fcd34d' : '#a5b4fc',
            }}>
              {days === 0 ? 'Today' : `${days}d`}
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div style={{ padding: '0 22px', display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ textAlign: 'center', flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{plan.jobsCreated}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Services Done</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>
            ${(plan.pricePerService * plan.jobsCreated).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Total Spent</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', marginTop: 4 }}>
            {plan.lastServiceDate ? new Date(plan.lastServiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Last Service</div>
        </div>
      </div>

      {error && (
        <div style={{ margin: '0 22px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Actions */}
      {plan.status !== 'cancelled' && (
        <div style={{ padding: '0 22px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link
            href={`/maintenance/${plan.id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#d1d5db', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
          >
            <Wrench size={14} /> View History <ChevronRight size={13} />
          </Link>

          {plan.status === 'active' && (
            <button
              onClick={() => doAction('pause')}
              disabled={!!loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, color: '#fcd34d', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'pause' ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />}
              Pause
            </button>
          )}

          {plan.status === 'paused' && (
            <button
              onClick={() => doAction('resume')}
              disabled={!!loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#34d399', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading === 'resume' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Resume
            </button>
          )}

          <button
            onClick={() => doAction('cancel')}
            disabled={!!loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}
