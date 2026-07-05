'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';

/**
 * Distinguishes contractors from homeowners so navigation can show each
 * side of the marketplace its own primary actions instead of a merged,
 * role-blind link set.
 *
 * A user is a contractor iff a contractors/{uid} doc exists — that doc is
 * created during contractor onboarding and nowhere else. Cached in
 * sessionStorage so the Firestore read happens once per session, not on
 * every page navigation.
 */
export function useIsContractor(): { isContractor: boolean; roleLoaded: boolean } {
  const { user } = useAuth();
  const [state, setState] = useState<{ isContractor: boolean; roleLoaded: boolean }>({
    isContractor: false,
    roleLoaded: false,
  });

  useEffect(() => {
    if (!user) {
      setState({ isContractor: false, roleLoaded: true });
      return;
    }

    const cacheKey = `is-contractor:${user.uid}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) {
      setState({ isContractor: cached === '1', roleLoaded: true });
      return;
    }

    let cancelled = false;
    getDoc(doc(db, 'contractors', user.uid))
      .then((snap) => {
        if (cancelled) return;
        sessionStorage.setItem(cacheKey, snap.exists() ? '1' : '0');
        setState({ isContractor: snap.exists(), roleLoaded: true });
      })
      .catch(() => {
        if (!cancelled) setState({ isContractor: false, roleLoaded: true });
      });

    return () => { cancelled = true; };
  }, [user]);

  return state;
}
