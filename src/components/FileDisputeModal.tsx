'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  { value: 'work_not_completed',   label: 'Work was not completed' },
  { value: 'work_done_incorrectly', label: 'Work was done incorrectly or poorly' },
  { value: 'contractor_no_show',   label: 'Contractor was a no-show' },
  { value: 'safety_concern',       label: 'Safety concern / damage caused' },
  { value: 'overcharged',          label: 'Price dispute / overcharged' },
  { value: 'other',                label: 'Other' },
];

interface Props {
  jobId: string;
  authToken: string;
  onDisputeFiled: () => void;
  onClose: () => void;
}

export default function FileDisputeModal({ jobId, authToken, onDisputeFiled, onClose }: Props) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = category && description.trim().length >= 20;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/jobs/${jobId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ category, description: description.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to file dispute');

      onDisputeFiled();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 0 0',
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 600,
            background: '#111827',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '24px 24px 0 0',
            padding: '28px 24px 40px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f9fafb' }}>File a Dispute</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Payment will stay frozen until resolved</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="#9ca3af" />
            </button>
          </div>

          {/* Warning banner */}
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>
              Filing a dispute freezes payment and notifies the contractor. You'll be able to upload photos as evidence and our AI will help suggest a fair resolution.
            </p>
          </div>

          {/* Category picker */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What went wrong? <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  padding: '11px 36px 11px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${category ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 10,
                  color: category ? '#f9fafb' : '#6b7280',
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="" disabled style={{ background: '#1f2937' }}>Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} style={{ background: '#1f2937' }}>{c.label}</option>
                ))}
              </select>
              <ChevronDown size={16} color="#6b7280" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Describe the issue <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what went wrong in detail. For example: 'The contractor replaced the faucet but left a slow leak under the sink that wasn't there before…'"
              rows={5}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${description.length >= 20 ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 10,
                color: '#e5e7eb',
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: 1.6,
              }}
            />
            <p style={{ margin: '5px 0 0', fontSize: 11, color: description.length < 20 ? '#6b7280' : '#34d399', textAlign: 'right' }}>
              {description.length} chars {description.length < 20 ? `(${20 - description.length} more needed)` : '✓'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: '#9ca3af',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              style={{
                flex: 2,
                padding: '13px',
                background: canSubmit && !loading ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: 12,
                color: canSubmit && !loading ? '#fff' : '#4b5563',
                fontSize: 14,
                fontWeight: 700,
                cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Filing Dispute…</>
                : <><AlertTriangle size={15} /> File Dispute & Freeze Payment</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
