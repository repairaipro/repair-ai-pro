'use client';

import { useMemo } from 'react';

interface Payout {
  amount: number;
  date:   string | null;
  status: 'paid' | 'pending';
  trade:  string;
}

interface EarningsChartProps {
  payouts: Payout[];
}

/**
 * SVG-based earnings bar chart — last 8 weeks of paid payouts.
 * Zero external dependencies.
 */
export function EarningsChart({ payouts }: EarningsChartProps) {
  const W = 540;
  const H = 140;
  const PAD = { top: 16, right: 12, bottom: 36, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const weeks = useMemo(() => {
    // Build last 8 ISO week buckets
    const buckets: { label: string; total: number; weekStart: Date }[] = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      // Start of that week (Mon)
      const day  = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      const label =
        i === 0 ? 'This wk' :
        i === 1 ? 'Last wk' :
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets.push({ label, total: 0, weekStart: new Date(d) });
    }

    for (const p of payouts) {
      if (p.status !== 'paid' || !p.date) continue;
      const pd = new Date(p.date);
      for (let i = buckets.length - 1; i >= 0; i--) {
        const next = i < buckets.length - 1 ? buckets[i + 1].weekStart : new Date(9999, 0);
        if (pd >= buckets[i].weekStart && pd < next) {
          buckets[i].total += p.amount;
          break;
        }
      }
    }

    return buckets;
  }, [payouts]);

  const maxVal  = Math.max(...weeks.map((w) => w.total), 1);
  const barW    = Math.floor(chartW / weeks.length) - 6;
  const hasData = weeks.some((w) => w.total > 0);

  // Y-axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val:   Math.round(maxVal * f),
    y:     PAD.top + chartH * (1 - f),
  }));

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: 'var(--color-text-4)' }}>
        Weekly Earnings
      </p>

      {!hasData ? (
        <div
          className="rounded-xl flex items-center justify-center"
          style={{ height: H, background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            No paid jobs yet — earnings will appear here
          </p>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ overflow: 'visible' }}
          aria-label="Weekly earnings chart"
        >
          {/* Grid lines */}
          {yTicks.map(({ val, y }) => (
            <g key={val}>
              <line
                x1={PAD.left} y1={y}
                x2={PAD.left + chartW} y2={y}
                stroke="var(--color-border)" strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 6} y={y + 4}
                fontSize="9" textAnchor="end"
                fill="var(--color-text-4)"
              >
                ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </text>
            </g>
          ))}

          {/* Bars */}
          {weeks.map((week, i) => {
            const barH  = (week.total / maxVal) * chartH;
            const x     = PAD.left + i * (chartW / weeks.length) + (chartW / weeks.length - barW) / 2;
            const y     = PAD.top + chartH - barH;
            const empty = week.total === 0;

            return (
              <g key={i}>
                {/* Background track */}
                <rect
                  x={x} y={PAD.top}
                  width={barW} height={chartH}
                  rx={4}
                  fill="var(--color-surface-2)"
                />
                {/* Value bar */}
                {!empty && (
                  <>
                    <defs>
                      <linearGradient id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
                      </linearGradient>
                      <filter id={`glow-${i}`}>
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <rect
                      x={x} y={y}
                      width={barW} height={barH}
                      rx={4}
                      fill={`url(#bar-${i})`}
                      filter={`url(#glow-${i})`}
                    />
                    {/* Value label on hover via title */}
                    <title>${week.total.toFixed(2)}</title>
                  </>
                )}

                {/* Amount label above bar */}
                {!empty && barH > 20 && (
                  <text
                    x={x + barW / 2} y={y - 4}
                    fontSize="9" textAnchor="middle"
                    fill="#a5b4fc" fontWeight="600"
                  >
                    ${week.total >= 1000 ? `${(week.total / 1000).toFixed(1)}k` : week.total.toFixed(0)}
                  </text>
                )}

                {/* Week label */}
                <text
                  x={x + barW / 2} y={H - 4}
                  fontSize="9" textAnchor="middle"
                  fill="var(--color-text-4)"
                >
                  {week.label}
                </text>
              </g>
            );
          })}

          {/* Axis line */}
          <line
            x1={PAD.left} y1={PAD.top + chartH}
            x2={PAD.left + chartW} y2={PAD.top + chartH}
            stroke="var(--color-border)" strokeWidth="1"
          />
        </svg>
      )}
    </div>
  );
}
