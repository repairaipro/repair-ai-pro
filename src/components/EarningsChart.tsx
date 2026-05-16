'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EarningsChartProps {
  data: { date: string; amount: number }[];
  loading?: boolean;
}

export function EarningsChart({ data, loading = false }: EarningsChartProps) {
  if (loading) {
    return (
      <div
        className="w-full h-64 rounded-lg flex items-center justify-center animate-pulse"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span style={{ color: 'var(--color-text-4)' }}>Loading chart...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="w-full h-64 rounded-lg flex flex-col items-center justify-center p-4 text-center"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span style={{ color: 'var(--color-text-4)', marginBottom: '8px' }}>No earnings data yet</span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-4)' }}>
          Complete your first job to see earnings trends here
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-80 rounded-lg p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
        Earnings Trend (Last 90 Days)
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--color-text-4)', fontSize: 12 }}
            interval={Math.floor(data.length / 5)}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-4)', fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text)',
            }}
            formatter={(value: any) => `$${(value / 100).toFixed(2)}`}
            labelStyle={{ color: 'var(--color-text-4)' }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
