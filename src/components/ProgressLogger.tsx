'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Wrench, CheckCircle2, PackageCheck, ClipboardList,
  Loader2, ChevronDown, Send, Clock, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { ProgressStatus } from '@/app/api/jobs/[jobId]/progress-updates/route';

const STATUS_OPTIONS: { value: ProgressStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'arrived',            label: 'Arrived on Site',       color: '#60a5fa', icon: <MapPin size={15} /> },
  { value: 'diagnosing',         label: 'Diagnosing Issue',       color: '#f59e0b', icon: <ClipboardList size={15} /> },
  { value: 'working',            label: 'Working',               color: '#818cf8', icon: <Wrench size={15} /> },
  { value: 'milestone_complete', label: 'Milestone Complete',     color: '#34d399', icon: <PackageCheck size={15} /> },
  { value: 'wrapping_up',        label: 'Wrapping Up',           color: '#a78bfa', icon: <CheckCircle2 size={15} /> },
  { value: 'completed',          label: 'Job Complete',          color: '#10b981', icon: <CheckCircle2 size={15} /> },
];

interface Props {
  jobId: string;
  onUpdateLogged?: () => void;
}

export default function ProgressLogger({ jobId, onUpdateLogged }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProgressStatus>('working');
  const [currentTask, setCurrentTask] = useState('');
  const [elapsed, setElapsed] = useState('');
  const [remaining, setRemaining] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(true);

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === status)!;

  async function handleSubmit() {
    if (!currentTask.trim()) {
      setError('Please describe what you are currently working on.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/progress-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          currentTask: currentTask.trim(),
          elapsedMinutes: elapsed ? Number(elapsed) : 0,
          estimatedMinutesRemaining: remaining ? Number(remaining) : 0,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to log update');
      }

      setSuccess(true);
      setCurrentTask('');
      setNotes('');
      setTimeout(() => setSuccess(false), 3000);
      onUpdateLogged?.();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header (collapsible) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          background: 'rgba(99,102,241,0.08)',
          border: 'none',
          borderBottom: open ? '1px solid rgba(99,102,241,0.15)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Wrench size={17} color="#818cf8" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>Log Progress Update</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#6b7280' }}>Let the homeowner know what's happening</p>
        </div>
        <ChevronDown
          size={16}
          color="#6b7280"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '18px 18px 20px' }}>

              {/* Status selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Status
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const sel = opt.value === status;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(opt.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 12px',
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: sel ? 700 : 500,
                          border: sel ? `1.5px solid ${opt.color}` : '1px solid rgba(255,255,255,0.1)',
                          background: sel ? `${opt.color}22` : 'rgba(255,255,255,0.04)',
                          color: sel ? opt.color : '#6b7280',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current task */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  What are you doing right now? <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={currentTask}
                  onChange={(e) => setCurrentTask(e.target.value)}
                  placeholder={`e.g., "Replacing supply valve under sink"`}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    color: '#e5e7eb',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Time fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Clock size={11} /> Elapsed (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={elapsed}
                    onChange={(e) => setElapsed(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      color: '#e5e7eb',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Clock size={11} /> Est. Remaining (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={remaining}
                    onChange={(e) => setRemaining(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      color: '#e5e7eb',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details for the homeowner..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    color: '#e5e7eb',
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, marginBottom: 14 }}>
                  <AlertCircle size={15} color="#f87171" />
                  <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
                </div>
              )}

              {/* Success */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, marginBottom: 14 }}
                  >
                    <CheckCircle2 size={15} color="#34d399" />
                    <span style={{ fontSize: 13, color: '#34d399' }}>Update sent to homeowner!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !currentTask.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 12,
                  border: 'none',
                  background: loading || !currentTask.trim()
                    ? 'rgba(255,255,255,0.08)'
                    : `linear-gradient(135deg, ${selectedStatus.color}cc, ${selectedStatus.color}99)`,
                  color: loading || !currentTask.trim() ? '#4b5563' : '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading || !currentTask.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
                  : <><Send size={15} /> Send Update</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
