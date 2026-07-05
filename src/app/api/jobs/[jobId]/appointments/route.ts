import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from '@/lib/notif';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { fetchContractorBusyBlocks } from '@/lib/availability';

/**
 * GET /api/jobs/[jobId]/appointments
 * List appointments for a job (both participants can view).
 */
export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token);

  const jobSnap = await adminDb.collection('jobs').doc(params.jobId).get();
  if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const job = jobSnap.data()!;
  if (job.userId !== decoded.uid && job.claimedBy !== decoded.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apptsSnap = await jobSnap.ref
    .collection('appointments')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const appointments = apptsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    startAt: d.data().startAt?.toDate?.()?.toISOString(),
    endAt: d.data().endAt?.toDate?.()?.toISOString(),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString(),
  }));

  return NextResponse.json({ appointments });
}

/**
 * POST /api/jobs/[jobId]/appointments
 * Customer books a slot (proposed) — or contractor proposes a time.
 * Body: { startMs: number, endMs: number, timezone?: string }
 *
 * If the contractor has autoAcceptBookings enabled AND the requester is
 * the homeowner, the appointment is created directly as "accepted".
 */
export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const rl = rateLimit(req, `appt-create-${params.jobId}`, 10, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token);
  const userId = decoded.uid;
  const { jobId } = params;

  const { startMs, endMs, timezone } = await req.json();
  if (!startMs || !endMs || endMs <= startMs) {
    return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
  }

  const jobRef = adminDb.collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const job = jobSnap.data()!;

  const isOwner = job.userId === userId;
  const isContractor = job.claimedBy === userId;
  if (!isOwner && !isContractor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!job.claimedBy) {
    return NextResponse.json({ error: 'Job has no assigned contractor yet' }, { status: 409 });
  }

  // Prevent double-booking: check overlap against existing proposed/accepted
  // appointments for this contractor across ALL their jobs, via a single
  // collectionGroup query (uses a transaction-free read-then-write —
  // acceptable here since a genuine double-click race is rare and caught by the UI refresh).
  const existingBusyBlocks = await fetchContractorBusyBlocks(adminDb, job.claimedBy);
  const overlaps = existingBusyBlocks.some((b) => startMs < b.endMs && endMs > b.startMs);
  if (overlaps) {
    return NextResponse.json({ error: 'That time slot was just booked. Please pick another.' }, { status: 409 });
  }

  const contractorSnap = await adminDb.collection('contractors').doc(job.claimedBy).get();
  const autoAccept = isOwner && contractorSnap.data()?.autoAcceptBookings === true;

  const apptRef = jobRef.collection('appointments').doc();
  await apptRef.set({
    startAt: new Date(startMs),
    endAt: new Date(endMs),
    timezone: timezone ?? 'America/Chicago',
    status: autoAccept ? 'accepted' : 'proposed',
    createdBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    // Denormalized so the slots API can do one collectionGroup query
    // instead of fetching every one of this contractor's jobs and then
    // querying each job's appointments subcollection individually.
    // Written via Admin SDK only — not part of the client-write schema
    // in firestore.rules, so this never conflicts with rule validation.
    contractorId: job.claimedBy,
  });

  // Notify the other participant
  const recipientId = isOwner ? job.claimedBy : job.userId;
  const dateLabel = new Date(startMs).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  await createNotification({
    recipientId,
    type: autoAccept ? 'job_accepted' : 'contractor_invited',
    title: autoAccept ? '📅 Appointment confirmed' : '📅 New appointment request',
    body: autoAccept
      ? `Your appointment is confirmed for ${dateLabel}.`
      : `${isOwner ? 'The homeowner' : 'Your contractor'} proposed ${dateLabel}. Tap to confirm.`,
    jobId,
    href: `/jobs/${jobId}`,
  });

  return NextResponse.json({ success: true, appointmentId: apptRef.id, status: autoAccept ? 'accepted' : 'proposed' });
}
