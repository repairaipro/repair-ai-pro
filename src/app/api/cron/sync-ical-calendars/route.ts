import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchIcalBusyBlocks } from '@/lib/icalSync';

/**
 * GET|POST /api/cron/sync-ical-calendars
 *
 * Refreshes cached busy blocks for every contractor with a connected
 * iCal feed. Runs on a schedule (see vercel.json) so the customer-facing
 * slots API always reads from a fresh-ish cache instead of fetching the
 * feed live on every request.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`
 */

const MAX_PER_RUN = 100;

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snap = await adminDb
    .collection('contractors')
    .where('icalFeedUrl', '!=', null)
    .limit(MAX_PER_RUN)
    .get();

  let synced = 0;
  let failed = 0;

  await Promise.all(
    snap.docs.map(async (doc) => {
      const feedUrl = doc.data().icalFeedUrl;
      if (!feedUrl) return;

      const result = await fetchIcalBusyBlocks(feedUrl);
      if (result.ok) {
        await doc.ref.update({
          icalBusyBlocks: result.busyBlocks,
          icalLastSyncedAt: FieldValue.serverTimestamp(),
          icalSyncStatus: 'ok',
        });
        synced++;
      } else {
        // Keep the last-known-good cache; just flag the sync as failing so
        // we could surface a "reconnect your calendar" prompt in the UI.
        await doc.ref.update({
          icalSyncStatus: 'error',
          icalLastSyncError: result.error ?? 'Unknown error',
        });
        failed++;
      }
    })
  );

  return NextResponse.json({ success: true, scanned: snap.size, synced, failed });
}

export async function GET(req: Request)  { return run(req); }
export async function POST(req: Request) { return run(req); }
