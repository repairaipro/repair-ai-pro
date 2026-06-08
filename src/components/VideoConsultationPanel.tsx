'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Video, Clock, Calendar, CheckCircle2, X, Loader2,
  ChevronDown, AlertTriangle, Plus, ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

type ConsultStatus = 'requested' | 'scheduled' | 'active' | 'completed' | 'declined';

interface Consultation {
  id: string;
  contractorId: string;
  homeownerId: string;
  status: ConsultStatus;
  scheduledAt: string | null;
  proposedTimes: string[];
  notes: string;
  requestedAt: string | null;
}

interface Props {
  jobId: string;
  isContractor: boolean;
  isHomeowner: boolean;
  jobStatus: string;
}

const STATUS_META: Record<ConsultStatus, { label: string; color: string; bg: string }> = {
  requested: { label: 'Awaiting approval',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  scheduled: { label: 'Scheduled',          color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  active:    { label: 'Live now',           color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  completed: { label: 'Completed',          color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  declined:  { label: 'Declined',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

/* Proposed time slots the contractor can pick */
const SLOT_OFFSETS_HOURS = [24, 48, 72]; // tomorrow, day after, 3 days out

function defaultSlots(): string[] {
  return SLOT_OFFSETS_HOURS.map((h) => {
    const d = new Date(Date.now() + h * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VideoConsultationPanel({ jobId, isContractor, isHomeowner, jobStatus }: Props) {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [open, setOpen]                   = useState(true);
  const [requesting, setRequesting]       = useState(false);
  const [acting, setActing]               = useState<string | null>(null);
  const [error, setError]                 = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [notes, setNotes]                 = useState('');
  const [proposedTimes, setProposedTimes] = useState<string[]>(defaultSlots);

  const biddableStatuses = ['triaged', 'open', 'matched', 'accepted'];
  const canRequest = isContractor && biddableStatuses.includes(jobStatus);

  const fetchConsultations = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/video-consultation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setConsultations(data.consultations ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [user, jobId]);

  useEffect(() => { fetchConsultations(); }, [fetchConsultations]);

  async function handleRequest() {
    if (!user) return;
    setRequesting(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/video-consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'request',
          proposedTimes,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to request consultation');
      setShowRequestForm(false);
      setNotes('');
      await fetchConsultations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  }

  async function handleAction(action: 'approve' | 'decline', consultId: string, scheduledAt?: string) {
    if (!user) return;
    setActing(consultId + action);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/video-consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, consultId, scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      await fetchConsultations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  }

  // Active or scheduled consultations belonging to this user
  const myConsults = consultations.filter((c) =>
    isContractor ? c.contractorId === user?.uid : true
  );

  const pendingConsults  = myConsults.filter((c) => ['requested', 'scheduled', 'active'].includes(c.status));
  const hasActive        = myConsults.some((c) => c.status === 'active');
  const hasScheduled     = myConsults.some((c) => c.status === 'scheduled');
  const hasPending       = myConsults.some((c) => c.status === 'requested');
  const alreadyRequested = isContractor && myConsults.some((c) => ['requested', 'scheduled'].includes(c.status));

  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', background: 'rgba(99,102,241,0.07)', border: 'none', borderBottom: open ? '1px solid rgba(99,102,241,0.15)' : 'none', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
      >
        <Video size={17} color="#818cf8" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>
            Video Consultation
            {hasActive && <span style={{ marginLeft: 8, fontSize: 11, background: 'rgba(52,211,153,0.2)', color: '#34d399', padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>LIVE</span>}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#6b7280' }}>Pre-bid 15-min call to clarify scope before quoting</p>
        </div>
        {(hasScheduled || hasPending) && (
          <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
            {pendingConsults.length} pending
          </span>
        )}
        <ChevronDown size={16} color="#6b7280" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
            <div style={{ padding: 18 }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertTriangle size={14} color="#f87171" />
                  <span style={{ fontSize: 13, color: '#f87171' }}>{error}</span>
                </div>
              )}

              {/* Consultation cards */}
              {myConsults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: showRequestForm || canRequest ? 14 : 0 }}>
                  {myConsults.map((c) => {
                    const meta = STATUS_META[c.status];
                    const scheduledDate = c.scheduledAt ? new Date(c.scheduledAt) : null;
                    const minsUntil = scheduledDate ? Math.round((scheduledDate.getTime() - Date.now()) / 60000) : null;
                    const canJoin = c.status === 'active' || (c.status === 'scheduled' && minsUntil !== null && minsUntil <= 10);

                    return (
                      <div
                        key={c.id}
                        style={{ background: meta.bg, border: `1px solid ${meta.color}40`, borderRadius: 12, padding: '12px 14px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}20`, padding: '2px 8px', borderRadius: 20 }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>
                            {c.requestedAt ? fmtDate(c.requestedAt) : ''}
                          </span>
                        </div>

                        {c.scheduledAt && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e5e7eb', marginBottom: 6 }}>
                            <Calendar size={13} color="#60a5fa" />
                            {fmtDate(c.scheduledAt)}
                            {minsUntil !== null && minsUntil > 0 && (
                              <span style={{ color: '#6b7280', fontSize: 11 }}>({minsUntil < 60 ? `${minsUntil}min` : `${Math.round(minsUntil / 60)}hr`} away)</span>
                            )}
                          </div>
                        )}

                        {c.notes && (
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 8px', fontStyle: 'italic' }}>"{c.notes}"</p>
                        )}

                        {/* Homeowner: approve by picking a proposed time */}
                        {isHomeowner && c.status === 'requested' && c.proposedTimes.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Contractor proposed these times:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {c.proposedTimes.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  disabled={acting !== null}
                                  onClick={() => handleAction('approve', c.id, t)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                                >
                                  {acting === c.id + 'approve' ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />}
                                  {fmtDate(t)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          {/* Join button */}
                          {canJoin && (
                            <Link
                              href={`/jobs/${jobId}/video/${c.id}`}
                              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                            >
                              <Video size={15} /> Join Call <ExternalLink size={12} />
                            </Link>
                          )}

                          {/* Homeowner: decline */}
                          {isHomeowner && c.status === 'requested' && (
                            <button
                              type="button"
                              disabled={acting !== null}
                              onClick={() => handleAction('decline', c.id)}
                              style={{ padding: '9px 14px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              {acting === c.id + 'decline' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                              Decline
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Contractor: request form */}
              {canRequest && !alreadyRequested && (
                <>
                  {!showRequestForm ? (
                    <button
                      type="button"
                      onClick={() => setShowRequestForm(true)}
                      style={{ width: '100%', padding: '11px', background: 'rgba(99,102,241,0.1)', border: '1.5px dashed rgba(99,102,241,0.35)', borderRadius: 12, color: '#a5b4fc', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <Plus size={16} /> Request Video Consultation
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 16 }}>
                      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>Request a pre-bid video call</p>

                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Your proposed time slots:</p>
                        {proposedTimes.map((t, i) => (
                          <div key={i} style={{ marginBottom: 6 }}>
                            <input
                              type="datetime-local"
                              value={t.slice(0, 16)}
                              onChange={(e) => {
                                const updated = [...proposedTimes];
                                updated[i] = new Date(e.target.value).toISOString();
                                setProposedTimes(updated);
                              }}
                              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                            />
                          </div>
                        ))}
                      </div>

                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional: what do you want to see or discuss on the call?"
                        rows={2}
                        style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#e5e7eb', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }}
                      />

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setShowRequestForm(false)}
                          style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleRequest}
                          disabled={requesting}
                          style={{ flex: 2, padding: '10px', background: requesting ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: requesting ? '#4b5563' : '#fff', fontSize: 13, fontWeight: 700, cursor: requesting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                        >
                          {requesting ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Video size={13} /> Send Request</>}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {/* Empty state */}
              {!loading && myConsults.length === 0 && !showRequestForm && (
                <p style={{ fontSize: 13, color: '#4b5563', textAlign: 'center', padding: '8px 0' }}>
                  {isContractor ? 'Request a call to discuss the job before bidding.' : 'No consultation requests yet.'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
