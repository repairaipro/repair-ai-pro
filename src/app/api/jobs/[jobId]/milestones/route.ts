import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// GET — list all milestones for a job (homeowner or contractor)
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

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
    const userId = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    if (job.userId !== userId && job.claimedBy !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const snap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('milestones')
      .orderBy('order', 'asc')
      .get();

    const milestones = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
        disputedAt: data.disputedAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ success: true, milestones, milestoneEnabled: job.milestoneEnabled || false });
  } catch (err) {
    console.error('Error fetching milestones:', err);
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}

// POST — contractor proposes milestones OR homeowner approves the milestone plan
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
    const userId = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    const body = await request.json() as {
      action: 'propose' | 'approve_plan';
      milestones?: Array<{
        title: string;
        description: string;
        percentage: number;
        amount: number;
      }>;
      totalAmount?: number;
    };

    if (body.action === 'propose') {
      // Only the contractor can propose milestones
      if (job.claimedBy !== userId) {
        return NextResponse.json({ error: 'Only the contractor can propose milestones' }, { status: 403 });
      }

      const milestones = body.milestones || [];
      if (milestones.length < 2 || milestones.length > 5) {
        return NextResponse.json({ error: 'Milestones must be between 2 and 5' }, { status: 400 });
      }

      const totalPct = milestones.reduce((s, m) => s + m.percentage, 0);
      if (Math.abs(totalPct - 100) > 1) {
        return NextResponse.json({ error: 'Milestone percentages must sum to 100' }, { status: 400 });
      }

      // Delete any existing milestones first (re-proposal)
      const existing = await adminDb.collection('jobs').doc(jobId).collection('milestones').get();
      const batch = adminDb.batch();
      existing.docs.forEach((d) => batch.delete(d.ref));

      milestones.forEach((m, i) => {
        const ref = adminDb.collection('jobs').doc(jobId).collection('milestones').doc();
        batch.set(ref, {
          jobId,
          title: m.title,
          description: m.description,
          percentage: m.percentage,
          amount: m.amount,
          order: i + 1,
          status: 'pending',
          contractorId: userId,
          homeownerId: job.userId,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      await adminDb.collection('jobs').doc(jobId).update({
        milestoneEnabled: true,
        milestonePlanStatus: 'proposed',
        milestoneTotalAmount: body.totalAmount || milestones.reduce((s, m) => s + m.amount, 0),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: 'Milestone plan proposed to homeowner' });
    }

    if (body.action === 'approve_plan') {
      // Only homeowner can approve the milestone plan
      if (job.userId !== userId) {
        return NextResponse.json({ error: 'Only the homeowner can approve the milestone plan' }, { status: 403 });
      }

      await adminDb.collection('jobs').doc(jobId).update({
        milestonePlanStatus: 'approved',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: 'Milestone plan approved' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Error creating milestones:', err);
    return NextResponse.json({ error: 'Failed to create milestones' }, { status: 500 });
  }
}
