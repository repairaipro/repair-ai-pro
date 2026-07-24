import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from '@/lib/notif';

const OFFER_TIMEOUT_MINUTES = 15;
const MAX_QUEUE_SIZE = 5;

/**
 * POST /api/jobs/[jobId]/instant-book
 *
 * Initiates Instant Book for a job. Homeowner calls this after posting.
 *
 * Flow:
 *  1. Validate job is eligible (status=triaged, price set, not already instant book)
 *  2. Run contractor matching → rank top 5 by score
 *  3. Write instantBook fields to job doc
 *  4. Notify contractor[0] — they have OFFER_TIMEOUT_MINUTES to respond
 *
 * Matching score (0–100):
 *   trade match:       required (filtered out if no match)
 *   availability:      required (must be 'available')
 *   rating (0-5):      × 20  = max 20 pts
 *   responseScore:     × 0.3 = max 30 pts
 *   subscription tier: pro=15, elite=20, free=0
 *   jobsCompleted:     min(jobs/10, 10) = max 10 pts (caps at 100 jobs)
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const userId = decoded.uid;
  const { jobId } = params;

  // ── Load job ──────────────────────────────────────────────────────────
  const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
  if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const job = jobSnap.data()!;
  if (job.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (job.instantBook)       return NextResponse.json({ error: 'Already instant book' }, { status: 409 });
  if (!['triaged', 'open'].includes(job.status)) {
    return NextResponse.json({ error: 'Job not accepting instant book' }, { status: 409 });
  }

  const price: number = job.instantBookPrice
    ?? job.estimatedCost?.typical
    ?? job.estimatedValue
    ?? null;

  if (!price) return NextResponse.json({ error: 'No price set — run AI estimate first' }, { status: 400 });

  const trade = job.trade ?? job.aiDetectedTrade;
  if (!trade) return NextResponse.json({ error: 'Trade not detected yet' }, { status: 400 });

  // ── Match contractors ─────────────────────────────────────────────────
  const contractorsSnap = await adminDb.collection('contractors')
    .where('availability', '==', 'available')
    .limit(100)
    .get();

  type ScoredContractor = { uid: string; score: number };
  const scored: ScoredContractor[] = [];

  for (const doc of contractorsSnap.docs) {
    const c = doc.data();
    // Must serve this trade
    const trades: string[] = c.trades ?? (c.trade ? [c.trade] : []);
    if (!trades.some(t => t.toLowerCase() === trade.toLowerCase())) continue;

    // Skip the homeowner themselves
    if (doc.id === userId) continue;

    let score = 0;
    // Rating (max 20)
    score += Math.min((c.avgRating ?? c.rating ?? 3.5) / 5, 1) * 20;
    // Response speed (max 30)
    score += Math.min((c.responseScore ?? 50) / 100, 1) * 30;
    // Subscription tier (max 20)
    if (c.subscriptionPlan === 'elite') score += 20;
    else if (c.subscriptionPlan === 'pro') score += 15;
    // Jobs completed (max 10)
    score += Math.min((c.jobsCompleted ?? 0) / 10, 1) * 10;
    // Location proximity bonus (max 20) — crude city match
    const jobCity = typeof job.location === 'object' ? job.location?.city : null;
    if (jobCity && c.city && c.city.toLowerCase().includes(jobCity.toLowerCase())) score += 20;
    else if (c.city && job.location && String(job.location).toLowerCase().includes(c.city.toLowerCase())) score += 10;

    scored.push({ uid: doc.id, score });
  }

  if (scored.length === 0) {
    return NextResponse.json({ error: 'No available contractors for this trade right now. Job posted to marketplace instead.' }, { status: 422 });
  }

  scored.sort((a, b) => b.score - a.score);
  const queue = scored.slice(0, MAX_QUEUE_SIZE).map(c => c.uid);

  // ── Write instant book fields ─────────────────────────────────────────
  const offeredAt = new Date();
  const expiresAt = new Date(offeredAt.getTime() + OFFER_TIMEOUT_MINUTES * 60_000);

  await adminDb.collection('jobs').doc(jobId).update({
    instantBook:          true,
    instantBookPrice:     price,
    instantBookQueue:     queue,
    instantBookCurrentIdx: 0,
    instantBookOfferedAt: offeredAt,
    instantBookExpiresAt: expiresAt,
    instantBookStatus:    'pending',
    updatedAt:            FieldValue.serverTimestamp(),
  });

  // ── Notify first contractor ───────────────────────────────────────────
  await notifyContractor(queue[0], jobId, job, price, expiresAt);

  return NextResponse.json({
    success:      true,
    queueSize:    queue.length,
    offeredTo:    queue[0],
    expiresAt:    expiresAt.toISOString(),
    price,
  });
}

async function notifyContractor(
  contractorId: string,
  jobId: string,
  job: Record<string, any>,
  price: number,
  expiresAt: Date
) {
  const trade = job.trade ?? job.aiDetectedTrade ?? 'General';
  const desc  = (job.description ?? '').slice(0, 80);

  await createNotification({ recipientId: contractorId,
    type:  'instant_book_offer',
    title: `⚡ Instant Book — $${price}`,
    body:  `${trade} job: "${desc}" — accept in ${Math.round((expiresAt.getTime() - Date.now()) / 60000)} min to claim it.`,
    jobId,
    href:  `/contractor-inbox`,
  });
}
