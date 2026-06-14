import Link from 'next/link';
import { Lock, BadgeCheck, Camera, ArrowRight } from 'lucide-react';

/**
 * Compact, reusable trust band. Markets the escrow/verification as a product
 * ("manufacture trust, don't compute it"). Drop it on the homepage, the
 * diagnose result, or any conversion surface.
 */
export default function TrustBar({ compact = false }: { compact?: boolean }) {
  const items = [
    { icon: Lock, label: 'Payment held in escrow', color: '#34d399' },
    { icon: BadgeCheck, label: 'Verified, insured pros', color: '#818cf8' },
    { icon: Camera, label: 'Every job photo-documented', color: '#fbbf24' },
  ];

  if (compact) {
    return (
      <Link
        href="/guarantee"
        className="flex items-center justify-center gap-2 text-xs flex-wrap"
        style={{ color: 'var(--color-text-4)' }}
      >
        {items.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1">
            <it.icon className="w-3 h-3" style={{ color: it.color }} /> {it.label}
          </span>
        ))}
      </Link>
    );
  }

  return (
    <Link
      href="/guarantee"
      className="block rounded-2xl p-5 transition-all group"
      style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(34,197,94,0.04))', border: '1px solid rgba(99,102,241,0.18)' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-5 flex-wrap">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${it.color}1a`, color: it.color }}
              >
                <it.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>{it.label}</span>
            </div>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-0.5" style={{ color: '#818cf8' }}>
          The RepairAI Guarantee <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
