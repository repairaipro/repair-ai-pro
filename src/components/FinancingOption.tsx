'use client';

import { useState } from 'react';
import { CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { getFinancingEstimate, FINANCING_MIN_USD } from '@/lib/financing';

type Props = {
  total: number;
  /** 'inline' = compact one-liner; 'card' = expandable plan breakdown */
  variant?: 'inline' | 'card';
};

/**
 * "or as low as $X/mo" — shown wherever a big-ticket total appears.
 * Renders nothing below the financing threshold.
 */
export default function FinancingOption({ total, variant = 'inline' }: Props) {
  const [open, setOpen] = useState(false);
  const est = getFinancingEstimate(total);
  if (!est.eligible) return null;

  if (variant === 'inline') {
    return (
      <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-4)' }}>
        <CreditCard className="w-3 h-3" style={{ color: '#34d399' }} />
        or as low as{' '}
        <span className="font-bold" style={{ color: '#34d399' }}>
          ${est.monthlyLow}/mo
        </span>{' '}
        for {est.termMonths} mo
      </p>
    );
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}
    >
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4" style={{ color: '#34d399' }} />
        <span className="text-sm" style={{ color: 'var(--color-text-2)' }}>
          Pay over time —{' '}
          <span className="font-bold" style={{ color: '#34d399' }}>
            from ${est.monthlyLow}/mo
          </span>
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto text-xs flex items-center gap-0.5"
          style={{ color: 'var(--color-text-4)' }}
        >
          {open ? <>Hide <ChevronUp className="w-3 h-3" /></> : <>See plans <ChevronDown className="w-3 h-3" /></>}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-1.5">
          {est.plans.map((p) => (
            <div key={p.months} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--color-text-3)' }}>{p.months} months</span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                ${p.monthly}/mo
              </span>
            </div>
          ))}
          <p className="text-[10px] pt-1.5" style={{ color: 'var(--color-text-4)' }}>
            Estimated at {(est.apr * 100).toFixed(1)}% APR. Your actual rate and terms are set when you apply —
            subject to approval. Financing available on jobs over ${FINANCING_MIN_USD}.
          </p>
        </div>
      )}
    </div>
  );
}
