import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/jobs/[jobId]/video-consultation
 *
 * Actions:
 *   request   — contractor requests a pre-bid video call
 *   approve   — homeowner approves and sets a scheduledAt time
 *   decline   — homeowner declines
 *   complete  — either party marks the call done
 *
 * GET  — fetch all consultations for a job
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId  = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    const isHomeowner  = job.userId === userId;
    const isContractor = job.claimedBy === userId || job.invitedContractors?.includes(userId);
    if (!isHomeowner && !isContractor) {
      return NextResponse.json({ error: 'Not a participant on this job' }, { status: 403 });
    }

    const body = await request.json() as {
      action: 'request' | 'approve' | 'decline' | 'complete';
      consultId?: string;
      proposedTimes?: string[];   // ISO strings — contractor proposes up to 3 slots
      scheduledAt?: string;       // homeowner picks one ISO string
      notes?: string;
    };

    const now = FieldValue.serverTimestamp();
    const consultRef = adminDb
      .collection('jobs').doc(jobId)
      .collection('videoConsultations');

    /* ── REQUEST ── contractor proposes time slots */
    if (body.action === 'request') {
      if (!isContractor) {
        return NextResponse.json({ error: 'Only a contractor can request a consultation' }, { status: 403 });
      }

      // Check job is in a biddable state
      const biddableStatuses = ['triaged', 'open', 'matched', 'accepted'];
      if (!biddableStatuses.includes(job.status)) {
        return NextResponse.json({ error: 'Job is not in a biddable state' }, { status: 400 });
      }

      // Limit to one pending request per contractor
      const existing = await consultRef
        .where('contractorId', '==', userId)
        .where('status', 'in', ['requested', 'scheduled'])
        .get();
      if (!existing.empty) {
        return NextResponse.json(
          { error: 'You already have a pending consultation request for this job' },
          { status: 400 }
        );
      }

      const doc = await consultRef.add({
        contractorId:  userId,
        homeownerId:   job.userId,
        status:        'requested',
        proposedTimes: body.proposedTimes ?? [],
        notes:         body.notes ?? '',
        requestedAt:   now,
        createdAt:     now,
      });

      // Notify homeowner (fire-and-forget)
      try {
        const { createNotification } = await import('@/lib/notif');
        await createNotification({
          recipientId: job.userId,
          type:        'video_consultation_requested',
          title:       'Video consultation requested',
          body:        'A contractor wants to do a quick video call before submitting their bid.',
          jobId,
          href:        `/jobs/${jobId}`,
        });
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, consultId: doc.id });
    }

    /* ── APPROVE ── homeowner picks a time */
    if (body.action === 'approve') {
      if (!isHomeowner) {
        return NextResponse.json({ error: 'Only the homeowner can approve a consultation' }, { status: 403 });
      }
      if (!body.consultId) {
        return NextResponse.json({ error: 'consultId is required' }, { status: 400 });
      }
      if (!body.scheduledAt) {
        return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
      }

      const doc = consultRef.doc(body.consultId);
      const snap = await doc.get();
      if (!snap.exists) return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
      if (snap.data()!.status !== 'requested') {
        return NextResponse.json({ error: 'Consultation is not in requested state' }, { status: 400 });
      }

      await doc.update({
        status:      'scheduled',
        scheduledAt: body.scheduledAt,
        approvedAt:  now,
        updatedAt:   now,
      });

      // Notify contractor
      try {
        const { createNotification } = await import('@/lib/notif');
        const consultData = snap.data()!;
        await createNotification({
          recipientId: consultData.contractorId,
          type:        'video_consultation_approved',
          title:       'Video consultation approved!',
          body:        `The homeowner approved your consultation for ${new Date(body.scheduledAt).toLocaleString()}.`,
          jobId,
          href:        `/jobs/${jobId}/video/${body.consultId}`,
        });
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true });
    }

    /* ── DECLINE ── homeowner declines */
    if (body.action === 'decline') {
      if (!isHomeowner) {
        return NextResponse.json({ error: 'Only the homeowner can decline a consultation' }, { status: 403 });
      }
      if (!body.consultId) {
        return NextResponse.json({ error: 'consultId is required' }, { status: 400 });
      }

      await consultRef.doc(body.consultId).update({
        status:    'declined',
        declinedAt: now,
        updatedAt:  now,
      });

      return NextResponse.json({ success: true });
    }

    /* ── COMPLETE ── either party ends the call */
    if (body.action === 'complete') {
      if (!body.consultId) {
        return NextResponse.json({ error: 'consultId is required' }, { status: 400 });
      }

      await consultRef.doc(body.consultId).update({
        status:      'completed',
        completedAt: now,
        updatedAt:   now,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Video consultation error:', err);
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId  = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    if (job.userId !== userId && job.claimedBy !== userId && !job.invitedContractors?.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const snap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('videoConsultations')
      .orderBy('createdAt', 'desc')
      .get();

    const consultations = snap.docs.map((d) => {
      const data = d.data();
      return {
        id:            d.id,
        contractorId:  data.contractorId,
        homeownerId:   data.homeownerId,
        status:        data.status,
        proposedTimes: data.proposedTimes ?? [],
        scheduledAt:   data.scheduledAt ?? null,
        notes:         data.notes ?? '',
        requestedAt:   data.requestedAt?.toDate?.()?.toISOString() ?? null,
        approvedAt:    data.approvedAt?.toDate?.()?.toISOString() ?? null,
        completedAt:   data.completedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ success: true, consultations });
  } catch (err) {
    console.error('Fetch consultations error:', err);
    return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 });
  }
}
