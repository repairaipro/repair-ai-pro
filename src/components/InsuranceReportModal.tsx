'use client';

import React, { useState } from 'react';
import { FileText, X, AlertTriangle, Copy, CheckCircle2, Loader2, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary:    '#6366f1',
    colorBackground: '#111827',
    colorText:       '#f9fafb',
    colorDanger:     '#ef4444',
    borderRadius:    '8px',
  },
};

/* ─── Stripe inner checkout ─── */
function ReportCheckoutForm({
  amountUsd,
  onSuccess,
  onCancel,
}: {
  amountUsd: number;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [cardErr, setCardErr] = useState<string | null>(null);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || paying) return;
    setPaying(true);
    setCardErr(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) { setCardErr(submitErr.message ?? 'Card error'); setPaying(false); return; }

    const { error: confirmErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmErr) {
      setCardErr(confirmErr.message ?? 'Payment failed');
      setPaying(false);
    } else if (paymentIntent?.id) {
      onSuccess(paymentIntent.id);
    }
  }

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Insurance Report Fee</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>${amountUsd.toFixed(2)}</span>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      {cardErr && (
        <p style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
          {cardErr}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '0.65rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--color-text-2)',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paying}
          style={{
            flex: 2,
            background: paying ? 'rgba(99,102,241,0.5)' : 'var(--color-brand)',
            border: 'none',
            borderRadius: 10,
            padding: '0.65rem',
            cursor: paying ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: 14,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {paying ? (
            <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
          ) : (
            <><CreditCard size={15} /> Pay ${amountUsd.toFixed(2)}</>
          )}
        </button>
      </div>
    </form>
  );
}

/* ─── Props ─── */
interface InsuranceReportModalProps {
  jobId: string;
  jobDescription: string;
  isOpen: boolean;
  onClose: () => void;
}

/* ─── Inline Markdown Renderer ─── */
function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={{ color: 'var(--color-text)', fontWeight: 600 }}>
        {p}
      </strong>
    ) : (
      p
    )
  );
}

function renderReport(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## '))
      return (
        <h2
          key={i}
          style={{
            color: 'var(--color-text)',
            fontWeight: 700,
            fontSize: '1.1rem',
            marginTop: '1.5rem',
            marginBottom: '0.5rem',
          }}
        >
          {line.slice(3)}
        </h2>
      );
    if (line.startsWith('# '))
      return (
        <h1
          key={i}
          style={{
            color: 'var(--color-text)',
            fontWeight: 800,
            fontSize: '1.25rem',
            marginTop: '1rem',
            marginBottom: '0.5rem',
          }}
        >
          {line.slice(2)}
        </h1>
      );
    if (line.startsWith('- ') || line.startsWith('* '))
      return (
        <li
          key={i}
          style={{
            color: 'var(--color-text-2)',
            marginLeft: '1rem',
            marginBottom: '0.25rem',
          }}
        >
          {parseBold(line.slice(2))}
        </li>
      );
    if (line.trim() === '') return <br key={i} />;
    return (
      <p
        key={i}
        style={{
          color: 'var(--color-text-2)',
          lineHeight: 1.7,
          marginBottom: '0.25rem',
        }}
      >
        {parseBold(line)}
      </p>
    );
  });
}

