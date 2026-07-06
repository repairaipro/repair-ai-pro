'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { useAuth, isContractor } from '@/lib/auth';
import { Home, HardHat, ArrowRight } from 'lucide-react';

/**
 * Onboarding entry: the two-sided-marketplace fork.
 *
 * Previously this page auto-routed by whether a contractors/{uid} doc
 * existed — but new signups never have one, so every new user was sent
 * to homeowner onboarding and there was NO path into contractor
 * onboarding (the only place the contractor doc gets created). The
 * supply-side funnel was circularly broken.
 *
 * Now: existing contractors still skip ahead automatically; everyone
 * else explicitly picks a side.
 */
export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin?redirect=%2Fonboarding');
      return;
    }
    (async () => {
      const contractor = await isContractor(user.uid);
      if (contractor) {
        router.push('/onboarding/contractor');
      } else {
        setChecking(false); // show the role chooser
      }
    })();
  }, [user, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Setting up your account…</p>
        </div>
      </div>
    );
  }

  // Homeowners have no separate onboarding ceremony — their first job post
  // IS the onboarding (it collects location with obvious purpose, and the
  // AI diagnosis is the first-value moment). We just mark the flag so the
  // dashboard stops redirecting here, then send them straight to posting.
  const startAsHomeowner = async () => {
    try {
      await setDoc(doc(db, 'users', user!.uid), { onboardingComplete: true }, { merge: true });
    } catch { /* non-blocking — worst case they see this chooser once more */ }
    router.push('/jobs/new');
  };

  const options = [
    {
      onClick: startAsHomeowner,
      icon: <Home className="w-7 h-7" />,
      color: '#818cf8',
      bg: 'rgba(99,102,241,0.1)',
      border: 'rgba(99,102,241,0.25)',
      title: 'I need something fixed',
      desc: 'Describe the problem — AI diagnoses it, prices it, and matches you with a verified local pro.',
      cta: 'Post my first repair',
    },
    {
      onClick: () => router.push('/onboarding/contractor'),
      icon: <HardHat className="w-7 h-7" />,
      color: '#34d399',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.25)',
      title: "I'm a service pro",
      desc: 'Get matched jobs in your trade, build your reputation, and get paid fast with escrow.',
      cta: 'Continue as pro',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Welcome! What brings you here?
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
            You can always do both later — this just sets up the right home base.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {options.map((o) => (
            <button
              key={o.title}
              onClick={o.onClick}
              className="text-left rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'var(--color-surface)', border: `1px solid var(--color-border)`, cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = o.border; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: o.bg, color: o.color }}>
                {o.icon}
              </div>
              <h2 className="font-bold text-lg mb-1.5" style={{ color: 'var(--color-text)' }}>{o.title}</h2>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{o.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: o.color }}>
                {o.cta} <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
