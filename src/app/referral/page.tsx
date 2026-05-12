'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
  Gift,
  Copy,
  CheckCircle2,
  Link2,
  Users,
  DollarSign,
  Share2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

/* ─── Types ─── */
interface ReferralData {
  code: string;
  shareUrl: string;
  redeemCount: number;
  creditsEarned: number;
}

/* ─── Referral Page ─── */
export default function ReferralPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  /* ── Fetch or create referral code ── */
  const loadReferral = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/referral/create', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to load referral');
      }
      const data: ReferralData = await res.json();
      setReferral(data);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user === null) {
      router.push('/auth/signin');
    } else if (user !== undefined) {
      loadReferral();
    }
  }, [user, loadReferral, router]);

  /* ── Copy helpers ── */
  async function copyText(text: string, kind: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch {
      /* silently ignore clipboard errors */
    }
  }

  /* ── HOW IT WORKS steps ── */
  const steps = [
    {
      number: '1',
      title: 'Share your link',
      description: 'Send your unique referral link to friends and family.',
    },
    {
      number: '2',
      title: 'Friend posts first job',
      description: 'Your friend signs up and posts their first repair job.',
    },
    {
      number: '3',
      title: 'You both get $20',
      description: 'Once their job goes live, you each receive $20 in credits.',
    },
  ];

  /* ── Loading state ── */
  if (user === undefined || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2
            size={40}
            style={{
              color: 'var(--color-brand)',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
            Loading your referral info…
          </p>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={loadReferral}
            style={{
              background: 'var(--color-brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.6rem 1.25rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        padding: '2rem 1rem 4rem',
      }}
    >
      {/* ── Keyframes injected inline ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          animation: 'fadeIn 0.4s ease both',
        }}
      >
        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-brand) 0%, #818cf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
            }}
          >
            <Gift size={32} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 800,
              color: 'var(--color-text)',
              marginBottom: '0.5rem',
              lineHeight: 1.2,
            }}
          >
            Earn $20 for every friend you refer
          </h1>
          <p style={{ color: 'var(--color-text-3)', fontSize: '1rem', maxWidth: '440px', margin: '0 auto' }}>
            Share your unique code and you&apos;ll both earn credits when they post their first job.
          </p>
        </div>

        {referral && (
          <>
            {/* ── Referral Code Card ── */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '1rem',
                padding: '1.75rem',
                marginBottom: '1rem',
              }}
            >
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
                Your Referral Code
              </p>

              {/* Code display */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.75rem',
                  padding: '1rem 1.25rem',
                  marginBottom: '1rem',
                }}
              >
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: 'var(--color-brand)',
                    flex: 1,
                  }}
                >
                  {referral.code}
                </span>
                <button
                  onClick={() => copyText(referral.code, 'code')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: codeCopied ? 'var(--color-success)' : 'var(--color-brand)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.55rem 1rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    transition: 'background 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {codeCopied ? (
                    <>
                      <CheckCircle2 size={16} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> Copy Code
                    </>
                  )}
                </button>
              </div>

              {/* Share link display */}
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-3)',
                  marginBottom: '0.5rem',
                }}
              >
                Share Link
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.75rem',
                  padding: '0.75rem 1rem',
                }}
              >
                <Link2 size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                <span
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-2)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {referral.shareUrl}
                </span>
                <button
                  onClick={() => copyText(referral.shareUrl, 'link')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: linkCopied ? 'var(--color-success)' : 'var(--color-surface)',
                    color: linkCopied ? '#fff' : 'var(--color-text-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    padding: '0.45rem 0.85rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {linkCopied ? (
                    <>
                      <CheckCircle2 size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Share2 size={14} /> Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── Stats Cards ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              {/* Friends referred */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
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
                  }}
                >
                  <Users size={20} style={{ color: 'var(--color-brand)' }} />
                </div>
                <p
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--color-text)',
                    lineHeight: 1,
                    marginTop: '0.25rem',
                  }}
                >
                  {referral.redeemCount}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 500 }}>
                  {referral.redeemCount === 1 ? 'friend referred' : 'friends referred'}
                </p>
              </div>

              {/* Credits earned */}
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '0.625rem',
                    background: 'rgba(52,211,153,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarSign size={20} style={{ color: 'var(--color-success)' }} />
                </div>
                <p
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--color-text)',
                    lineHeight: 1,
                    marginTop: '0.25rem',
                  }}
                >
                  ${referral.creditsEarned}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', fontWeight: 500 }}>
                  credits earned
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── How It Works ── */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '1.75rem',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-3)',
              marginBottom: '1.25rem',
            }}
          >
            How It Works
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {steps.map((step, idx) => (
              <div
                key={step.number}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                {/* Number + connector */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-brand) 0%, #818cf8 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.875rem',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {step.number}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      style={{
                        width: '2px',
                        height: '2.5rem',
                        background: 'var(--color-border)',
                        margin: '4px 0',
                      }}
                    />
                  )}
                </div>

                {/* Text */}
                <div style={{ paddingBottom: idx < steps.length - 1 ? '1.5rem' : 0, paddingTop: '0.4rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginBottom: '0.2rem',
                    }}
                  >
                    <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.95rem' }}>
                      {step.title}
                    </p>
                    {idx < steps.length - 1 && (
                      <ArrowRight size={14} style={{ color: 'var(--color-text-3)' }} />
                    )}
                  </div>
                  <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Terms note ── */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--color-text-4)',
          }}
        >
          Credits are applied after the referred friend posts their first job. One referral credit per new user.
        </p>
      </div>
    </div>
  );
}