/* ─── Modal Component ─── */
export default function InsuranceReportModal({
  jobId,
  jobDescription,
  isOpen,
  onClose,
}: InsuranceReportModalProps) {
  const { user } = useAuth();

  const [phase, setPhase]     = useState<'confirm' | 'payment' | 'loading' | 'done' | 'error'>('confirm');
  const [report, setReport]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountUsd, setAmountUsd]       = useState(49);

  if (!isOpen) return null;

  /* ── Step 1: request PaymentIntent (or skip if already generated) ── */
  async function handleGenerate() {
    if (!user) return;
    setPhase('loading');
    setErrorMsg(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/insurance-report`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();

      if (data.alreadyGenerated) {
        // Report was already purchased — show it immediately
        setReport(data.report ?? '');
        setPhase('done');
        return;
      }

      if (data.requiresPayment && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setAmountUsd(data.amountUsd ?? 49);
        setPhase('payment');
        return;
      }

      // Unexpected — just show what came back
      setReport(data.report ?? '');
      setPhase('done');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to start report generation');
      setPhase('error');
    }
  }

  /* ── Step 2: payment confirmed by Stripe → generate the report ── */
  async function handlePaymentSuccess(paymentIntentId: string) {
    if (!user) return;
    setPhase('loading');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/insurance-report`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ paymentIntentId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setReport(data.report ?? '');
      setPhase('done');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to generate report after payment');
      setPhase('error');
    }
  }

  /* ── Copy report ── */
  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  /* ── Reset when closed ── */
  function handleClose() {
    setPhase('confirm');
    setReport(null);
    setErrorMsg(null);
    setCopied(false);
    setClientSecret(null);
    onClose();
  }

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Overlay ── */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* ── Card ── */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '42rem',
            maxHeight: '85vh',
            overflowY: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            animation: 'modalFadeIn 0.25s ease both',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              position: 'sticky',
              top: 0,
              background: 'var(--color-surface)',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '0.625rem',
                background: 'rgba(99,102,241,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={20} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: 'var(--color-text)',
                  margin: 0,
                }}
              >
                AI Insurance Report
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', margin: 0 }}>
                Professional damage assessment for insurance claims
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--color-text-3)',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '1.5rem', flex: 1 }}>

            {/* ── CONFIRM phase ── */}
            {phase === 'confirm' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Job context */}
                <div
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--color-text-3)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Job Description
                  </p>
                  <p
                    style={{
                      color: 'var(--color-text-2)',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {jobDescription}
                  </p>
                </div>

                {/* Fee warning */}
                <div
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.35)',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertTriangle
                    size={20}
                    style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <p
                      style={{
                        fontWeight: 700,
                        color: 'var(--color-warning)',
                        fontSize: '0.9rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      $49 Report Fee
                    </p>
                    <p style={{ color: 'var(--color-text-2)', fontSize: '0.825rem', lineHeight: 1.5, margin: 0 }}>
                      This AI report costs{' '}
                      <strong style={{ color: 'var(--color-text)' }}>$49</strong> and will be
                      charged to your account. The report includes a professional damage
                      assessment, cost estimate range, and insurance claim justification.
                    </p>
                  </div>
                </div>

                {/* What you get */}
                <div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--color-text-3)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Report Includes
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      'Executive Summary',
                      'Damage Assessment',
                      'Repair Scope & Timeline',
                      'Cost Estimate Range',
                      'Insurance Claim Justification',
                      'Contractor Verification Notes',
                      'Recommendations',
                    ].map((item) => (
                      <li
                        key={item}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: 'var(--color-text-2)',
                          fontSize: '0.875rem',
                        }}
                      >
                        <CheckCircle2 size={15} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleClose}
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.625rem',
                      padding: '0.65rem 1.25rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'var(--color-text-2)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    style={{
                      background: 'var(--color-brand)',
                      border: 'none',
                      borderRadius: '0.625rem',
                      padding: '0.65rem 1.5rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <FileText size={16} />
                    Generate Report ($49)
                  </button>
                </div>
              </div>
            )}

            {/* ── PAYMENT phase ── */}
            {phase === 'payment' && clientSecret && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div
                  style={{
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                  }}
                >
                  <CreditCard size={20} style={{ color: '#818cf8', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '0.9rem', marginBottom: 2 }}>
                      Complete payment to generate report
                    </p>
                    <p style={{ color: 'var(--color-text-3)', fontSize: '0.8rem', margin: 0 }}>
                      Your card will be charged <strong style={{ color: 'var(--color-text-2)' }}>${amountUsd.toFixed(2)}</strong> once. Report is generated immediately after.
                    </p>
                  </div>
                </div>

                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
                >
                  <ReportCheckoutForm
                    amountUsd={amountUsd}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setPhase('confirm')}
                  />
                </Elements>
              </div>
            )}

            {/* ── LOADING phase ── */}
            {phase === 'loading' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem 1rem',
                  gap: '1rem',
                  textAlign: 'center',
                }}
              >
                <Loader2
                  size={48}
                  style={{
                    color: 'var(--color-brand)',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
                    Generating your report…
                  </p>
                  <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', margin: 0 }}>
                    This takes approximately 20 seconds. Please don&apos;t close this window.
                  </p>
                </div>
                <div
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-3)',
                  }}
                >
                  GPT-4o is analyzing your job details…
                </div>
              </div>
            )}

            {/* ── ERROR phase ── */}
            {phase === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertTriangle size={20} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--color-error)', marginBottom: '0.25rem' }}>
                      Generation Failed
                    </p>
                    <p style={{ color: 'var(--color-text-2)', fontSize: '0.875rem', margin: 0 }}>
                      {errorMsg}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleClose}
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.625rem',
                      padding: '0.65rem 1.25rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'var(--color-text-2)',
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setPhase('confirm')}
                    style={{
                      background: 'var(--color-brand)',
                      border: 'none',
                      borderRadius: '0.625rem',
                      padding: '0.65rem 1.25rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#fff',
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* ── DONE phase ── */}
            {phase === 'done' && report !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Success badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(52,211,153,0.1)',
                    border: '1px solid rgba(52,211,153,0.3)',
                    borderRadius: '0.625rem',
                    padding: '0.6rem 1rem',
                  }}
                >
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-success)' }}>
                    Report generated successfully
                  </span>
                </div>

                {/* Report content */}
                <div
                  style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    padding: '1.25rem 1.5rem',
                    fontSize: '0.875rem',
                    lineHeight: 1.7,
                  }}
                >
                  {renderReport(report)}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleClose}
                    style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.625rem',
                      padding: '0.65rem 1.25rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'var(--color-text-2)',
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: copied ? 'var(--color-success)' : 'var(--color-brand)',
                      border: 'none',
                      borderRadius: '0.625rem',
                      padding: '0.65rem 1.5rem',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'background 0.2s',
                    }}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={16} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> Copy Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
