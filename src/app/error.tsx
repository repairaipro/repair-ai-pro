'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging; swap for an error-reporting service later
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ background: 'var(--color-bg, #0a0a0a)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
      >
        <AlertTriangle className="w-8 h-8" style={{ color: '#f87171' }} />
      </div>

      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text, #fff)' }}>
          Something went wrong
        </h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-4, #9ca3af)' }}>
          An unexpected error occurred. Your data is safe — try again, or head back home.
        </p>
        {error.digest && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-4, #6b7280)' }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={reset} className="btn btn-primary btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
        <Link href="/" className="btn btn-secondary btn-sm">
          <Home className="w-3.5 h-3.5" /> Go Home
        </Link>
      </div>
    </div>
  );
}
