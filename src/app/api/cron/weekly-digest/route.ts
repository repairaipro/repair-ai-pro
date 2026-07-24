import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { sendWeeklyDigestEmail } from '@/lib/emailService';

/**
 * GET|POST /api/cron/weekly-digest
 *
 * Sends contractors a Monday-morning summary of last week's jobs + earnings.
 * Only sends to contractors who completed at least one job in the window
 * (no point emailing an empty digest) and who haven't opted out.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`
 */

const MAX_CONTRACTORS_PER_RUN = 200;

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  // Jobs confirmed/released in the last 7 days, grouped by contractor
  const jobsSnap = await adminDb
    .collection('jobs')
    .where('paymentStatus', '==', 'released')
    .where('paymentReleasedAt', '>=', weekAgo)
    .get();

  const byContractor = new Map<string, { count: number; earnings: number }>();
  jobsSnap.docs.forEach((doc) => {
    const job = doc.data();
    if (!job.claimedBy) return;
    const entry = byContractor.get(job.claimedBy) ?? { count: 0, earnings: 0 };
    entry.count += 1;
    entry.earnings += job.payoutAmount ?? 0;
    byContractor.set(job.claimedBy, entry);
  });

  let sent = 0;
  let skipped = 0;

  const contractorIds = Array.from(byContractor.keys()).slice(0, MAX_CONTRACTORS_PER_RUN);

  await Promise.all(
    contractorIds.map(async (contractorId) => {
      const stats = byContractor.get(contractorId)!;
      const contractorSnap = await adminDb.collection('contractors').doc(contractorId).get();
      const contractor = contractorSnap.data();

      if (!contractor) { skipped++; return; }
      if (contractor.emailPreferences?.emailDigest === false || contractor.emailPreferences?.emailUnsubscribeAll === true) {
        skipped++;
        return;
      }

      try {
        const authUser = await adminAuth.getUser(contractorId);
        if (!authUser.email) { skipped++; return; }

        const ok = await sendWeeklyDigestEmail(
          authUser.email,
          contractor.name ?? 'there',
          stats.count,
          Math.round(stats.earnings)
        );
        if (ok) sent++; else skipped++;
      } catch {
        skipped++;
      }
    })
  );

  return NextResponse.json({
    success: true,
    contractorsWithActivity: byContractor.size,
    sent,
    skipped,
  });
}

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(req: Request)  { return run(req); }
export async function POST(req: Request) { return run(req); }
