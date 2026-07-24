import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getStripe } from '@/lib/stripe';
import { FieldValue } from 'firebase-admin/firestore';

// PATCH — contractor marks milestone complete, OR homeowner approves/disputes
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string; milestoneId: string } }
) {
  try {
    const { jobId, milestoneId } = params;
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

    const milestoneRef = adminDb
      .collection('jobs').doc(jobId)
      .collection('milestones').doc(milestoneId);

    const milestoneSnap = await milestoneRef.get();
    if (!milestoneSnap.exists) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    const milestone = milestoneSnap.data()!;

    const body = await request.json() as {
      action: 'mark_complete' | 'approve' | 'dispute';
      notes?: string;
    };

    // Contractor marks their work done on this milestone
    if (body.action === 'mark_complete') {
      if (job.claimedBy !== userId) {
        return NextResponse.json({ error: 'Only the contractor can mark milestones complete' }, { status: 403 });
      }
      if (!['pending', 'in_progress', 'disputed'].includes(milestone.status)) {
        return NextResponse.json({ error: 'Milestone cannot be marked complete in its current state' }, { status: 400 });
      }

      await milestoneRef.update({
        status: 'awaiting_approval',
        completedAt: FieldValue.serverTimestamp(),
        contractorNotes: body.notes || '',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: 'Milestone submitted for homeowner approval' });
    }

    // Homeowner approves → release payment for this milestone
    if (body.action === 'approve') {
      if (job.userId !== userId) {
        return NextResponse.json({ error: 'Only the homeowner can approve milestones' }, { status: 403 });
      }
      if (milestone.status !== 'awaiting_approval') {
        return NextResponse.json({ error: 'Milestone is not awaiting approval' }, { status: 400 });
      }

      // Check if milestone plan was approved
      if (job.milestonePlanStatus !== 'approved') {
        return NextResponse.json({ error: 'Milestone plan must be approved before releasing payments' }, { status: 400 });
      }

      const stripe = getStripe();
      let stripeTransferId: string | null = null;
      let payoutAmount = 0;

      // Ensure funds are captured (only needs to happen once; subsequent milestones skip)
      if (job.paymentIntentId && !['held', 'released'].includes(job.paymentStatus)) {
        try {
          await stripe.paymentIntents.capture(job.paymentIntentId);
          await adminDb.collection('jobs').doc(jobId).update({
            paymentStatus: 'held',
            paymentHeldAt: FieldValue.serverTimestamp(),
          });
        } catch (captureErr: any) {
          if (!captureErr.message?.includes('already captured')) {
            console.error('Capture error:', captureErr);
          }
        }
      }

      // Transfer milestone amount to contractor
      const contractorSnap = await adminDb.collection('contractors').doc(job.claimedBy).get();
      const contractor = contractorSnap.data();

      if (contractor?.stripeConnectAccountId && contractor?.stripeConnectVerified) {
        const platformFeePct = parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENT || '12', 10);
        const contractorFeePct = 100 - platformFeePct;
        payoutAmount = Math.round(milestone.amount * contractorFeePct) / 100;

        const transfer = await stripe.transfers.create({
          amount: Math.round(milestone.amount * 100 * contractorFeePct / 100),
          currency: 'usd',
          destination: contractor.stripeConnectAccountId,
          description: `Milestone "${milestone.title}" release — Job ${jobId}`,
          metadata: {
            jobId,
            milestoneId,
            contractorUid: job.claimedBy,
            milestoneTitle: milestone.title,
            platformFeePercent: platformFeePct,
          },
        });

        stripeTransferId = transfer.id;
      }

      await milestoneRef.update({
        status: 'released',
        approvedAt: FieldValue.serverTimestamp(),
        homeownerNotes: body.notes || '',
        stripeTransferId,
        payoutAmount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update job aggregate counts
      const allMilestonesSnap = await adminDb
        .collection('jobs').doc(jobId)
        .collection('milestones')
        .get();

      const allMilestones = allMilestonesSnap.docs.map((d) => d.data());
      const releasedCount = allMilestones.filter((m) => m.status === 'released').length + 1;
      const allReleased = releasedCount >= allMilestones.length;

      await adminDb.collection('jobs').doc(jobId).update({
        milestonesReleased: releasedCount,
        ...(allReleased ? {
          status:             'confirmed',
          milestoneAllReleased: true,
          paymentStatus:      'released',
          paymentReleasedAt:  FieldValue.serverTimestamp(),
        } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: 'Milestone approved and payment released',
        transferId: stripeTransferId,
        payoutAmount,
        jobComplete: allReleased,
      });
    }

    // Homeowner disputes a milestone
    if (body.action === 'dispute') {
      if (job.userId !== userId) {
        return NextResponse.json({ error: 'Only the homeowner can dispute milestones' }, { status: 403 });
      }
      if (milestone.status !== 'awaiting_approval') {
        return NextResponse.json({ error: 'Can only dispute milestones awaiting approval' }, { status: 400 });
      }

      await milestoneRef.update({
        status: 'disputed',
        disputedAt: FieldValue.serverTimestamp(),
        homeownerNotes: body.notes || '',
        updatedAt: FieldValue.serverTimestamp(),
      });

      await adminDb.collection('jobs').doc(jobId).update({
        hasDisputedMilestone: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: 'Milestone disputed — contractor has been notified' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Milestone update error:', err);
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
  }
}
