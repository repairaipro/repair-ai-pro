import Link from 'next/link';
import { SearchX, Home, Briefcase } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ background: 'var(--color-bg, #0a0a0a)' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <SearchX className="w-8 h-8" style={{ color: '#818cf8' }} />
      </div>

      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text, #fff)' }}>
          Page not found
        </h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-4, #9ca3af)' }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/" className="btn btn-primary btn-sm">
          <Home className="w-3.5 h-3.5" /> Go Home
        </Link>
        <Link href="/jobs" className="btn btn-secondary btn-sm">
          <Briefcase className="w-3.5 h-3.5" /> Browse Jobs
        </Link>
      </div>
    </div>
  );
}
