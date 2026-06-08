import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const uid = decoded.uid;

    const url = new URL(request.url);
    const trade  = url.searchParams.get('trade')  || null;
    const status = url.searchParams.get('status') || null; // confirmed|completed|cancelled|disputed

    let query = adminDb
      .collection('jobs')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(100);

    const snap = await query.get();

    // Enrich each job with contractor info
    const jobs = await Promise.all(
      snap.docs.map(async (d) => {
        const j = d.data();

        // Apply client-side filters (Firestore inequality on multiple fields needs indexes)
        if (trade && j.trade?.toLowerCase() !== trade.toLowerCase()) return null;
        if (status && j.status !== status) return null;

        let contractorName: string | null = null;
        let contractorTrade: string | null = null;
        let contractorPhoto: string | null = null;
        let contractorRating: number | null = null;

        if (j.claimedBy) {
          try {
            const cSnap = await adminDb.collection('contractors').doc(j.claimedBy).get();
            if (cSnap.exists) {
              const c = cSnap.data()!;
              contractorName  = c.name   || null;
              contractorTrade = c.trade  || null;
              contractorPhoto = c.photoUrl || null;
              contractorRating = c.avgRating || c.rating || null;
            }
          } catch { /* skip */ }
        }

        // Milestone summary
        let milestonesTotal = 0;
        let milestonesReleased = 0;
        try {
          const mSnap = await adminDb
            .collection('jobs').doc(d.id)
            .collection('milestones')
            .get();
          mSnap.docs.forEach((m) => {
            const ms = m.data();
            milestonesTotal++;
            if (ms.status === 'released' || ms.status === 'approved') milestonesReleased++;
          });
        } catch { /* skip */ }

        return {
          id: d.id,
          description: j.description || '',
          trade: j.trade || j.aiDetectedTrade || 'general',
          status: j.status,
          paymentStatus: j.paymentStatus || null,
          paymentAmountUsd: j.paymentAmountUsd || 0,
          isMaintenanceJob: j.isMaintenanceJob || false,
          maintenancePlanTitle: j.maintenancePlanTitle || null,
          location: typeof j.location === 'string'
            ? j.location
            : j.location?.city
              ? `${j.location.city}${j.location.state ? `, ${j.location.state}` : ''}`
              : null,
          createdAt: j.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: j.updatedAt?.toDate?.()?.toISOString() || null,
          contractor: j.claimedBy ? {
            id: j.claimedBy,
            name: contractorName,
            trade: contractorTrade,
            photoUrl: contractorPhoto,
            rating: contractorRating,
          } : null,
          milestones: { total: milestonesTotal, released: milestonesReleased },
          hasInvoice: !!j.latestInvoiceId,
          invoiceId: j.latestInvoiceId || null,
          hasDispute: j.status === 'disputed',
          aiDetectedTrade: j.aiDetectedTrade || null,
          aiSummary: j.aiSummary || null,
        };
      })
    );

    const filtered = jobs.filter(Boolean) as NonNullable<typeof jobs[0]>[];

    // Summary stats
    const paidJobs = filtered.filter(
      (j) => j.status === 'confirmed' && j.paymentAmountUsd > 0
    );
    const totalSpent    = paidJobs.reduce((s, j) => s + j.paymentAmountUsd, 0);
    const tradeBreakdown: Record<string, number> = {};
    for (const j of paidJobs) {
      const t = j.trade || 'general';
      tradeBreakdown[t] = (tradeBreakdown[t] || 0) + j.paymentAmountUsd;
    }

    // Distinct trades for filter dropdown
    const allTrades = [...new Set(filtered.map((j) => j.trade).filter(Boolean))];

    return NextResponse.json({
      success: true,
      jobs: filtered,
      summary: {
        total: filtered.length,
        confirmed: filtered.filter((j) => j.status === 'confirmed').length,
        inProgress: filtered.filter((j) => ['accepted', 'in_progress'].includes(j.status)).length,
        cancelled: filtered.filter((j) => j.status === 'cancelled').length,
        totalSpent,
        tradeBreakdown,
      },
      allTrades,
    });
  } catch (err: any) {
    console.error('History fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
