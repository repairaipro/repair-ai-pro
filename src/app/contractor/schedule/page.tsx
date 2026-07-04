'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ContractorCalendar from '@/components/ContractorCalendar';
import { AlertCircle, Info } from 'lucide-react';

export default function SchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isContractor, setIsContractor] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;

    // Check if user is a contractor
    const checkContractor = async () => {
      try {
        const res = await fetch(`/api/contractors/${user.uid}`);
        if (res.ok) {
          setIsContractor(true);
        } else {
          router.push('/contractor');
        }
      } catch {
        router.push('/contractor');
      }
    };

    checkContractor();
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return <div className="min-h-screen" style={{ background: 'var(--color-bg)' }} />;
  }

  if (!isContractor) {
    return <div className="min-h-screen" style={{ background: 'var(--color-bg)' }} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Your Schedule
          </h1>
          <p className="text-base" style={{ color: 'var(--color-text-3)' }}>
            Manage your availability so we only send you jobs you can take on.
          </p>
        </div>

        {/* Info boxes */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              <span>✓</span>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--color-text)' }}>Open</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Ready to take on jobs</p>
            </div>
          </div>

          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
              <span>⊕</span>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--color-text)' }}>Busy</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Finishing current jobs</p>
            </div>
          </div>

          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <span>✕</span>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--color-text)' }}>Blocked</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Don't send any offers</p>
            </div>
          </div>
        </div>

        {/* Pro tip */}
        <div className="rounded-2xl p-5 mb-8 flex gap-3" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
          <div>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              <strong>Pro tip:</strong> Click any day to cycle through statuses. We only send Instant Book offers on days you mark as "Open". Set availability a week ahead to keep opportunities coming.
            </p>
          </div>
        </div>

        {/* Calendar */}
        <ContractorCalendar contractorId={user.uid} />

        {/* Future enhancements hint */}
        <div className="rounded-2xl p-5 mt-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            💡 Coming soon: Auto-block weekends, set vacation weeks, sync with Google Calendar
          </p>
        </div>
      </div>
    </div>
  );
}
