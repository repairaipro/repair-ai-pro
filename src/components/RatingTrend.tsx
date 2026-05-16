'use client';

interface RatingTrendProps {
  currentRating: number;
  reviewCount: number;
  trend?: 'improving' | 'stable' | 'declining';
}

export function RatingTrend({
  currentRating,
  reviewCount,
  trend = 'stable',
}: RatingTrendProps) {
  const trendColor = trend === 'improving' ? '#22c55e' : trend === 'declining' ? '#ef4444' : '#6b7280';
  const trendLabel = trend === 'improving' ? '↑ Rising' : trend === 'declining' ? '↓ Dropping' : '→ Stable';

  const renderStars = (rating: number) => {
    return (
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            style={{
              color: n <= Math.round(rating) ? '#fbbf24' : '#d1d5db',
              fontSize: '16px',
            }}
          >
            ★
          </span>
        ))}
      </span>
    );
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Average Rating
        </h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: trendColor, background: `${trendColor}20` }}>
          {trendLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {currentRating > 0 ? currentRating.toFixed(1) : '—'}
        </p>
        {currentRating > 0 && <div>{renderStars(currentRating)}</div>}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
        Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
      </p>

      {/* Quality indicator */}
      {currentRating > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-4)' }}>Quality level</span>
            <span
              style={{
                color: currentRating >= 4.5 ? '#22c55e' : currentRating >= 4 ? '#3b82f6' : currentRating >= 3 ? '#fbbf24' : '#ef4444',
              }}
            >
              {currentRating >= 4.5 ? '🌟 Excellent' : currentRating >= 4 ? '👍 Great' : currentRating >= 3 ? '⚠️ Fair' : '❌ Needs Work'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
