'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, CheckCircle } from 'lucide-react';

interface Slot {
  startMs: number;
  endMs: number;
}

interface BookingSlotPickerProps {
  contractorId: string;
  jobId: string;
  jobDurationMinutes?: number;
  onBooked?: (status: 'proposed' | 'accepted') => void;
}

export default function BookingSlotPicker({ contractorId, jobId, jobDurationMinutes, onBooked }: BookingSlotPickerProps) {
  const [grouped, setGrouped] = useState<Record<string, Slot[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<'proposed' | 'accepted' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSlots();
  }, [contractorId]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const qs = jobDurationMinutes ? `?durationMinutes=${jobDurationMinutes}` : '';
      const res = await fetch(`/api/contractors/${contractorId}/slots${qs}`);
      if (res.ok) {
        const data = await res.json();
        setGrouped(data.grouped);
        const firstDay = Object.keys(data.grouped).sort()[0];
        if (firstDay) setSelectedDay(firstDay);
      }
    } catch (e) {
      console.error('Failed to fetch slots:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    setError('');
    try {
      const { auth } = await import('@/lib/db');
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startMs: selectedSlot.startMs,
          endMs: selectedSlot.endMs,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to book. Please try another time.');
        if (res.status === 409) fetchSlots(); // refresh — slot was taken
        return;
      }
      setBooked(data.status);
      onBooked?.(data.status);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const days = Object.keys(grouped).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-text-4)' }} />
      </div>
    );
  }

  if (booked) {
    return (
      <div className="text-center py-10 space-y-3">
        <CheckCircle className="w-10 h-10 mx-auto" style={{ color: '#22c55e' }} />
        <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
          {booked === 'accepted' ? 'Appointment confirmed!' : 'Request sent!'}
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
          {booked === 'accepted'
            ? `You're booked for ${new Date(selectedSlot!.startMs).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`
            : 'Waiting for the contractor to confirm this time. You\'ll be notified.'}
        </p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
          No open times in the next two weeks. Message the contractor directly to arrange a time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const d = new Date(day + 'T00:00:00');
          const isToday = day === new Date().toISOString().slice(0, 10);
          return (
            <button
              key={day}
              onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
              className="flex-shrink-0 rounded-xl px-3 py-2 text-center transition-all"
              style={{
                background: selectedDay === day ? '#4f46e5' : 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: selectedDay === day ? 'white' : 'var(--color-text)',
                minWidth: '64px',
              }}
            >
              <div className="text-[10px] font-medium" style={{ opacity: 0.8 }}>
                {isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-sm font-bold">{d.getDate()}</div>
            </button>
          );
        })}
      </div>

      {/* Time slots for selected day */}
      {selectedDay && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {grouped[selectedDay].map((slot) => (
            <button
              key={slot.startMs}
              onClick={() => setSelectedSlot(slot)}
              className="rounded-lg py-2 px-2 text-sm font-medium transition-all"
              style={{
                background: selectedSlot?.startMs === slot.startMs ? '#4f46e5' : 'var(--color-surface)',
                border: `1px solid ${selectedSlot?.startMs === slot.startMs ? '#4f46e5' : 'var(--color-border)'}`,
                color: selectedSlot?.startMs === slot.startMs ? 'white' : 'var(--color-text)',
              }}
            >
              {new Date(slot.startMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
          ⚠ {error}
        </p>
      )}

      {selectedSlot && (
        <button onClick={handleBook} disabled={booking} className="btn btn-primary btn-full">
          {booking ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Booking…</>
          ) : (
            <><Clock className="w-4 h-4" /> Request {new Date(selectedSlot.startMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
          )}
        </button>
      )}
    </div>
  );
}
