'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TradeData {
  trade: string;
  total: number;
  count: number;
  avg: number;
}

interface TradePerformanceProps {
  data: TradeData[];
  loading?: boolean;
}

export function TradePerformance({ data, loading = false }: TradePerformanceProps) {
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
        className="w-full h-64 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <span style={{ color: 'var(--color-text-4)' }}>No trade data yet</span>
      </div>
    );
  }

  return (
    <div
      className="w-full h-80 rounded-lg p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
        Earnings by Trade
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="trade" tick={{ fill: 'var(--color-text-4)', fontSize: 12 }} />
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
          <Bar dataKey="total" fill="#6366f1" isAnimationActive={true} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
