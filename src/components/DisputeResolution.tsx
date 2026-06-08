'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Upload, X, Loader2, Zap, CheckCircle,
  Shield, RefreshCw, DollarSign, ChevronDown, ChevronUp,
  ImageIcon, Scale, Info,
} from 'lucide-react';

type EvidencePhoto = { url: string; caption: string };

type AIAnalysis = {
  contractorWorkSummary: string;
  homeownerComplaintSummary: string;
  isIssueRelatedToWork: boolean;
  verdict: 'release_to_contractor' | 'refund_homeowner' | 'partial_resolution' | 'needs_admin_review';
  verdictReason: string;
  keyFindings: string[];
  confidence: 'low' | 'medium' | 'high';
};

type Dispute = {
  id: string;
  category: string;
  description: string;
  status: string;
  resolution?: string;
  evidencePhotos?: EvidencePhoto[];
  completionPhotos?: Array<{ url: string }>;
  aiAnalysis?: AIAnalysis;
  createdAt?: string;
};

type Props = {
  jobId: string;
  authToken: string;
  isHomeowner: boolean;
  paymentAmountUsd?: number;
  onResolved?: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  work_not_completed: 'Work not completed',
  work_done_incorrectly: 'Work done incorrectly',
  contractor_no_show: 'Contractor no-show',
  safety_concern: 'Safety concern',
  overcharged: 'Price dispute',
  other: 'Other',
};

