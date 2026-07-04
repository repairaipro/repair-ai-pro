'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check, X, Link2, ExternalLink, RefreshCw } from 'lucide-react';

interface Props {
  contractorId: string;
}

interface ConnectionState {
  feedUrl: string | null;
  lastSyncedAt: string | null;
  status: 'ok' | 'error' | null;
  eventsFound: number | null;
}

const HOW_TO_LINKS: { label: string; steps: string }[] = [
  { label: 'Google Calendar', steps: 'Settings → Settings for my calendars → [your calendar] → "Secret address in iCal format"' },
  { label: 'Outlook / Office 365', steps: 'Calendar settings → Shared calendars → Publish a calendar → copy the ICS link' },
  { label: 'Apple Calendar (iCloud)', steps: 'On iCloud.com → Calendar → click your calendar → Public Calendar → copy link' },
];

export default function CalendarConnect({ contractorId }: Props) {
  const [inputUrl, setInputUrl] = useState('');
  const [connection, setConnection] = useState<ConnectionState>({ feedUrl: null, lastSyncedAt: null, status: null, eventsFound: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/contractors/${contractorId}`);
        if (res.ok) {
          const data = await res.json();
          setConnection({
            feedUrl: data.icalFeedUrl ?? null,
            lastSyncedAt: data.icalLastSyncedAt ?? null,
            status: data.icalSyncStatus ?? null,
            eventsFound: Array.isArray(data.icalBusyBlocks) ? data.icalBusyBlocks.length : null,
          });
        }
      } catch (e) {
        console.error('Failed to load calendar connection:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [contractorId]);

  const handleConnect = async () => {
    if (!inputUrl.trim()) return;
    setConnecting(true);
    setError('');
    try {
      const { auth } = await import('@/lib/db');
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/contractors/${contractorId}/ical-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ feedUrl: inputUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not connect that calendar.');
        return;
      }
      setConnection({ feedUrl: inputUrl.trim(), lastSyncedAt: new Date().toISOString(), status: 'ok', eventsFound: data.eventsFound });
      setInputUrl('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { auth } = await import('@/lib/db');
      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/contractors/${contractorId}/ical-connect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnection({ feedUrl: null, lastSyncedAt: null, status: null, eventsFound: null });
    } catch (e) {
      console.error('Failed to disconnect:', e);
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
    <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>Connect your calendar</h2>
        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
          Already using Google Calendar, Outlook, or Apple Calendar for your business? Paste your calendar's public link and we'll automatically block times you're already busy — no extra work, no separate login.
        </p>
      </div>

      {connection.feedUrl ? (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg)' }}>
          <div className="flex items-center gap-2">
            {connection.status === 'ok' ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                <Check className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <X className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                {connection.status === 'ok' ? 'Calendar connected' : 'Sync issue — using last known schedule'}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                {connection.eventsFound !== null && `${connection.eventsFound} upcoming events found`}
                {connection.lastSyncedAt && ` · synced ${new Date(connection.lastSyncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
              </p>
            </div>
          </div>
          <button onClick={handleDisconnect} className="btn btn-outline btn-sm">
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              className="input flex-1"
            />
            <button onClick={handleConnect} disabled={connecting || !inputUrl.trim()} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Link2 className="w-4 h-4" /> Connect</>}
            </button>
          </div>

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
              ⚠ {error}
            </p>
          )}

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--color-brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {showHelp ? 'Hide' : 'Where do I find this link?'} <ExternalLink className="w-3 h-3" />
          </button>

          {showHelp && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-bg)' }}>
              {HOW_TO_LINKS.map((h) => (
                <div key={h.label}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text)' }}>{h.label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{h.steps}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.05)' }}>
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
        <p className="text-[11px]" style={{ color: 'var(--color-text-4)' }}>
          This is read-only — we only check when you're busy, never write to your calendar. Synced automatically every hour.
        </p>
      </div>
    </div>
  );
}
