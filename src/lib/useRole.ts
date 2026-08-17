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

    if (user === undefined) {
      // Firebase auth state genuinely hasn't resolved yet — not the same as
      // "signed out". Leave roleLoaded false so callers that redirect on
      // `!isContractor` (e.g. gating /contractor/schedule) don't fire on
      // this transient "don't know yet" tick and bounce a real contractor
      // away before the corrected value arrives one render later. This was
      // a real bug: user starts as `undefined` in AuthContext until
      // onAuthStateChanged fires, and treating that the same as `null`
      // (actually signed out) meant `roleLoaded` went true with
      // `isContractor: false` for one render on every fresh page load,
      // which any redirect-on-mount effect could act on before the
      // follow-up render corrected it.
      return;
    }

    if (user === null) {
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

export type ViewMode = 'homeowner' | 'contractor';
const MODE_CHANGED_EVENT = 'repairai:active-mode-changed';
const modeKey = (uid: string) => `active-mode:${uid}`;

/**
 * A single account can be BOTH a homeowner and a contractor — that's the
 * intended design (the onboarding chooser literally says "you can always do
 * both later"), not a bug. What was missing was a way to tell the UI which
 * side you want to see *right now*.
 *
 * `isContractor` (above) is a CAPABILITY — does contractors/{uid} exist.
 * This hook is the VIEW — which nav/dashboard the person is currently in.
 * They only diverge for dual-role users; a homeowner-only account has no
 * contractor view to switch to, and the toggle stays hidden for them.
 *
 * Persisted in localStorage (survives reloads/new tabs, unlike the
 * sessionStorage capability cache) so picking "Contractor" sticks until you
 * switch back, instead of resetting every time you navigate.
 */
export function useActiveMode(hasContractor: boolean): { mode: ViewMode; setMode: (m: ViewMode) => void } {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ViewMode>('homeowner');

  useEffect(() => {
    if (!user) return;
    const key = modeKey(user.uid);
    const stored = localStorage.getItem(key) as ViewMode | null;
    if (stored === 'contractor' && hasContractor) {
      setModeState('contractor');
    } else if (stored === 'homeowner') {
      setModeState('homeowner');
    } else {
      // No explicit preference recorded yet. Default to whatever a
      // contractor-only account was already seeing before this toggle
      // existed — contractor nav — rather than surprising them with a
      // homeowner nav on their next visit. A dual-role user who wants
      // homeowner-first just has to switch once; after that it sticks.
      setModeState(hasContractor ? 'contractor' : 'homeowner');
    }

    function onModeChanged(e: Event) {
      const detail = (e as CustomEvent<{ uid: string; mode: ViewMode }>).detail;
      if (detail?.uid === user.uid) setModeState(detail.mode);
    }
    window.addEventListener(MODE_CHANGED_EVENT, onModeChanged);
    return () => window.removeEventListener(MODE_CHANGED_EVENT, onModeChanged);
  }, [user, hasContractor]);

  function setMode(m: ViewMode) {
    if (!user) return;
    try {
      localStorage.setItem(modeKey(user.uid), m);
      window.dispatchEvent(new CustomEvent(MODE_CHANGED_EVENT, { detail: { uid: user.uid, mode: m } }));
    } catch { /* private browsing etc. */ }
    setModeState(m);
  }

  return { mode, setMode };
}
