import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const uid = decoded.uid;

    const { jobId } = params;
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const job = jobSnap.data()!;
    if (job.userId !== uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Get all invitations for this job
    const invitesSnap = await adminDb
      .collection('jobs')
      .doc(jobId)
      .collection('invitations')
      .orderBy('score', 'desc')
      .limit(20)
      .get();

    const invitations = await Promise.all(
      invitesSnap.docs.map(async (d) => {
        const inv = d.data();
        // Fetch contractor's public name, trade, rating
        let contractorName = 'Contractor';
        let contractorTrade = '';
        let contractorRating = null;
        let contractorPhotoUrl = null;
        try {
          const cSnap = await adminDb.collection('contractors').doc(inv.contractorId).get();
          if (cSnap.exists) {
            const c = cSnap.data()!;
            contractorName = c.name || 'Contractor';
            contractorTrade = c.trade || '';
            contractorRating = c.avgRating || c.rating || null;
            contractorPhotoUrl = c.photoUrl || null;
          }
        } catch { /* silently skip */ }

        return {
          contractorId: inv.contractorId,
          status: inv.status, // pending | accepted | declined
          score: inv.score || 0,
          matchReason: inv.matchReason || null,
          distanceMiles: inv.distanceMiles || null,
          wave: inv.wave || 'initial',
          invitedAt: inv.invitedAt?.toDate?.()?.toISOString() || null,
          contractorName,
          contractorTrade,
          contractorRating,
          contractorPhotoUrl,
        };
      })
    );

    const pending   = invitations.filter((i) => i.status === 'pending').length;
    const accepted  = invitations.filter((i) => i.status === 'accepted').length;
    const declined  = invitations.filter((i) => i.status === 'declined').length;

    return NextResponse.json({
      success: true,
      matchStatus: job.matchStatus || 'unknown',
      matchCount:  job.matchCount  || invitations.length,
      matchedAt:   job.matchedAt?.toDate?.()?.toISOString() || null,
      summary: { total: invitations.length, pending, accepted, declined },
      invitations,
    });
  } catch (err: any) {
    console.error('match-contractors error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch matches' }, { status: 500 });
  }
}
