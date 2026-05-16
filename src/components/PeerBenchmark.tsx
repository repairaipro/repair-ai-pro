'use client';

interface PeerBenchmarkProps {
  percentile: number;
  totalEarnings: number;
  trade?: string;
  city?: string;
  loading?: boolean;
}

export function PeerBenchmark({
  percentile,
  totalEarnings,
  trade,
  city,
  loading = false,
}: PeerBenchmarkProps) {
  if (loading) {
    return (
      <div
        className="rounded-lg p-4 animate-pulse"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="h-4 w-24 rounded bg-gray-300 mb-2" />
        <div className="h-3 w-32 rounded bg-gray-200" />
      </div>
    );
  }

  if (totalEarnings === 0) {
    return (
      <div
        className="rounded-lg p-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
          Complete your first job to see how you rank against other contractors.
        </p>
      </div>
    );
  }

  const percentileLabel =
    percentile >= 80
      ? 'Top 20%'
      : percentile >= 60
        ? 'Top 40%'
        : percentile >= 40
          ? 'Top 60%'
          : 'Building track record';

  const percentileColor =
    percentile >= 80
      ? '#22c55e'
      : percentile >= 60
        ? '#3b82f6'
        : percentile >= 40
          ? '#f59e0b'
          : '#9ca3af';

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Peer Ranking
          </h3>
          {trade && city && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>
              {trade} contractors in {city}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: percentileColor }}>
            {percentileLabel}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            {percentile}th percentile
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${Math.max(percentile, 5)}%`,
            background: percentileColor,
          }}
        />
      </div>
    </div>
  );
}
