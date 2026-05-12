'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Home,
  Shield,
  DollarSign,
  Loader2,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface Perk {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const PERKS: Perk[] = [
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'Priority contractor matching',
    description: 'Your job is matched to a vetted contractor in under 30 min.',
  },
  {
    icon: <Home className="w-4 h-4" />,
    title: 'Home Health Score',
    description: 'Track all your repairs and maintenance history in one place.',
  },
  {
    icon: <DollarSign className="w-4 h-4" />,
    title: 'Annual repair summary',
    description: 'Download a full report of expenses — perfect for tax deductions.',
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: '30-day service warranty',
    description: 'Every completed job is backed by a 30-day satisfaction warranty.',
  },
  {
    icon: <DollarSign className="w-4 h-4" />,
    title: '5% cash back on big jobs',
    description: 'Earn 5% cash back automatically on any job over $500.',
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'AI-powered cost estimates',
    description: 'See a fair price range before you even post your job.',
  },
];

function HomeownerSubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') ?? 'pro';

  const [activating, setActivating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setActivating(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-bg)' }}
    >
      <div style={{ maxWidth: 540, width: '100%' }} className="space-y-6">

        {/* ── Hero icon ── */}
        <div className="text-center space-y-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background:  'linear-gradient(135deg, rgba(34,197,94,0.15), var(--color-brand-dim))',
              border:      '1px solid rgba(34,197,94,0.35)',
              boxShadow:   '0 0 64px rgba(34,197,94,0.22)',
              color:       'var(--color-success)',
            }}
          >
            {activating
              ? <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--color-brand)' }} />
              : <CheckCircle2 className="w-10 h-10" />
            }
          </div>

          {activating ? (
            <>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}
              >
                Activating…
              </h1>
              <p style={{ color: 'var(--color-text-3)', fontSize: '0.9rem' }}>
                Finalizing your Pro subscription with Stripe.
              </p>
            </>
          ) : (
            <>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
                style={{
                  background: 'rgba(34,197,94,0.12)',
                  color:      'var(--color-success)',
                }}
              >
                <Zap className="w-3 h-3" />
                Pro Activated
              </div>
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}
              >
                You&apos;re a Pro homeowner! 🎉
              </h1>
              <p style={{ color: 'var(--color-text-3)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Your <strong style={{ color: 'var(--color-text-2)' }}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan
                is live — start posting jobs with your new advantages right now.
              </p>
            </>
          )}
        </div>

        {/* ── Pro perks list ── */}
        {!activating && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: 'var(--color-surface)',
              border:     '1px solid var(--color-border)',
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-text-4)' }}
            >
              What&apos;s unlocked
            </p>

            {PERKS.map((perk) => (
              <div key={perk.title} className="flex items-start gap-3">
                <CheckCircle2
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--color-success)' }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>
                    {perk.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)', lineHeight: 1.5 }}>
                    {perk.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CTA buttons ── */}
        {!activating && (
          <div className="space-y-2">
            <Link
              href="/jobs/new"
              className="btn btn-primary btn-full btn-lg"
              style={{ justifyContent: 'center' }}
            >
              <Home className="w-4 h-4" />
              Post a Job
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-secondary btn-full"
              style={{ justifyContent: 'center' }}
            >
              View Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

export default function HomeownerSubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }} />}>
      <HomeownerSubscriptionSuccessContent />
    </Suspense>
  );
}
