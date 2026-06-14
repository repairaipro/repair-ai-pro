import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, BadgeCheck, RotateCcw, Camera, Scale, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'The RepairAI Guarantee — Protected from quote to completion',
  description:
    'Your payment is held in escrow until you confirm the job is done right. Every pro is verified, every job is photo-documented, and disputes are resolved fairly. That is the RepairAI Guarantee.',
  alternates: { canonical: '/guarantee' },
};

const PILLARS = [
  {
    icon: Lock,
    title: 'Your money is held safely',
    body: 'Payment goes into secure escrow — not the contractor’s pocket. It’s only released when you confirm the work is done right.',
    color: '#34d399',
  },
  {
    icon: BadgeCheck,
    title: 'Every pro is verified',
    body: 'Identity, licensing, and insurance are checked before a pro can take your job. Reviews are tied to real, paid jobs — no fakes.',
    color: '#818cf8',
  },
  {
    icon: Camera,
    title: 'Every job is documented',
    body: 'Pros photograph the work as they go. You get a visual record of exactly what was done — before, during, and after.',
    color: '#fbbf24',
  },
  {
    icon: Scale,
    title: 'Disputes resolved fairly',
    body: 'If something’s wrong, our AI reviews the evidence from both sides and recommends a fair resolution. You’re never left stranded.',
    color: '#fb923c',
  },
  {
    icon: RotateCcw,
    title: 'Make-it-right promise',
    body: 'Not satisfied? The job isn’t closed until it’s fixed or fairly refunded. We hold the funds until you’re made whole.',
    color: '#f472b6',
  },
];

export default function GuaranteePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* Hero */}
        <header className="text-center">
          {/* Shield emblem */}
          <div className="flex justify-center mb-6">
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
              <defs>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <filter id="shieldGlow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path
                d="M48 8 L80 20 V46 C80 68 66 82 48 90 C30 82 16 68 16 46 V20 Z"
                fill="url(#shieldGrad)" opacity="0.18" stroke="url(#shieldGrad)" strokeWidth="2"
              />
              <path
                d="M34 48 L44 58 L64 38" stroke="url(#shieldGrad)" strokeWidth="5"
                strokeLinecap="round" strokeLinejoin="round" filter="url(#shieldGlow)" fill="none"
              />
            </svg>
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#34d399' }}
          >
            <ShieldCheck className="w-3 h-3" /> Protected, end to end
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em' }}>
            The RepairAI Guarantee
          </h1>
          <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--color-text-3)' }}>
            Hiring a stranger to fix your home is stressful. So we built protection into every step —
            from the first quote to the moment you’re satisfied. Here’s exactly how you’re covered.
          </p>
        </header>

        {/* Pillars */}
        <div className="space-y-4">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="flex items-start gap-4 rounded-2xl p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${p.color}1a`, border: `1px solid ${p.color}40`, color: p.color }}
              >
                <p.icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text)' }}>{p.title}</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How escrow works strip */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(34,197,94,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <h2 className="text-sm font-bold uppercase tracking-widest mb-5 text-center" style={{ color: '#818cf8' }}>
            How your payment is protected
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              ['1', 'You pay into escrow', 'Funds are held securely by RepairAI — the pro can see they’re committed, but can’t touch them.'],
              ['2', 'The work gets done', 'Your pro completes the job and documents it with photos you can review.'],
              ['3', 'You release payment', 'Only when you confirm you’re satisfied does the money move to the pro.'],
            ].map(([n, t, b]) => (
              <div key={n} className="text-center">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#22c55e)', color: '#fff' }}
                >
                  {n}
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{t}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{b}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/diagnose" className="btn btn-primary">
            Start with a free diagnosis <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-4)' }}>
            No charge to post · pay only when the work is confirmed
          </p>
        </div>
      </div>
    </div>
  );
}
