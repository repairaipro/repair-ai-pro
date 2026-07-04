'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

interface AvailabilityBlock {
  date: string; // YYYY-MM-DD
  status: 'available' | 'busy' | 'blocked'; // blocked = do not accept jobs
}

interface CalendarProps {
  contractorId: string;
  onAvailabilityChange?: (blocks: AvailabilityBlock[]) => void;
  readOnly?: boolean;
}

export default function ContractorCalendar({ contractorId, onAvailabilityChange, readOnly = false }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<Map<string, AvailabilityBlock['status']>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, [contractorId]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contractors/${contractorId}/availability`);
      if (res.ok) {
        const data = await res.json();
        const map = new Map(data.blocks.map((b: AvailabilityBlock) => [b.date, b.status]));
        setAvailability(map);
      }
    } catch (e) {
      console.error('Failed to fetch availability:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async (updates: AvailabilityBlock[]) => {
    try {
      const res = await fetch(`/api/contractors/${contractorId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: updates }),
      });
      if (res.ok) {
        onAvailabilityChange?.(updates);
      }
    } catch (e) {
      console.error('Failed to save availability:', e);
    }
  };

  const toggleDay = (date: string) => {
    if (readOnly) return;
    const current = availability.get(date) || 'available';
    const next = current === 'available' ? 'busy' : current === 'busy' ? 'blocked' : 'available';
    const updated = new Map(availability);
    updated.set(date, next);
    setAvailability(updated);
    const blocks = Array.from(updated.entries()).map(([d, s]) => ({ date: d, status: s }));
    saveAvailability(blocks);
  };

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const days = [];
  const totalDays = daysInMonth(currentDate);
  const startingDayOfWeek = firstDayOfMonth(currentDate);

  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'available':
        return { bg: 'rgba(16,185,129,0.1)', border: '#10b981', text: '#059669' };
      case 'busy':
        return { bg: 'rgba(59,130,246,0.1)', border: '#3b82f6', text: '#1d4ed8' };
      case 'blocked':
        return { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#dc2626' };
      default:
        return { bg: 'transparent', border: 'var(--color-border)', text: 'var(--color-text-4)' };
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'available':
        return '✓ Open';
      case 'busy':
        return '⊕ Busy';
      case 'blocked':
        return '✕ Blocked';
      default:
        return 'Click to set';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{monthName}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface)', border: 'none', cursor: 'pointer' }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm rounded-lg"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-3)' }}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface)', border: 'none', cursor: 'pointer' }}
          >
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
          </button>
        </div>
      </div>

      {/* Legend */}
      {!readOnly && (
        <div className="flex flex-wrap gap-4 text-xs mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
            <span style={{ color: 'var(--color-text-4)' }}>Available (click to cycle)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#3b82f6' }} />
            <span style={{ color: 'var(--color-text-4)' }}>Busy with jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
            <span style={{ color: 'var(--color-text-4)' }}>Don't send offers</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-2xl p-4 overflow-x-auto" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold p-2" style={{ color: 'var(--color-text-3)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = availability.get(dateStr);
            const colors = getStatusColor(status);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            return (
              <button
                key={day}
                onClick={() => toggleDay(dateStr)}
                disabled={readOnly}
                className="aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all relative"
                style={{
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  color: colors.text,
                  cursor: readOnly ? 'default' : 'pointer',
                  opacity: readOnly ? 0.7 : 1,
                  boxShadow: isToday ? `0 0 0 2px var(--color-brand)` : 'none',
                }}
              >
                {day}
                <div className="text-[9px] leading-none mt-1" style={{ opacity: 0.7 }}>
                  {getStatusLabel(status).split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading && <p style={{ color: 'var(--color-text-4)', fontSize: '12px' }}>Saving...</p>}
    </div>
  );
}
