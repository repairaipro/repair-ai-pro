'use client';

import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Role = 'guest' | 'customer' | 'tradesman';

type ProtectedProps = {
  children: React.ReactNode;
  /** Leave undefined to allow any signed-in user. Provide roles to restrict. */
  allow?: Role[];
  /** Where to send unauthenticated users. */
  redirectTo?: string;
};

export default function Protected({
  children,
  allow,
  redirectTo = '/auth/signin',
}: ProtectedProps) {
  const { user } = useAuth(); // expected: undefined (loading) | null (signed out) | { ... , role }
  const router = useRouter();
  const pathname = usePathname();

  // Auth + authorization checks
  useEffect(() => {
    // still loading user from Firebase
    if (user === undefined) return;

    // not signed in → go to signin and keep "next" so we can return
    if (user === null) {
      router.replace(`${redirectTo}?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // signed in but role not allowed
    if (allow && user.role && !allow.includes(user.role as Role)) {
      router.replace('/'); // or a dedicated /403 page
    }
  }, [user, allow, router, pathname, redirectTo]);

  // UI while loading auth state
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  // If redirecting (signed out) render nothing to avoid flicker
  if (user === null) return null;

  // If role not allowed and redirect hasn't happened yet (edge race)
  if (allow && user.role && !allow.includes(user.role as Role)) {
    return <div className="p-6">You don’t have access to this page.</div>;
  }

  // All good
  return <>{children}</>;
}
