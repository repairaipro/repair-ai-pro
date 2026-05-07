'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, isContractor } from '@/lib/auth';

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    // Check if user is already a contractor
    (async () => {
      const contractor = await isContractor(user.uid);
      if (contractor) {
        router.push('/onboarding/contractor');
      } else {
        router.push('/onboarding/homeowner');
      }
    })();
  }, [user, router]);

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