const VERDICT_CONFIG = {
  release_to_contractor: { label: 'AI suggests: Release payment to contractor', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  refund_homeowner:      { label: 'AI suggests: Refund homeowner', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  partial_resolution:    { label: 'AI suggests: Partial settlement', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  needs_admin_review:    { label: 'AI recommends: Admin review', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.3)' },
};

export default function DisputeResolution({ jobId, authToken, isHomeowner, paymentAmountUsd = 0, onResolved }: Props) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [evidencePhotos, setEvidencePhotos] = useState<EvidencePhoto[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [partialPct, setPartialPct] = useState(50);
  const [showPhotosSection, setShowPhotosSection] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDispute();
  }, [jobId, authToken]);

  async function fetchDispute() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/dispute/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.dispute) {
        setDispute(data.dispute);
        setEvidencePhotos(data.dispute.evidencePhotos || []);
      }
    } catch {
      setError('Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  }

  async function uploadEvidence(file: File, caption: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', caption);
    const res = await fetch(`/api/jobs/${jobId}/dispute/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.url as string;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    for (let i = 0; i < files.length; i++) {
      const idx = evidencePhotos.length + i;
      setUploadingIdx(idx);
      try {
        const caption = captions[idx] || '';
        const url = await uploadEvidence(files[i], caption);
        setEvidencePhotos((prev) => [...prev, { url, caption }]);
      } catch (err: any) {
        setError('Upload failed: ' + err.message);
      }
    }
    setUploadingIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/dispute/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDispute((prev) => prev ? { ...prev, aiAnalysis: data.analysis } : prev);
    } catch (err: any) {
      setError('Analysis failed: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function resolve(action: string, extra?: Record<string, any>) {
    setResolving(action);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/dispute/self-resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccessMsg(data.message);
      onResolved?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResolving(null);
    }
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Loader2 size={28} className="animate-spin" color="#ef4444" />
      </div>
    );
  }

  if (!dispute) return null;

  const isResolved = dispute.status === 'resolved';
  const analysis = dispute.aiAnalysis;
  const verdictCfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;
  const contractorPhotos = dispute.completionPhotos || [];
  const allEvidencePhotos = evidencePhotos;

  if (successMsg) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 32, textAlign: 'center' }}
      >
        <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Dispute Resolved</h3>
        <p style={{ color: '#34d399', margin: 0, fontSize: 14 }}>{successMsg}</p>
      </motion.div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Dispute summary */}
      <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={20} color="#ef4444" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fca5a5' }}>Dispute Open</h3>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>Payment frozen</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, padding: '3px 10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, color: '#fca5a5', fontWeight: 600 }}>
            {CATEGORY_LABELS[dispute.category] || dispute.category}
          </span>
        </div>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{dispute.description}</p>
      </div>

      {/* Photo evidence section */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <button
          onClick={() => setShowPhotosSection(!showPhotosSection)}
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <ImageIcon size={18} color="#6366f1" />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Photo Evidence</span>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
            {contractorPhotos.length} contractor · {allEvidencePhotos.length} homeowner
          </span>
          <span style={{ marginLeft: 'auto' }}>
            {showPhotosSection ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
          </span>
        </button>

        {showPhotosSection && (
          <div style={{ padding: '0 20px 20px' }}>
            {/* Side-by-side grid */}
            {(contractorPhotos.length > 0 || allEvidencePhotos.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {/* Contractor photos */}
                <div>
                  <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Contractor's Work
                  </div>
                  {contractorPhotos.length === 0 ? (
                    <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
                      No completion photos
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                      {contractorPhotos.slice(0, 4).map((p, i) => (
                        <a key={i} href={p.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={p.url} alt={`Contractor photo ${i + 1}`}
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Homeowner evidence */}
                <div>
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Homeowner Evidence
                  </div>
                  {allEvidencePhotos.length === 0 ? (
                    <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
                      No evidence uploaded
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                      {allEvidencePhotos.slice(0, 4).map((p, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={p.url} alt={`Evidence ${i + 1}`}
                              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                            />
                          </a>
                          {p.caption && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '3px 6px', borderRadius: '0 0 8px 8px', fontSize: 10, color: '#d1d5db' }}>
                              {p.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload evidence (homeowner only, dispute still open) */}
            {isHomeowner && !isResolved && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingIdx !== null}
                  style={{
                    width: '100%', padding: '12px', background: 'transparent',
                    border: '1.5px dashed rgba(99,102,241,0.4)', borderRadius: 10,
                    color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {uploadingIdx !== null
                    ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                    : <><Upload size={15} /> Add Evidence Photos</>}
                </button>
                <p style={{ fontSize: 11, color: '#4b5563', textAlign: 'center', margin: '6px 0 0' }}>
                  Photos showing the problem will strengthen your case
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Scale size={18} color="#8b5cf6" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>AI Dispute Analysis</h3>
          {analysis && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', fontWeight: 600 }}>
              Confidence: {analysis.confidence}
            </span>
          )}
        </div>

        {!analysis ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
              Upload your evidence photos, then run the AI analysis. Our AI will compare the contractor's completion photos with your evidence and suggest a fair resolution.
            </p>
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              style={{ padding: '11px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: analyzing ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: analyzing ? 0.7 : 1 }}
            >
              {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing Photos…</> : <><Zap size={16} /> Run AI Analysis</>}
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {verdictCfg && (
              <div style={{ padding: '12px 16px', background: verdictCfg.bg, border: `1px solid ${verdictCfg.border}`, borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: verdictCfg.color, marginBottom: 6 }}>{verdictCfg.label}</div>
                <p style={{ color: '#d1d5db', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{analysis.verdictReason}</p>
              </div>
            )}

            {analysis.keyFindings?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Key Findings</div>
                {analysis.keyFindings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <Info size={13} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{f}</p>
                  </div>
                ))}
              </div>
            )}

            {isHomeowner && (
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}
              >
                <RefreshCw size={13} /> Re-analyze
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Resolution options (homeowner only, dispute open) */}
      {isHomeowner && !isResolved && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Shield size={18} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Choose a Resolution</h3>
          </div>
          <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 16px', lineHeight: 1.5 }}>
            These options let you resolve the dispute without waiting for admin review.
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Request redo */}
            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#a5b4fc', marginBottom: 4 }}>Request Contractor to Redo</div>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    Payment stays frozen. Contractor is notified to fix the issues. Job status reopens.
                  </p>
                </div>
                <button
                  onClick={() => resolve('request_redo')}
                  disabled={resolving !== null}
                  style={{ flexShrink: 0, padding: '9px 16px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, color: '#a5b4fc', fontSize: 13, fontWeight: 600, cursor: resolving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {resolving === 'request_redo' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Request Redo
                </button>
              </div>
            </div>

            {/* Partial settlement */}
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fcd34d', marginBottom: 4 }}>Partial Settlement</div>
              <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>
                Pay the contractor a percentage of the total for work that was completed.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <input
                  type="range"
                  min={10} max={90} step={5}
                  value={partialPct}
                  onChange={(e) => setPartialPct(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d', minWidth: 60, textAlign: 'right' }}>
                  {partialPct}% ({formatCurrency(paymentAmountUsd * partialPct / 100)})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                <span>Contractor gets: {formatCurrency(paymentAmountUsd * partialPct / 100)}</span>
                <span>You get refunded: {formatCurrency(paymentAmountUsd * (100 - partialPct) / 100)}</span>
              </div>
              <button
                onClick={() => resolve('accept_partial', { partialPercent: partialPct })}
                disabled={resolving !== null}
                style={{ padding: '9px 18px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, color: '#fcd34d', fontSize: 13, fontWeight: 600, cursor: resolving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {resolving === 'accept_partial' ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                Accept Partial Settlement
              </button>
            </div>

            {/* Full refund */}
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fca5a5', marginBottom: 4 }}>Full Refund</div>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    Cancel the job and get your full {formatCurrency(paymentAmountUsd)} back. Contractor receives nothing.
                  </p>
                </div>
                <button
                  onClick={() => { if (confirm('Are you sure you want a full refund? This cannot be undone.')) resolve('accept_full_refund'); }}
                  disabled={resolving !== null}
                  style={{ flexShrink: 0, padding: '9px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#fca5a5', fontSize: 13, fontWeight: 600, cursor: resolving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {resolving === 'accept_full_refund' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                  Full Refund
                </button>
              </div>
            </div>

            {/* Release payment */}
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#34d399', marginBottom: 4 }}>Accept Work & Release Payment</div>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    If you've resolved this with the contractor, release the full payment and close the job.
                  </p>
                </div>
                <button
                  onClick={() => resolve('release_payment')}
                  disabled={resolving !== null}
                  style={{ flexShrink: 0, padding: '9px 16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, color: '#34d399', fontSize: 13, fontWeight: 600, cursor: resolving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {resolving === 'release_payment' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Release Payment
                </button>
              </div>
            </div>

            {/* Escalate */}
            <button
              onClick={() => resolve('escalate_admin')}
              disabled={resolving !== null}
              style={{ padding: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#6b7280', fontSize: 13, cursor: resolving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {resolving === 'escalate_admin' ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              Escalate to Admin for Manual Review (24hr response)
            </button>
          </div>
        </div>
      )}

      {/* Contractor view — dispute open, waiting */}
      {!isHomeowner && !isResolved && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <AlertTriangle size={16} color="#f59e0b" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d' }}>Dispute Under Review</span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Payment is frozen while the homeowner reviews the dispute. You'll be notified of their resolution.
            Use the chat to communicate directly and try to reach an agreement.
          </p>
        </div>
      )}
    </div>
  );
}
