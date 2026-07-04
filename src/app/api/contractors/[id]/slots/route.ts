import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { generateAvailableSlots, groupSlotsByDay, DEFAULT_WORKING_HOURS, type BusyBlock } from '@/lib/availability';

/**
 * GET /api/contractors/[contractorId]/slots?durationMinutes=90
 *
 * Returns bookable time slots for the next 14 days, grouped by day.
 * Merges: working hours, native calendar day-blocks, and existing
 * accepted/proposed appointments across all of this contractor's jobs.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id: contractorId } = params;
  const url = new URL(req.url);
  const durationMinutes = Number(url.searchParams.get('durationMinutes')) || undefined;

  try {
    const contractorSnap = await adminDb.collection('contractors').doc(contractorId).get();
    if (!contractorSnap.exists) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }
    const contractor = contractorSnap.data()!;

    const workingHours = contractor.workingHours ?? DEFAULT_WORKING_HOURS;
    const bufferMinutes = contractor.bufferMinutes ?? 30;
    const jobDurationMinutes = durationMinutes ?? contractor.defaultJobDurationMinutes ?? 90;

    // Native calendar day blocks
    const blocks: Array<{ date: string; status: string }> = contractor.availabilityBlocks || [];
    const dayStatuses = new Map(blocks.map((b) => [b.date, b.status as 'available' | 'busy' | 'blocked']));

    // Existing appointments across all jobs this contractor is party to.
    // Jobs claimed by this contractor hold their appointment subcollections.
    const jobsSnap = await adminDb
      .collection('jobs')
      .where('claimedBy', '==', contractorId)
      .where('status', 'in', ['accepted', 'in_progress'])
      .get();

    const busyBlocks: BusyBlock[] = [];
    await Promise.all(
      jobsSnap.docs.map(async (jobDoc) => {
        const apptsSnap = await jobDoc.ref
          .collection('appointments')
          .where('status', 'in', ['proposed', 'accepted'])
          .get();
        apptsSnap.forEach((a) => {
          const data = a.data();
          const startMs = data.startAt?.toDate?.()?.getTime();
          const endMs = data.endAt?.toDate?.()?.getTime();
          if (startMs && endMs) busyBlocks.push({ startMs, endMs });
        });
      })
    );

    const slots = generateAvailableSlots({
      workingHours,
      dayStatuses,
      busyBlocks,
      jobDurationMinutes,
      bufferMinutes,
    });

    return NextResponse.json({
      grouped: groupSlotsByDay(slots),
      jobDurationMinutes,
      bufferMinutes,
    });
  } catch (err) {
    console.error('Slots fetch error:', err);
    return NextResponse.json({ error: 'Failed to compute availability' }, { status: 500 });
  }
}
