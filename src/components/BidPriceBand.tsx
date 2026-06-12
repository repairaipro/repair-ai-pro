'use client';

import { Sparkles } from 'lucide-react';

type BandBid = {
  contractorId: string;
  amount: number;
  name?: string;
  status: string;
};

type Props = {
  /** AI fair-price estimate stored on the job at creation */
  low: number;
  typical: number;
  high: number;
  bids: BandBid[];
};

/**
 * Visualizes contractor bids against the AI fair-price band.
 * The differentiated screen: homeowners instantly see which bids are
 * fair, which are a deal, and which are above market.
 */
export default function BidPriceBand({ low, typical, high, bids }: Props) {
  if (!low || !high || high <= low) return null;

  // Scale with padding so out-of-band bids stay visible
  const scaleMin = Math.min(low * 0.7, ...bids.map((b) => b.amount * 0.95));
  const scaleMax = Math.max(high * 1.3, ...bids.map((b) => b.amount * 1.05));
  const pos = (v: number) =>
    Math.max(2, Math.min(98, ((v - scaleMin) / (scaleMax - scaleMin)) * 100));

  const fairLeft  = pos(low);
  const fairRight = pos(high);

  function bidColor(amount: number): string {
    if (amount < low) return '#34d399';            // below market — great deal
    if (amount <= high) return '#818cf8';          // inside the fair band
    return '#fb923c';                              // above market
  }

  function bidLabel(amount: number): string {
    if (amount < low) return 'below market';
    if (amount <= high) return 'fair price';
    return 'above market';
  }

  const visibleBids = bids.filter((b) => b.status === 'pending' || b.status === 'selected');
  if (visibleBids.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-3)' }}>
          Bids vs. AI fair price
        </span>
        <span className="text-[11px] ml-auto" style={{ color: 'var(--color-text-4)' }}>
          fair range ${low}–${high}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-20 mb-1">
        {/* Base line */}
        <div
          className="absolute left-0 right-0 h-2 rounded-full"
          style={{ top: 36, background: 'var(--color-surface-2)' }}
        />
        {/* Fair zone */}
        <div
          className="absolute h-2 rounded-full"
          style={{
            top: 36,
            left: `${fairLeft}%`,
            width: `${fairRight - fairLeft}%`,
            background: 'linear-gradient(90deg, rgba(52,211,153,0.5), rgba(129,140,248,0.5))',
          }}
        />
        {/* Typical marker */}
        <div
          className="absolute w-0.5 h-5"
          style={{ top: 26, left: `${pos(typical)}%`, background: 'rgba(129,140,248,0.8)' }}
        />
        <span
          className="absolute text-[9px] font-medium -translate-x-1/2"
          style={{ top: 52, left: `${pos(typical)}%`, color: 'var(--color-text-4)' }}
        >
          typical ${typical}
        </span>

        {/* Bid markers */}
        {visibleBids.map((b, i) => {
          const color = bidColor(b.amount);
          const isUp = i % 2 === 0; // alternate above/below to reduce overlap
          return (
            <div key={b.contractorId}>
              <div
                className="absolute w-3 h-3 rounded-full -translate-x-1/2 z-10"
                style={{
                  top: 33.5,
                  left: `${pos(b.amount)}%`,
                  background: color,
                  border: '2px solid var(--color-surface)',
                  boxShadow: `0 0 8px ${color}66`,
                }}
                title={`${b.name ?? 'Contractor'}: $${b.amount} (${bidLabel(b.amount)})`}
              />
              <span
                className="absolute text-[9px] font-bold -translate-x-1/2 whitespace-nowrap"
                style={{ top: isUp ? 8 : 64, left: `${pos(b.amount)}%`, color }}
              >
                {(b.name ?? 'Pro').split(' ')[0]} ${b.amount}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center flex-wrap">
        {[
          { color: '#34d399', label: 'Below market' },
          { color: '#818cf8', label: 'Fair price' },
          { color: '#fb923c', label: 'Above market' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-4)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: l.color }} /> {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
