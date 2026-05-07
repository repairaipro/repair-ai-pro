'use client';

import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { if (hydrated && user) router.push('/dashboard'); }, [hydrated, user, router]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) return <div className="min-h-screen" style={{ background: 'var(--color-bg)' }} />;

  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center px-4 py-16 animate-fade-in">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-300">
          <span className="text-white text-lg">⚡</span>
        </div>
        <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Repair<span style={{ color: '#818cf8' }}>AI</span> Pro
        </span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(99,102,241,0.08)',
        }}
      >
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
            Sign in to your Repair AI Pro account
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="btn btn-secondary btn-full btn-lg mb-4 group relative overflow-hidden"
          style={{ border: '1px solid var(--color-border-hover)' }}
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity=".25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-4)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Email inputs */}
        <div className="space-y-3 mb-6">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button className="btn btn-primary btn-full btn-lg">
            Sign in
          </button>
          <button
            className="btn btn-outline btn-full btn-lg"
            style={{ border: '1px solid var(--color-border)' }}
          >
            Create an account
          </button>
        </div>

        {/* Trust line */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-4)' }}>
          By signing in you agree to our{' '}
          <a href="#" className="underline" style={{ color: 'var(--color-text-3)' }}>Terms</a>
          {' & '}
          <a href="#" className="underline" style={{ color: 'var(--color-text-3)' }}>Privacy Policy</a>
        </p>
      </div>

      {/* Trust badges */}
      <div className="mt-8 flex items-center gap-6 text-xs" style={{ color: 'var(--color-text-4)' }}>
        <span>🔒 Secure sign-in</span>
        <span>•</span>
        <span>🏆 Trusted by 1,000+ pros</span>
        <span>•</span>
        <span>⚡ Free to join</span>
      </div>
    </div>
  );
}
