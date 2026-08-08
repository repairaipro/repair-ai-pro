'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';

const ROLE_CHANGED_EVENT = 'repairai:contractor-status-changed';

/**
 * Distinguishes contractors from homeowners so navigation can show each
 * side of the marketplace its own primary actions instead of a merged,
 * role-blind link set.
 *
 * A user is a contractor iff a contractors/{uid} doc exists — that doc is
 * created during contractor onboarding and nowhere else. Cached in
 * sessionStorage so the Firestore read happens once per session, not on
 * every page navigation. Also listens for setIsContractorCache()'s event so
 * an already-mounted header updates the instant onboarding finishes, instead
 * of showing the pre-onboarding role until the tab is reloaded.
 */
export function useIsContractor(): { isContractor: boolean; roleLoaded: boolean } {
  const { user } = useAuth();
  const [state, setState] = useState<{ isContractor: boolean; roleLoaded: boolean }>({
    isContractor: false,
    roleLoaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    function onRoleChanged(e: Event) {
      const detail = (e as CustomEvent<{ uid: string; value: boolean }>).detail;
      if (user && detail?.uid === user.uid) setState({ isContractor: detail.value, roleLoaded: true });
    }
    window.addEventListener(ROLE_CHANGED_EVENT, onRoleChanged);

    if (!user) {
      setState({ isContractor: false, roleLoaded: true });
    } else {
      const cacheKey = `is-contractor:${user.uid}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached !== null) {
        setState({ isContractor: cached === '1', roleLoaded: true });
      } else {
        getDoc(doc(db, 'contractors', user.uid))
          .then((snap) => {
            if (cancelled) return;
            sessionStorage.setItem(cacheKey, snap.exists() ? '1' : '0');
            setState({ isContractor: snap.exists(), roleLoaded: true });
          })
          .catch(() => {
            if (!cancelled) setState({ isContractor: false, roleLoaded: true });
          });
      }
    }

    return () => {
      cancelled = true;
      window.removeEventListener(ROLE_CHANGED_EVENT, onRoleChanged);
    };
  }, [user]);

  return state;
}

/**
 * Call right after a role-changing write (e.g. contractor onboarding creates
 * contractors/{uid}) so every `useIsContractor()` consumer — the header nav,
 * the role badge — reflects it immediately, in this tab, without a reload.
 * Without this, a brand-new contractor would see "Homeowner" everywhere
 * until they closed the tab: the sessionStorage cache above is set once and
 * nothing else invalidated it or re-rendered components already holding the
 * stale value.
 */
export function setIsContractorCache(uid: string, value: boolean) {
  try {
    sessionStorage.setItem(`is-contractor:${uid}`, value ? '1' : '0');
    window.dispatchEvent(new CustomEvent(ROLE_CHANGED_EVENT, { detail: { uid, value } }));
  } catch { /* private browsing etc. — worst case, next reload picks it up */ }
}
