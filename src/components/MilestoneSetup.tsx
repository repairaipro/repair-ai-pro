'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, AlertCircle, CheckCircle, Loader2, Layers } from 'lucide-react';

type MilestoneInput = {
  title: string;
  description: string;
  percentage: number;
  amount: number;
};

type Props = {
  jobId: string;
  authToken: string;
  totalAmount: number;
  existingPlanStatus?: string | null; // 'proposed' | 'approved' | null
  isContractor: boolean;
  onProposed?: () => void;
  onApproved?: () => void;
};

const PRESETS: Record<string, MilestoneInput[]> = {
  '2': [
    { title: 'Materials & Setup', description: 'Purchase materials and prepare the work area', percentage: 40, amount: 0 },
    { title: 'Completion & Cleanup', description: 'Finish all work and clean up the site', percentage: 60, amount: 0 },
  ],
  '3': [
    { title: 'Materials & Preparation', description: 'Purchase materials and prepare the work area', percentage: 30, amount: 0 },
    { title: 'Work in Progress', description: 'Core work completed and ready for inspection', percentage: 50, amount: 0 },
    { title: 'Final Completion', description: 'All finishing work done, site cleaned up', percentage: 20, amount: 0 },
  ],
  '4': [
    { title: 'Materials Purchased', description: 'All required materials sourced and on site', percentage: 25, amount: 0 },
    { title: 'Phase 1 Complete', description: 'First phase of work completed', percentage: 25, amount: 0 },
    { title: 'Phase 2 Complete', description: 'Second phase of work completed', percentage: 35, amount: 0 },
    { title: 'Final & Cleanup', description: 'All work finished, site cleaned and inspected', percentage: 15, amount: 0 },
  ],
};

export default function MilestoneSetup({
  jobId, authToken, totalAmount, existingPlanStatus, isContractor, onProposed, onApproved
}: Props) {
  const [milestones, setMilestones] = useState<MilestoneInput[]>(() =>
    PRESETS['3'].map((m) => ({ ...m, amount: Math.round(totalAmount * m.percentage / 100) }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const totalPct = milestones.reduce((s, m) => s + m.percentage, 0);
  const isValid = milestones.length >= 2 && milestones.length <= 5 &&
    Math.abs(totalPct - 100) <= 1 &&
    milestones.every((m) => m.title.trim() && m.percentage > 0 && m.amount > 0);

  function applyPreset(count: string) {
    setMilestones(
      PRESETS[count].map((m) => ({ ...m, amount: Math.round(totalAmount * m.percentage / 100) }))
    );
  }

  function updateMilestone(idx: number, field: keyof MilestoneInput, value: string | number) {
    setMilestones((prev) => {
      const updated = [...prev];
      if (field === 'percentage') {
        const pct = Math.max(0, Math.min(100, Number(value)));
        updated[idx] = { ...updated[idx], percentage: pct, amount: Math.round(totalAmount * pct / 100) };
      } else if (field === 'amount') {
        const amt = Math.max(0, Number(value));
        updated[idx] = { ...updated[idx], amount: amt, percentage: Math.round(amt / totalAmount * 100) };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  }

  function addMilestone() {
    if (milestones.length >= 5) return;
    setMilestones((prev) => [
      ...prev,
      { title: '', description: '', percentage: 0, amount: 0 },
    ]);
  }

  function removeMilestone(idx: number) {
    if (milestones.length <= 2) return;
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handlePropose() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/milestones`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose', milestones, totalAmount }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Milestone plan sent to homeowner for approval.');
      onProposed?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/milestones`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_plan' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Milestone plan approved! Payments will be released as each phase is completed.');
      onApproved?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Homeowner view: plan proposed, waiting on them to approve
  if (!isContractor && existingPlanStatus === 'proposed') {
    return (
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Layers size={20} color="#f59e0b" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Contractor Proposed a Milestone Plan</h3>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
          Instead of paying the full amount upfront, your contractor has proposed splitting payment into milestones.
          Each phase is only released after you approve the work.
        </p>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', color: '#34d399', fontSize: 13, marginBottom: 16 }}>{success}</div>}
        <button
          onClick={handleApprove}
          disabled={loading}
          style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          Approve Milestone Plan
        </button>
      </div>
    );
  }

  // Homeowner: already approved
  if (!isContractor && existingPlanStatus === 'approved') {
    return (
      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <CheckCircle size={18} color="#10b981" />
        <span style={{ fontSize: 14, color: '#34d399', fontWeight: 600 }}>Milestone plan approved — payments release per phase</span>
      </div>
    );
  }

  // Contractor: plan already sent
  if (isContractor && existingPlanStatus === 'proposed') {
    return (
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertCircle size={18} color="#f59e0b" />
        <span style={{ fontSize: 14, color: '#fcd34d', fontWeight: 600 }}>Milestone plan sent — waiting for homeowner approval</span>
      </div>
    );
  }

  // Contractor: propose milestones form
  if (!isContractor) return null;

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Layers size={20} color="#6366f1" />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Propose Milestone Payments</h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 20 }}>Optional</span>
      </div>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        Split the ${totalAmount.toFixed(2)} payment into milestones. The homeowner pays each phase only after approving your work.
      </p>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>Presets:</span>
        {['2', '3', '4'].map((n) => (
          <button
            key={n}
            onClick={() => applyPreset(n)}
            style={{ padding: '5px 14px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, color: '#a5b4fc', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
          >
            {n} phases
          </button>
        ))}
      </div>

      {/* Milestone rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <AnimatePresence>
          {milestones.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Phase {i + 1}
                </span>
                {milestones.length > 2 && (
                  <button onClick={() => removeMilestone(i)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={14} color="#6b7280" />
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginBottom: 8 }}>
                <input
                  value={m.title}
                  onChange={(e) => updateMilestone(i, 'title', e.target.value)}
                  placeholder="Phase title (e.g. Materials & Setup)"
                  style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    value={m.percentage}
                    onChange={(e) => updateMilestone(i, 'percentage', e.target.value)}
                    style={{ width: 60, padding: '9px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', textAlign: 'center' }}
                  />
                  <span style={{ color: '#6b7280', fontSize: 13 }}>%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>$</span>
                  <input
                    type="number"
                    value={m.amount}
                    onChange={(e) => updateMilestone(i, 'amount', e.target.value)}
                    style={{ width: 80, padding: '9px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', textAlign: 'right' }}
                  />
                </div>
              </div>

              <input
                value={m.description}
                onChange={(e) => updateMilestone(i, 'description', e.target.value)}
                placeholder="What work will be done in this phase?"
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Total bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
        <span style={{ color: '#9ca3af' }}>Total allocation</span>
        <span style={{ fontWeight: 700, color: Math.abs(totalPct - 100) > 1 ? '#ef4444' : '#10b981' }}>
          {totalPct}% / ${milestones.reduce((s, m) => s + m.amount, 0).toFixed(2)}
        </span>
      </div>

      {milestones.length < 5 && (
        <button
          onClick={addMilestone}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 8, color: '#6b7280', fontSize: 13, cursor: 'pointer', marginBottom: 16, width: '100%', justifyContent: 'center' }}
        >
          <Plus size={14} /> Add Phase
        </button>
      )}

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', color: '#34d399', fontSize: 13, marginBottom: 12 }}>{success}</div>}

      <button
        onClick={handlePropose}
        disabled={!isValid || loading}
        style={{ width: '100%', padding: '13px', background: isValid ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, color: isValid ? '#fff' : '#4b5563', fontSize: 15, fontWeight: 700, cursor: isValid && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
        Send Milestone Plan to Homeowner
      </button>
    </div>
  );
}
