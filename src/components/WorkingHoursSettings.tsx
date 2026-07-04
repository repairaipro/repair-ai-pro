'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Check } from 'lucide-react';
import { DEFAULT_WORKING_HOURS, type WorkingHours } from '@/lib/availability';

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

interface Props {
  contractorId: string;
}

export default function WorkingHoursSettings({ contractorId }: Props) {
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [bufferMinutes, setBufferMinutes] = useState(30);
  const [jobDuration, setJobDuration] = useState(90);
  const [autoAccept, setAutoAccept] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/contractors/${contractorId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.workingHours) setHours(data.workingHours);
          if (data.bufferMinutes) setBufferMinutes(data.bufferMinutes);
          if (data.defaultJobDurationMinutes) setJobDuration(data.defaultJobDurationMinutes);
          if (typeof data.autoAcceptBookings === 'boolean') setAutoAccept(data.autoAcceptBookings);
        }
      } catch (e) {
        console.error('Failed to load working hours:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [contractorId]);

  const toggleDay = (day: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));
    setSaved(false);
  };

  const updateTime = (day: string, field: 'start' | 'end', value: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { auth } = await import('@/lib/db');
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/contractors/${contractorId}/working-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          workingHours: hours,
          bufferMinutes,
          defaultJobDurationMinutes: jobDuration,
          autoAcceptBookings: autoAccept,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save working hours:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-text-4)' }} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 space-y-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>Working hours</h2>
        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
          Customers can only book appointments during these hours.
        </p>
      </div>

      {/* Days */}
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <div key={key} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <button
                onClick={() => toggleDay(key)}
                className="w-24 text-left text-sm font-medium flex-shrink-0"
                style={{ color: day.enabled ? 'var(--color-text)' : 'var(--color-text-4)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span
                  className="inline-block w-8 h-4 rounded-full mr-2 align-middle relative transition-colors"
                  style={{ background: day.enabled ? '#4f46e5' : 'var(--color-border)' }}
                >
                  <span
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                    style={{ transform: day.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </span>
                {label}
              </button>

              {day.enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => updateTime(key, 'start', e.target.value)}
                    className="input"
                    style={{ padding: '6px 8px', fontSize: '13px', width: 'auto' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>to</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => updateTime(key, 'end', e.target.value)}
                    className="input"
                    style={{ padding: '6px 8px', fontSize: '13px', width: 'auto' }}
                  />
                </div>
              ) : (
                <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>Closed</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Job duration & buffer */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <label className="label">Default job length</label>
          <select value={jobDuration} onChange={(e) => { setJobDuration(Number(e.target.value)); setSaved(false); }} className="input">
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
          </select>
        </div>
        <div>
          <label className="label">Buffer between jobs</label>
          <select value={bufferMinutes} onChange={(e) => { setBufferMinutes(Number(e.target.value)); setSaved(false); }} className="input">
            <option value={0}>None</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
      </div>

      {/* Auto-accept toggle */}
      <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'var(--color-bg)' }}>
        <button
          onClick={() => { setAutoAccept(!autoAccept); setSaved(false); }}
          className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0 mt-0.5"
          style={{ background: autoAccept ? '#4f46e5' : 'var(--color-border)', border: 'none', cursor: 'pointer' }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ transform: autoAccept ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Auto-accept bookings</p>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            Customers can book your open slots instantly without waiting for you to confirm. Recommended once you trust your calendar accuracy.
          </p>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-full">
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check className="w-4 h-4" /> Saved</>
        ) : (
          <><Save className="w-4 h-4" /> Save working hours</>
        )}
      </button>
    </div>
  );
}
