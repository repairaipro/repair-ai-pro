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
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-800 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Setting up your account...</p>
      </div>
    </div>
  );
}
