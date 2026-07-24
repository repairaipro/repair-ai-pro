import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { createNotification } from '@/lib/notif';

/**
 * PATCH /api/jobs/[jobId]/appointments/[appointmentId]
 * Body: { action: "accept" | "decline" | "cancel" }
 *
 * Mirrors the Firestore rules exactly:
 *  - accept/decline: only the OTHER participant (not the proposer) on a "proposed" appointment
 *  - cancel: either participant, only on an "accepted" appointment
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { jobId: string; appointmentId: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token);
  const userId = decoded.uid;
  const { jobId, appointmentId } = params;
  const { action } = await req.json();

  if (!['accept', 'decline', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const jobRef = adminDb.collection('jobs').doc(jobId);
  const jobSnap = await jobRef.get();
  if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const job = jobSnap.data()!;

  const isOwner = job.userId === userId;
  const isContractor = job.claimedBy === userId;
  if (!isOwner && !isContractor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const apptRef = jobRef.collection('appointments').doc(appointmentId);
  const apptSnap = await apptRef.get();
  if (!apptSnap.exists) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  const appt = apptSnap.data()!;

  if ((action === 'accept' || action === 'decline') && appt.status !== 'proposed') {
    return NextResponse.json({ error: 'Appointment is no longer pending' }, { status: 409 });
  }
  if ((action === 'accept' || action === 'decline') && appt.createdBy === userId) {
    return NextResponse.json({ error: 'You cannot respond to your own proposal' }, { status: 403 });
  }
  if (action === 'cancel' && appt.status !== 'accepted') {
    return NextResponse.json({ error: 'Only confirmed appointments can be cancelled' }, { status: 409 });
  }

  const newStatus = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
  await apptRef.update({ status: newStatus });

  const recipientId = userId === job.userId ? job.claimedBy : job.userId;
  const dateLabel = appt.startAt?.toDate?.()?.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) ?? '';

  const titles: Record<string, string> = {
    accepted: '✅ Appointment confirmed',
    declined: '❌ Appointment declined',
    cancelled: '🚫 Appointment cancelled',
  };
  const bodies: Record<string, string> = {
    accepted: `Your appointment for ${dateLabel} is confirmed.`,
    declined: `The proposed time (${dateLabel}) was declined. Please propose another.`,
    cancelled: `The appointment for ${dateLabel} was cancelled.`,
  };

  await createNotification({
    recipientId,
    type: newStatus === 'accepted' ? 'job_accepted' : 'contractor_invited',
    title: titles[newStatus],
    body: bodies[newStatus],
    jobId,
    href: `/jobs/${jobId}`,
  });

  return NextResponse.json({ success: true, status: newStatus });
}
