/**
 * iCal feed import — the "one link, zero OAuth" calendar integration.
 *
 * Contractors paste a public read-only iCal URL (Google Calendar, Outlook,
 * Apple Calendar, Jobber, Housecall Pro — anything that exports .ics) and
 * we periodically fetch + parse it into plain busy blocks. Those blocks
 * feed into the same generateAvailableSlots() engine as native calendar
 * blocks and platform appointments, so the customer-facing slot picker
 * never needs to know where the busy time came from.
 *
 * Read-only by design: worst case on failure is stale data, never a
 * broken write to someone's real calendar.
 */

import ical from 'node-ical';
import type { BusyBlock } from './availability';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_LOOKAHEAD_DAYS = 30;
const MAX_EVENTS = 500; // guard against pathological feeds

export interface IcalSyncResult {
  ok: boolean;
  busyBlocks?: BusyBlock[];
  error?: string;
}

/**
 * Validates that a URL looks like a plausible iCal feed before we ever
 * fetch it — blocks obviously wrong input early with a clear message.
 */
export function validateIcalUrl(url: string): { ok: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'That doesn\'t look like a valid URL.' };
  }
  if (!['http:', 'https:', 'webcal:'].includes(parsed.protocol)) {
    return { ok: false, error: 'URL must start with https:// or webcal://' };
  }
  return { ok: true };
}

function toFetchableUrl(url: string): string {
  // webcal:// is just https:// under a different scheme name
  return url.replace(/^webcal:\/\//i, 'https://');
}

/**
 * Fetches and parses an iCal feed, returning busy time blocks for the
 * next MAX_LOOKAHEAD_DAYS. Recurring events are expanded by node-ical.
 */
export async function fetchIcalBusyBlocks(feedUrl: string): Promise<IcalSyncResult> {
  const validation = validateIcalUrl(feedUrl);
  if (!validation.ok) return { ok: false, error: validation.error };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(toFetchableUrl(feedUrl), {
      signal: controller.signal,
      headers: { 'User-Agent': 'RepairAIPro-CalendarSync/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, error: `Calendar feed returned ${res.status}. Double-check the link is public.` };
    }

    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      return { ok: false, error: 'That link doesn\'t look like a calendar feed (.ics file).' };
    }

    const parsed = ical.parseICS(text);
    const now = Date.now();
    const horizon = now + MAX_LOOKAHEAD_DAYS * 24 * 3600 * 1000;

    const busyBlocks: BusyBlock[] = [];

    for (const key in parsed) {
      const event = parsed[key];
      if (!event || event.type !== 'VEVENT') continue;

      // node-ical expands recurring events onto event.start/event.end directly
      // when using parseICS with rrule present, but to be safe we also handle
      // the base event occurrence here.
      const start = event.start ? new Date(event.start).getTime() : null;
      const end = event.end ? new Date(event.end).getTime() : start;
      if (!start || !end) continue;
      if (end < now || start > horizon) continue;

      busyBlocks.push({ startMs: start, endMs: end });

      if (busyBlocks.length >= MAX_EVENTS) break;
    }

    busyBlocks.sort((a, b) => a.startMs - b.startMs);
    return { ok: true, busyBlocks };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Calendar feed took too long to respond.' };
    }
    return { ok: false, error: 'Could not read that calendar feed. Check the URL and try again.' };
  }
}
