import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * POST /api/contractors/[contractorId]/working-hours
 * Body: { workingHours, bufferMinutes, defaultJobDurationMinutes, autoAcceptBookings }
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const { id: contractorId } = params;
  if (decoded.uid !== contractorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { workingHours, bufferMinutes, defaultJobDurationMinutes, autoAcceptBookings } = await req.json();

  if (!workingHours || typeof workingHours !== 'object') {
    return NextResponse.json({ error: 'workingHours required' }, { status: 400 });
  }
  for (const day of DAY_KEYS) {
    const d = workingHours[day];
    if (!d || typeof d.enabled !== 'boolean') {
      return NextResponse.json({ error: `Invalid config for ${day}` }, { status: 400 });
    }
    if (d.enabled && (!TIME_RE.test(d.start) || !TIME_RE.test(d.end))) {
      return NextResponse.json({ error: `Invalid time format for ${day}` }, { status: 400 });
    }
  }

  const buffer = Number(bufferMinutes);
  const duration = Number(defaultJobDurationMinutes);
  if (!Number.isFinite(buffer) || buffer < 0 || buffer > 240) {
    return NextResponse.json({ error: 'Invalid bufferMinutes' }, { status: 400 });
  }
  if (!Number.isFinite(duration) || duration < 15 || duration > 480) {
    return NextResponse.json({ error: 'Invalid defaultJobDurationMinutes' }, { status: 400 });
  }

  await adminDb.collection('contractors').doc(contractorId).update({
    workingHours,
    bufferMinutes: buffer,
    defaultJobDurationMinutes: duration,
    autoAcceptBookings: Boolean(autoAcceptBookings),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
