'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function UnsubscribePage() {
  const [email, setEmail]   = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [type, setType]     = useState('all');

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email');
    if (e) setEmail(decodeURIComponent(e));
  }, []);

  async function handleUnsubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm space-y-6">

        {status === 'done' ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#22c55e' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Unsubscribed</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
              You've been removed from {type === 'all' ? 'all RepairAI Pro emails' : `${type} emails`}.
              You may still receive critical account and security messages.
            </p>
            <Link href="/" className="btn btn-secondary btn-sm">Back to home</Link>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div>
              <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Unsubscribe</h1>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                We'll remove you from the selected email list immediately.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" required className="input" />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--color-text-3)' }}>What would you like to unsubscribe from?</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input">
                <option value="marketing">Marketing & promotional emails</option>
                <option value="digest">Weekly digest & updates</option>
                <option value="all">All emails (except critical account alerts)</option>
              </select>
            </div>

            {status === 'error' && (
              <p className="text-xs" style={{ color: '#f87171' }}>Something went wrong. Please email privacy@repairai.pro directly.</p>
            )}

            <button type="submit" disabled={status === 'loading'} className="btn btn-primary btn-full">
              {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Unsubscribe'}
            </button>

            <p className="text-[10px] text-center" style={{ color: 'var(--color-text-4)' }}>
              You will still receive transactional emails (job updates, payment confirmations, security alerts).
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
