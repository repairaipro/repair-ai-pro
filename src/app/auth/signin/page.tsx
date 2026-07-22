'use client';

import { useRouter } from 'next/navigation';
import { signInWithGoogle, completeGoogleRedirectSignIn, signInWithEmail, signUpWithEmail } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';

type Mode = 'signin' | 'signup';

function googleErrorMessage(code?: string): string | null {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null; // user closed it themselves — no error needed
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Try signing in with email & password.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/unauthorized-domain':
      return 'Google sign-in isn’t configured for this domain yet. Please use email & password.';
    default:
      return code ? 'Google sign-in failed. Please try again or use email & password.' : null;
  }
}

export default function SignInPage() {
  const router    = useRouter();
  const { user }  = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode]         = useState<Mode>('signin');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Honor ?redirect= so entry funnels survive authentication (e.g. the
  // contractor pitch page sends pros to /onboarding/contractor instead of
  // dumping everyone on the homeowner dashboard). Same-origin paths only —
  // anything not starting with "/" is ignored to prevent open redirects.
  const getDestination = () => {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  };

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { if (hydrated && user) router.push(getDestination()); }, [hydrated, user, router]);

  // Picks up a Google sign-in that fell back to a full-page redirect
  // (signInWithPopup gets auth/popup-blocked on Safari, most mobile
  // browsers, and locked-down Chrome profiles). Without this, a redirect
  // failure (e.g. account-exists-with-different-credential) failed with
  // zero feedback — the user just landed back here, still signed out.
  useEffect(() => {
    completeGoogleRedirectSignIn().catch((e: any) => {
      setError(googleErrorMessage(e?.code) ?? '');
    });
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const u = await signInWithGoogle();
      if (u) router.push(getDestination());
      // If u is null here, signInWithGoogle fell back to a redirect —
      // the page is about to navigate away, nothing else to do.
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(googleErrorMessage(code) ?? e.message ?? 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    if (mode === 'signup' && !name) { setError('Name is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
      router.push(getDestination());
    } catch (e: any) {
      // Map Firebase error codes to human-readable messages
      const code = e.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Sign in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(e.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) return <div className="min-h-screen" style={{ background: 'var(--color-bg)' }} />;

  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center px-4 py-16 animate-fade-in">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10 group">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <span className="text-white text-lg">⚡</span>
        </div>
        <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Repair<span style={{ color: '#818cf8' }}>AI</span> Pro
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>

        {/* Mode tabs */}
        <div className="flex rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--color-border)' }}>
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={mode === m
                ? { background: 'var(--color-brand)', color: '#fff' }
                : { color: 'var(--color-text-3)' }}>
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle} disabled={googleLoading || loading}
          className="btn btn-secondary btn-full btn-lg mb-4"
          style={{ border: '1px solid var(--color-border)' }}>
          {googleLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
          }
          <span>{googleLoading ? 'Signing in…' : `Continue with Google`}</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-4)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="label">Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jane Smith" className="input" autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" className="input" autoComplete="email" />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="label" style={{ margin: 0 }}>Password</label>
              {mode === 'signin' && (
                <Link href="/auth/forgot-password" className="text-xs" style={{ color: 'var(--color-brand)' }}>
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="input pr-10"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
              ⚠ {error}
            </p>
          )}

          <button type="submit" disabled={loading || googleLoading} className="btn btn-primary btn-full btn-lg">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'signup' ? 'Creating account…' : 'Signing in…'}</>
              : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Trust line */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--color-text-4)' }}>
          By continuing you agree to our{' '}
          <Link href="/terms" className="underline" style={{ color: 'var(--color-text-3)' }}>Terms</Link>
          {' & '}
          <Link href="/privacy" className="underline" style={{ color: 'var(--color-text-3)' }}>Privacy Policy</Link>
        </p>
      </div>

      <div className="mt-8 flex items-center gap-6 text-xs" style={{ color: 'var(--color-text-4)' }}>
        <span>🔒 Secure sign-in</span>
        <span>•</span>
        <span>🛡️ Payments held in escrow</span>
        <span>•</span>
        <span>⚡ Free to join</span>
      </div>
    </div>
  );
}
