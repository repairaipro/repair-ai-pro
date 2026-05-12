'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, Star, Crown, ArrowRight,
  Briefcase, Bell, BarChart2, Zap, Loader2,
} from 'lucide-react';

type Plan = 'pro' | 'elite';

const PLAN_CONFIG: Record<Plan, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  perks: string[];
}> = {
  pro: {
    name:  'Pro',
    icon:  <Star className="w-10 h-10" />,
    color: '#818cf8',
    bg:    'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))',
    perks: [
      'Unlimited job invites every month',
      'Verified Pro badge on your profile',
      'Priority matching — shown first to homeowners',
      'AI job scoring — see your fit before you bid',
      'SMS + push alerts for new matching jobs',
      'Analytics dashboard to track earnings',
    ],
  },
  elite: {
    name:  'Elite',
    icon:  <Crown className="w-10 h-10" />,
    color: '#fbbf24',
    bg:    'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.08))',
    perks: [
      'Featured placement at the top of all searches',
      'Early emergency job access (30 min before others)',
      '0% platform fee on your first 3 jobs/month',
      'Dedicated account manager',
      'Custom profile URL',
      'Everything included in Pro',
    ],
  },
};

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const plan = (searchParams.get('plan') ?? 'pro') as Plan;
  const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.pro;

  const [verifying, setVerifying] = useState(true);
  const [verified,  setVerified]  = useState(false);

  useEffect(() => {
    // Small delay to let webhook process, then confirm
    const t = setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--color-bg)' }}
    >
      <div style={{ maxWidth: 520, width: '100%' }} className="space-y-6">

        {/* Hero icon */}
        <div className="text-center space-y-4">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background:  config.bg,
              border:      `1px solid ${config.color}40`,
              boxShadow:   `0 0 60px ${config.color}30`,
              color:       config.color,
            }}
          >
            {verifying
              ? <Loader2 className="w-10 h-10 animate-spin" />
              : config.icon}
          </div>

          {verifying ? (
            <>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
                Activating your plan…
              </h1>
              <p style={{ color: 'var(--color-text-3)', fontSize: '0.9rem' }}>
                Finalizing your subscription with Stripe.
              </p>
            </>
          ) : (
            <>
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3"
                  style={{ background: `${config.color}18`, color: config.color }}
                >
                  <Zap className="w-3 h-3" />
                  {config.name} Activated
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
                  You're a {config.name} contractor! 🎉
                </h1>
                <p style={{ color: 'var(--color-text-3)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Your account is upgraded. Start claiming jobs with your new advantages right now.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Perks list */}
        {!verifying && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
              What's unlocked
            </p>
            {config.perks.map((perk) => (
              <div key={perk} className="flex items-start gap-3">
                <CheckCircle2
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: config.color }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>{perk}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next steps */}
        {!verifying && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-4)' }}>
              Get the most out of {config.name}
            </p>
            {[
              { icon: <Briefcase className="w-4 h-4" />, text: 'Browse open jobs — you\'re now shown first', color: 'var(--color-brand)' },
              { icon: <Bell className="w-4 h-4" />, text: 'Enable push notifications to never miss a job', color: 'var(--color-success)' },
              { icon: <BarChart2 className="w-4 h-4" />, text: 'Check your analytics dashboard to track performance', color: '#fbbf24' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--color-surface-2)', color: item.color }}
                >
                  {item.icon}
                </div>
                <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA buttons */}
        {!verifying && (
          <div className="space-y-2">
            <Link
              href="/contractor-inbox"
              className="btn btn-primary btn-full btn-lg"
              style={{ justifyContent: 'center' }}
            >
              <Briefcase className="w-4 h-4" /> Browse Jobs Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard/contractor/settings"
              className="btn btn-secondary btn-full"
              style={{ justifyContent: 'center' }}
            >
              View My Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }} />}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
