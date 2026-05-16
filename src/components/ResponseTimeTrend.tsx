'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ResponseTimeTrendProps {
  currentAverage: number;
  trend?: 'improving' | 'stable' | 'declining';
  lastUpdated?: Date;
  trendData?: { date: string; minutes: number }[];
}

export function ResponseTimeTrend({
  currentAverage,
  trend = 'stable',
  lastUpdated,
  trendData = [],
}: ResponseTimeTrendProps) {
  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${Math.round(mins)}m`;
  };

  const trendColor = trend === 'improving' ? '#22c55e' : trend === 'declining' ? '#ef4444' : '#6b7280';
  const trendLabel = trend === 'improving' ? '↓ Improving' : trend === 'declining' ? '↑ Slowing' : '→ Stable';

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Response Time
        </h3>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: trendColor, background: `${trendColor}20` }}>
          {trendLabel}
        </span>
      </div>

      <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {formatMinutes(currentAverage)}
      </p>

      <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
        Average time to respond to job inquiries
        {lastUpdated && ` • Updated ${lastUpdated.toLocaleDateString()}`}
      </p>

      {/* Trend chart or performance context */}
      {trendData.length > 0 ? (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-4)' }}>
            Last 30 days trend
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--color-text-4)', fontSize: 10 }}
                interval={Math.floor(trendData.length / 3)}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-4)', fontSize: 10 }}
                tickFormatter={(value) => `${Math.round(value)}m`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  color: 'var(--color-text)',
                }}
                formatter={(value: any) => `${Math.round(value)} min`}
                labelStyle={{ color: 'var(--color-text-4)' }}
              />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--color-text-4)' }}>Response speed</span>
            <span style={{ color: currentAverage <= 30 ? '#22c55e' : currentAverage <= 120 ? '#fbbf24' : '#ef4444' }}>
              {currentAverage <= 30 ? '⚡ Very Fast' : currentAverage <= 120 ? '⏱️ Good' : '🐢 Slow'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
