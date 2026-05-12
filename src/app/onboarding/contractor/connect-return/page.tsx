'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Banknote, Briefcase, Star, Loader2, ExternalLink,
} from 'lucide-react';

type VerifyState = 'loading' | 'verified' | 'pending' | 'error';

export default function ConnectReturnPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const [state,        setState]        = useState<VerifyState>('loading');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [retrying,     setRetrying]     = useState(false);

  useEffect(() => {
    if (!user) return;
    verify();
  }, [user]);

  async function verify() {
    if (!user) return;
    try {
      setState('loading');
      const token = await user.getIdToken();
      const res   = await fetch('/api/stripe/connect/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();

      if (data.verified) {
        setState('verified');
      } else if (data.requirements?.currently_due?.length) {
        setRequirements(data.requirements.currently_due);
        setState('pending');
      } else {
        setState('pending');
      }
    } catch {
      setState('error');
    }
  }

  async function retryOnboarding() {
    if (!user) return;
    setRetrying(true);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('/api/stripe/connect/create-account', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data  = await res.json();
      if (data.onboarding_url) window.location.href = data.onboarding_url;
    } catch { /* ignore */ }
    setRetrying(false);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* ── Loading ── */}
        {state === 'loading' && (
          <div className="text-center space-y-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'var(--color-brand-dim)', border: '1px solid var(--color-brand-border)' }}
            >
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand)' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              Verifying your account…
            </h1>
            <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
              Checking your Stripe verification status.
            </p>
          </div>
        )}

        {/* ── Verified ✅ ── */}
        {state === 'verified' && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center space-y-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                style={{
                  background:  'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,185,129,0.08))',
                  border:      '1px solid rgba(34,197,94,0.3)',
                  boxShadow:   '0 0 40px rgba(34,197,94,0.2)',
                }}
              >
                <CheckCircle2 className="w-10 h-10" style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
                  You're all set! 🎉
                </h1>
                <p style={{ color: 'var(--color-text-3)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Your bank account is verified. You'll automatically receive payouts
                  when homeowners confirm completed jobs.
                </p>
              </div>
            </div>

            {/* How payouts work */}
            <div
              className="rounded-2xl p-5 space-y-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
                How you get paid
              </p>
              {[
                { icon: <Briefcase className="w-4 h-4" />, label: 'Win a job',            sub: 'Claim & complete the repair' },
                { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Homeowner confirms', sub: 'They tap "Confirm Complete"' },
                { icon: <Banknote className="w-4 h-4" />,    label: 'You get paid',        sub: 'Funds hit your bank in 1–5 days' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--color-brand-dim)', color: 'var(--color-brand)' }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{s.label}</div>
                    <div className="text-xs" style={{ color: 'var(--color-text-4)' }}>{s.sub}</div>
                  </div>
                  {i < 2 && (
                    <ArrowRight className="w-3 h-3 ml-auto flex-shrink-0" style={{ color: 'var(--color-text-4)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Platform fee note */}
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <Star className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-brand)' }} />
              <p className="text-xs" style={{ color: '#a5b4fc', lineHeight: 1.6 }}>
                Platform fee: <strong>12%</strong> per job. Upgrade to{' '}
                <Link href="/contractor/pro" style={{ color: '#818cf8', textDecoration: 'underline' }}>
                  Pro ($29/mo)
                </Link>{' '}
                for priority job matching, a Verified badge, and unlimited leads.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="space-y-2">
              <Link
                href="/contractor-inbox"
                className="btn btn-primary btn-full btn-lg"
                style={{ justifyContent: 'center' }}
              >
                <Briefcase className="w-4 h-4" /> Browse Open Jobs
              </Link>
              <Link
                href="/dashboard/contractor/settings"
                className="btn btn-secondary btn-full"
                style={{ justifyContent: 'center' }}
              >
                View My Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ── Pending / Incomplete KYC ── */}
        {state === 'pending' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border:     '1px solid rgba(245,158,11,0.3)',
                  boxShadow:  '0 0 30px rgba(245,158,11,0.15)',
                }}
              >
                <Clock className="w-10 h-10" style={{ color: 'var(--color-warning)' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
                  Almost there!
                </h1>
                <p style={{ color: 'var(--color-text-3)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Stripe needs a bit more information before you can receive payouts.
                  This usually takes under 2 minutes.
                </p>
              </div>
            </div>

            {requirements.length > 0 && (
              <div
                className="rounded-2xl p-5 space-y-2"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-4)' }}>
                  Required to complete
                </p>
                {requirements.map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: 'var(--color-warning)' }}
                    />
                    <span className="text-sm capitalize" style={{ color: 'var(--color-text-2)' }}>
                      {r.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={retryOnboarding}
                disabled={retrying}
                className="btn btn-primary btn-full btn-lg"
                style={{ justifyContent: 'center' }}
              >
                {retrying
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                  : <><ExternalLink className="w-4 h-4" /> Complete Verification on Stripe</>}
              </button>
              <Link
                href="/dashboard/contractor/settings"
                className="btn btn-secondary btn-full"
                style={{ justifyContent: 'center' }}
              >
                Finish Later
              </Link>
            </div>

            <p className="text-center text-xs" style={{ color: 'var(--color-text-4)', lineHeight: 1.6 }}>
              You can browse and claim jobs now, but payouts are held until verification is complete.
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {state === 'error' && (
          <div className="text-center space-y-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <AlertTriangle className="w-8 h-8" style={{ color: 'var(--color-error)' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                Something went wrong
              </h1>
              <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
                We couldn't verify your Stripe account. Please try again.
              </p>
            </div>
            <div className="space-y-2">
              <button onClick={verify} className="btn btn-primary btn-full" style={{ justifyContent: 'center' }}>
                Try Again
              </button>
              <Link href="/dashboard/contractor/settings" className="btn btn-secondary btn-full" style={{ justifyContent: 'center' }}>
                Go to Settings
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
