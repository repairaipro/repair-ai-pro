import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { fetchIcalBusyBlocks } from '@/lib/icalSync';

/**
 * POST /api/contractors/[id]/ical-connect
 * Body: { feedUrl: string }
 *
 * Validates the feed is reachable and parseable, then saves it plus a
 * fresh cache of busy blocks. The slots API reads the cache directly
 * (fast); a cron job refreshes it periodically in the background.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const contractorId = params.id;
  if (decoded.uid !== contractorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { feedUrl } = await req.json();
  if (!feedUrl || typeof feedUrl !== 'string') {
    return NextResponse.json({ error: 'feedUrl required' }, { status: 400 });
  }

  const result = await fetchIcalBusyBlocks(feedUrl);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  await adminDb.collection('contractors').doc(contractorId).update({
    icalFeedUrl: feedUrl,
    icalBusyBlocks: result.busyBlocks,
    icalLastSyncedAt: FieldValue.serverTimestamp(),
    icalSyncStatus: 'ok',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true, eventsFound: result.busyBlocks?.length ?? 0 });
}

/**
 * DELETE /api/contractors/[id]/ical-connect
 * Disconnects the calendar feed.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const contractorId = params.id;
  if (decoded.uid !== contractorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await adminDb.collection('contractors').doc(contractorId).update({
    icalFeedUrl: FieldValue.delete(),
    icalBusyBlocks: FieldValue.delete(),
    icalLastSyncedAt: FieldValue.delete(),
    icalSyncStatus: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
