'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Clock, AlertTriangle, Loader2, ChevronDown,
  ChevronUp, DollarSign, Send, XCircle, Circle
} from 'lucide-react';

type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'awaiting_approval'
  | 'approved'
  | 'disputed'
  | 'released';

type Milestone = {
  id: string;
  title: string;
  description: string;
  percentage: number;
  amount: number;
  order: number;
  status: MilestoneStatus;
  completedAt?: string | null;
  approvedAt?: string | null;
  disputedAt?: string | null;
  contractorNotes?: string;
  homeownerNotes?: string;
  payoutAmount?: number;
};

type Props = {
  jobId: string;
  authToken: string;
  milestones: Milestone[];
  isContractor: boolean;
  onUpdate?: () => void;
};

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:           { label: 'Not Started',         color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: Circle },
  in_progress:       { label: 'In Progress',         color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: Clock },
  awaiting_approval: { label: 'Awaiting Approval',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: Clock },
  approved:          { label: 'Approved',             color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle },
  released:          { label: 'Payment Released',    color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle },
  disputed:          { label: 'Disputed',             color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: AlertTriangle },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MilestoneProgress({ jobId, authToken, milestones, isContractor, onUpdate }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const releasedCount = milestones.filter((m) => m.status === 'released').length;
  const totalReleased = milestones.filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0);
  const totalAmount = milestones.reduce((s, m) => s + m.amount, 0);
  const progressPct = totalAmount > 0 ? Math.round(totalReleased / totalAmount * 100) : 0;

  async function doAction(milestoneId: string, action: 'mark_complete' | 'approve' | 'dispute') {
    setActionLoading(milestoneId + action);
    setErrors((prev) => ({ ...prev, [milestoneId]: '' }));
    try {
      const res = await fetch(`/api/jobs/${jobId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes[milestoneId] || '' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNotes((prev) => ({ ...prev, [milestoneId]: '' }));
      onUpdate?.();
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, [milestoneId]: e.message }));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      {/* Progress header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            {releasedCount} of {milestones.length} phases complete
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
            {formatCurrency(totalReleased)} / {formatCurrency(totalAmount)} released
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: 3 }}
          />
        </div>
      </div>

      {/* Milestone cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {milestones.map((m, i) => {
          const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
          const StatusIcon = cfg.icon;
          const isExpanded = expandedId === m.id;
          const isLoading = (k: string) => actionLoading === m.id + k;

          const isPrevReleased = i === 0 || milestones[i - 1]?.status === 'released';
          const canContractorAct = isContractor && m.status === 'pending' && isPrevReleased;
          const canContractorSubmit = isContractor && (m.status === 'pending' || m.status === 'in_progress' || m.status === 'disputed') && isPrevReleased;
          const canHomeownerAct = !isContractor && m.status === 'awaiting_approval';

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${m.status === 'awaiting_approval' ? 'rgba(245,158,11,0.3)' : m.status === 'disputed' ? 'rgba(239,68,68,0.3)' : m.status === 'released' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <StatusIcon size={16} color={cfg.color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Phase {m.order}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>
                      {cfg.label}
                    </span>
                    {m.status === 'released' && m.approvedAt && (
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{formatDate(m.approvedAt)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: m.status === 'released' ? '#10b981' : '#fff' }}>
                    {formatCurrency(m.amount)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{m.percentage}%</div>
                </div>

                {isExpanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 14, marginBottom: 0, lineHeight: 1.6 }}>
                    {m.description}
                  </p>

                  {m.contractorNotes && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Contractor Notes</div>
                      <p style={{ color: '#c7d2fe', fontSize: 13, margin: 0 }}>{m.contractorNotes}</p>
                    </div>
                  )}

                  {m.homeownerNotes && m.status === 'disputed' && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Dispute Reason</div>
                      <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{m.homeownerNotes}</p>
                    </div>
                  )}

                  {m.status === 'released' && m.payoutAmount && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 8 }}>
                      <DollarSign size={14} color="#10b981" />
                      <span style={{ fontSize: 13, color: '#34d399' }}>
                        {formatCurrency(m.payoutAmount)} transferred to contractor
                      </span>
                    </div>
                  )}

                  {errors[m.id] && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
                      {errors[m.id]}
                    </div>
                  )}

                  {/* Contractor actions */}
                  {canContractorSubmit && (
                    <div style={{ marginTop: 16 }}>
                      <textarea
                        value={notes[m.id] || ''}
                        onChange={(e) => setNotes((p) => ({ ...p, [m.id]: e.target.value }))}
                        placeholder="Notes about this phase's work (optional)"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
                      />
                      <button
                        onClick={() => doAction(m.id, 'mark_complete')}
                        disabled={!!actionLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }}
                      >
                        {isLoading('mark_complete') ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Submit for Approval
                      </button>
                    </div>
                  )}

                  {/* Homeowner actions */}
                  {canHomeownerAct && (
                    <div style={{ marginTop: 16 }}>
                      <textarea
                        value={notes[m.id] || ''}
                        onChange={(e) => setNotes((p) => ({ ...p, [m.id]: e.target.value }))}
                        placeholder="Add notes (required if disputing)"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
                      />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => doAction(m.id, 'approve')}
                          disabled={!!actionLoading}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }}
                        >
                          {isLoading('approve') ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                          Approve & Release Payment
                        </button>
                        <button
                          onClick={() => doAction(m.id, 'dispute')}
                          disabled={!!actionLoading}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 14, fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.7 : 1 }}
                        >
                          {isLoading('dispute') ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                          Dispute
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
