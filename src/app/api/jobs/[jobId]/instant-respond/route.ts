import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from '@/lib/notif';

const OFFER_TIMEOUT_MINUTES = 15;

/**
 * POST /api/jobs/[jobId]/instant-respond
 * Contractor accepts or declines an Instant Book offer.
 *
 * Body: { accept: boolean }
 *
 * Accept → job claimed, homeowner notified, job status = accepted
 * Decline (or expired) → try next contractor in queue
 * Queue exhausted → job falls back to regular marketplace bidding
 */
export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const contractorId = decoded.uid;
  const { jobId } = params;
  const { accept } = await req.json();

  // ── Transactional update ──────────────────────────────────────────────
  const jobRef = adminDb.collection('jobs').doc(jobId);

  return adminDb.runTransaction(async (tx) => {
    const jobSnap = await tx.get(jobRef);
    if (!jobSnap.exists) throw new Error('Job not found');

    const job = jobSnap.data()!;

    if (!job.instantBook || job.instantBookStatus !== 'pending') {
      return NextResponse.json({ error: 'No active instant book offer' }, { status: 409 });
    }

    const queue:   string[] = job.instantBookQueue ?? [];
    const idx:     number   = job.instantBookCurrentIdx ?? 0;

    // Validate this contractor is the current offer recipient
    if (queue[idx] !== contractorId) {
      return NextResponse.json({ error: 'This offer is not for you' }, { status: 403 });
    }

    // Check expiry
    const offeredAt: Date  = job.instantBookOfferedAt?.toDate?.() ?? new Date(0);
    const expiresAt        = new Date(offeredAt.getTime() + OFFER_TIMEOUT_MINUTES * 60_000);
    const isExpired        = Date.now() > expiresAt.getTime();

    if (accept && !isExpired) {
      // ── ACCEPT ──────────────────────────────────────────────────────
      tx.update(jobRef, {
        status:             'accepted',
        claimedBy:          contractorId,
        instantBookStatus:  'matched',
        paymentAmountUsd:   job.instantBookPrice,
        acceptedAt:         FieldValue.serverTimestamp(),
        updatedAt:          FieldValue.serverTimestamp(),
      });

      // Notify homeowner (after transaction)
      void notifyHomeowner(job, jobId, contractorId, job.instantBookPrice);

      return NextResponse.json({ success: true, result: 'accepted', price: job.instantBookPrice });
    } else {
      // ── DECLINE or EXPIRED — try next in queue ───────────────────
      const nextIdx = idx + 1;

      if (nextIdx >= queue.length) {
        // Queue exhausted → fall back to normal marketplace
        tx.update(jobRef, {
          instantBookStatus: 'fallback',
          updatedAt:         FieldValue.serverTimestamp(),
        });
        // Notify homeowner of fallback (after transaction)
        void notifyHomeownerFallback(job, jobId);
        return NextResponse.json({ success: true, result: 'fallback', message: 'No contractors available — job posted to marketplace' });
      }

      // Move to next contractor
      const nextContractorId = queue[nextIdx];
      const nextOfferedAt    = new Date();
      const nextExpiresAt    = new Date(nextOfferedAt.getTime() + OFFER_TIMEOUT_MINUTES * 60_000);

      tx.update(jobRef, {
        instantBookCurrentIdx: nextIdx,
        instantBookOfferedAt:  nextOfferedAt,
        instantBookExpiresAt:  nextExpiresAt,
        updatedAt:             FieldValue.serverTimestamp(),
      });

      // Notify next contractor (after transaction)
      void notifyNextContractor(nextContractorId, jobId, job, job.instantBookPrice, nextExpiresAt);

      return NextResponse.json({ success: true, result: 'passed', nextContractor: nextContractorId });
    }
  });
}

async function notifyHomeowner(
  job: Record<string, any>,
  jobId: string,
  contractorId: string,
  price: number
) {
  try {
    const contractorSnap = await adminDb.collection('contractors').doc(contractorId).get();
    const name = contractorSnap.data()?.name ?? 'A contractor';
    await createNotification({ recipientId: job.userId,
      type:  'job_accepted',
      title: `🎉 Instant Book confirmed!`,
      body:  `${name} accepted your job for $${price}. They'll be in touch shortly.`,
      jobId,
      href:  `/jobs/${jobId}`,
    });
  } catch (err) {
    console.error('Homeowner notify error:', err);
  }
}

async function notifyHomeownerFallback(job: Record<string, any>, jobId: string) {
  try {
    await createNotification({ recipientId: job.userId,
      type:  'contractor_invited',
      title: `No instant match found`,
      body:  `We couldn't find an available contractor right now. Your job is now open for bids — you'll hear back within the hour.`,
      jobId,
      href:  `/jobs/${jobId}`,
    });
  } catch (err) {
    console.error('Fallback notify error:', err);
  }
}

async function notifyNextContractor(
  contractorId: string,
  jobId: string,
  job: Record<string, any>,
  price: number,
  expiresAt: Date
) {
  try {
    const trade = job.trade ?? job.aiDetectedTrade ?? 'General';
    const desc  = (job.description ?? '').slice(0, 80);
    await createNotification({ recipientId: contractorId,
      type:  'instant_book_offer',
      title: `⚡ Instant Book — $${price}`,
      body:  `${trade}: "${desc}" — accept in ${Math.round((expiresAt.getTime() - Date.now()) / 60000)} min.`,
      jobId,
      href:  `/contractor-inbox`,
    });
  } catch (err) {
    console.error('Next contractor notify error:', err);
  }
}
