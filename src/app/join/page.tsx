'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Gift, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const REF_CODE_KEY = 'pending_referral_code';

type RedeemState = 'idle' | 'redeeming' | 'success' | 'error' | 'no-code';

export default function JoinPage() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [signinHref, setSigninHref] = useState('/auth/signin?redirect=%2Fjoin');
  const [state, setState] = useState<RedeemState>('idle');
  const [message, setMessage] = useState('');
  const [creditsApplied, setCreditsApplied] = useState<number | null>(null);

  // Capture ?ref= on first load, hand it off to sessionStorage so it survives
  // the sign-in redirect round-trip (same pattern as the diagnose-photo handoff).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get('ref');
    if (ref) {
      try { sessionStorage.setItem(REF_CODE_KEY, ref); } catch {}
      setCode(ref);
    } else {
      try { setCode(sessionStorage.getItem(REF_CODE_KEY)); } catch { setCode(null); }
    }
    setSigninHref(`/auth/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, []);

  // Once signed in, redeem automatically.
  useEffect(() => {
    if (!user || !code || state !== 'idle') return;
    setState('redeeming');
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/referral/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState('error');
          setMessage(data.error ?? 'Could not redeem that code.');
          return;
        }
        setState('success');
        setCreditsApplied(data.creditsApplied ?? null);
        try { sessionStorage.removeItem(REF_CODE_KEY); } catch {}
      } catch {
        setState('error');
        setMessage('Something went wrong redeeming your code.');
      }
    })();
  }, [user, code, state]);

  useEffect(() => {
    if (user !== undefined && !code) setState('no-code');
  }, [user, code]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--color-bg)' }}>
      <div className="card p-8 text-center max-w-sm w-full">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          <Gift className="w-6 h-6" style={{ color: '#fff' }} />
        </div>

        {state === 'no-code' && (
          <>
            <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Missing invite code</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-4)' }}>
              This link is missing its referral code. Ask your friend to resend their invite link.
            </p>
            <Link href="/" className="btn btn-secondary btn-full">Go to RepairAI Pro</Link>
          </>
        )}

        {(state === 'idle' || state === 'redeeming') && code && !user && (
          <>
            <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>You've been invited to RepairAI Pro</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-4)' }}>
              Sign up to redeem code <strong style={{ color: 'var(--color-text)' }}>{code}</strong> — you and your friend both get credit.
            </p>
            <Link href={signinHref} className="btn btn-primary btn-full">Sign Up to Redeem</Link>
          </>
        )}

        {state === 'redeeming' && user && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Redeeming your invite…</p>
          </div>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3" style={{ color: '#34d399' }} />
            <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>You're in!</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-4)' }}>
              {creditsApplied ? `$${creditsApplied} credit applied to your account.` : 'Your invite was redeemed.'}
            </p>
            <Link href="/jobs/new" className="btn btn-primary btn-full">
              Post your first job <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#f87171' }} />
            <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Couldn't redeem that code</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-4)' }}>{message}</p>
            <Link href="/" className="btn btn-secondary btn-full">Continue to RepairAI Pro</Link>
          </>
        )}
      </div>
    </div>
  );
}
