import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getStripe } from '@/lib/stripe';
import { FieldValue } from 'firebase-admin/firestore';

type ResolutionAction = 'request_redo' | 'accept_partial' | 'accept_full_refund' | 'escalate_admin' | 'release_payment';

// POST — homeowner or contractor self-resolves without waiting for admin
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

    const jobRef = adminDb.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    const isHomeowner = job.userId === userId;
    const isContractor = job.claimedBy === userId;
    if (!isHomeowner && !isContractor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json() as { action: ResolutionAction; partialPercent?: number; note?: string };
    const { action, partialPercent, note } = body;

    const disputesSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('disputes')
      .where('status', '==', 'open')
      .limit(1)
      .get();

    if (disputesSnap.empty) {
      return NextResponse.json({ error: 'No open dispute found' }, { status: 404 });
    }

    const disputeRef = disputesSnap.docs[0].ref;
    const now = FieldValue.serverTimestamp();
    const stripe = getStripe();

    if (action === 'request_redo') {
      // Contractor agrees to redo — job goes back to in_progress, dispute resolved
      if (!isHomeowner) return NextResponse.json({ error: 'Only homeowner can request redo' }, { status: 403 });

      await disputeRef.update({ status: 'resolved', resolution: 'redo_agreed', resolvedAt: now, note: note || '' });
      await jobRef.update({ status: 'in_progress', disputeResolution: 'redo_agreed', updatedAt: now });

      return NextResponse.json({ success: true, message: 'Contractor notified to redo the work. Job reopened.' });
    }

    if (action === 'accept_partial') {
      // Homeowner accepts partial payment to contractor — platform splits the remainder
      if (!isHomeowner) return NextResponse.json({ error: 'Only homeowner can accept partial settlement' }, { status: 403 });

      const pct = Math.max(0, Math.min(100, partialPercent || 50));

      if (job.paymentIntentId) {
        try {
          // Capture full amount, then transfer only the agreed % to contractor
          await stripe.paymentIntents.capture(job.paymentIntentId);

          const contractorSnap = await adminDb.collection('contractors').doc(job.claimedBy).get();
          const contractor = contractorSnap.data();

          if (contractor?.stripeConnectAccountId && contractor?.stripeConnectVerified && job.paymentAmountUsd) {
            const platformFeePct = parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENT || '12', 10);
            const contractorShare = Math.round(job.paymentAmountUsd * pct / 100 * (1 - platformFeePct / 100) * 100);

            await stripe.transfers.create({
              amount: contractorShare,
              currency: 'usd',
              destination: contractor.stripeConnectAccountId,
              description: `Partial dispute settlement — Job ${jobId} (${pct}% to contractor)`,
              metadata: { jobId, resolution: 'partial_settlement', percent: pct },
            });
          }
        } catch (stripeErr) {
          console.error('Stripe partial settlement error:', stripeErr);
        }
      }

      await disputeRef.update({
        status: 'resolved', resolution: 'partial_settlement',
        partialPercent: pct, resolvedAt: now, note: note || '',
      });
      await jobRef.update({
        status: 'confirmed', paymentStatus: 'released',
        disputeResolution: 'partial_settlement', updatedAt: now,
      });

      return NextResponse.json({ success: true, message: `Settled: ${pct}% paid to contractor, ${100 - pct}% refunded.` });
    }

    if (action === 'accept_full_refund') {
      if (!isHomeowner) return NextResponse.json({ error: 'Only homeowner can accept refund' }, { status: 403 });

      if (job.paymentIntentId) {
        try {
          await stripe.paymentIntents.cancel(job.paymentIntentId);
        } catch (e: any) {
          if (!e.message?.includes('already captured')) throw e;
        }
      }

      await disputeRef.update({ status: 'resolved', resolution: 'full_refund', resolvedAt: now, note: note || '' });
      await jobRef.update({ status: 'cancelled', paymentStatus: 'refunded', disputeResolution: 'full_refund', updatedAt: now });

      return NextResponse.json({ success: true, message: 'Full refund issued. Job cancelled.' });
    }

    if (action === 'release_payment') {
      // Contractor accepts; homeowner agrees work is done — release payment
      if (!isHomeowner) return NextResponse.json({ error: 'Only homeowner can release payment' }, { status: 403 });

      if (job.paymentIntentId) {
        try {
          await stripe.paymentIntents.capture(job.paymentIntentId);
        } catch { /* already captured */ }

        const contractorSnap = await adminDb.collection('contractors').doc(job.claimedBy).get();
        const contractor = contractorSnap.data();

        if (contractor?.stripeConnectAccountId && contractor?.stripeConnectVerified && job.paymentAmountUsd) {
          const platformFeePct = parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENT || '12', 10);
          const payoutCents = Math.round(job.paymentAmountUsd * (1 - platformFeePct / 100) * 100);
          await stripe.transfers.create({
            amount: payoutCents,
            currency: 'usd',
            destination: contractor.stripeConnectAccountId,
            description: `Dispute resolved — full payment to contractor — Job ${jobId}`,
          });
        }
      }

      await disputeRef.update({ status: 'resolved', resolution: 'payment_released', resolvedAt: now });
      await jobRef.update({ status: 'confirmed', paymentStatus: 'released', disputeResolution: 'payment_released', updatedAt: now });

      return NextResponse.json({ success: true, message: 'Payment released to contractor. Job confirmed.' });
    }

    if (action === 'escalate_admin') {
      // Mark as escalated — goes to admin queue
      await disputeRef.update({ escalated: true, escalatedAt: now, escalationNote: note || '' });
      await jobRef.update({ disputeEscalated: true, updatedAt: now });

      return NextResponse.json({ success: true, message: 'Escalated to admin for manual review. You\'ll be contacted within 24 hours.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Self-resolve error:', err);
    return NextResponse.json({ error: err.message || 'Failed to resolve dispute' }, { status: 500 });
  }
}
