'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/db';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      const code = err.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // Don't reveal whether email exists — just show success
        setSent(true);
      } else {
        setError(err.message ?? 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center px-4 py-16">
      <Link href="/auth/signin" className="flex items-center gap-2 mb-8 text-sm" style={{ color: 'var(--color-text-4)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>

      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>

        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#22c55e' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Check your email</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your spam folder if you don't see it.
            </p>
            <Link href="/auth/signin" className="btn btn-secondary btn-full">Back to sign in</Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Reset your password</h1>
              <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
                Enter the email you signed up with and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required className="input" autoFocus />
              </div>

              {error && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                  ⚠ {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
