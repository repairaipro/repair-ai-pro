import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// GET /api/invoices — list all invoices for the authenticated contractor
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    // Fetch all jobs this contractor has claimed
    const jobsSnap = await adminDb
      .collection('jobs')
      .where('claimedBy', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(50)
      .get();

    if (jobsSnap.empty) {
      return NextResponse.json({ success: true, invoices: [], summary: { total: 0, paid: 0, pending: 0, draft: 0 } });
    }

    // Fetch latest invoice for each job in parallel
    const invoicePromises = jobsSnap.docs.map(async (jobDoc) => {
      const invoiceSnap = await adminDb
        .collection('jobs').doc(jobDoc.id)
        .collection('invoices')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (invoiceSnap.empty) return null;

      const inv = invoiceSnap.docs[0];
      const job = jobDoc.data();
      const invData = inv.data() as Record<string, any>;
      return {
        id: inv.id,
        jobId: jobDoc.id,
        jobDescription: job.description || '',
        ...invData,
        createdAt: invData.createdAt?.toDate?.()?.toISOString() || null,
        sentAt: invData.sentAt?.toDate?.()?.toISOString() || null,
        paidAt: invData.paidAt?.toDate?.()?.toISOString() || null,
      } as Record<string, any>;
    });

    const allInvoices = (await Promise.all(invoicePromises)).filter(Boolean) as Record<string, any>[];

    // Summary stats
    const summary = {
      total: allInvoices.reduce((s, i) => s + (i.total || 0), 0),
      paid: allInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
      pending: allInvoices.filter((i) => i.status === 'sent').reduce((s, i) => s + (i.total || 0), 0),
      draft: allInvoices.filter((i) => i.status === 'draft').length,
    };

    return NextResponse.json({ success: true, invoices: allInvoices, summary });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
