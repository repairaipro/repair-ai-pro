import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// Public GET — no auth, used by the /pay/[invoiceId] page
export async function GET(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;

    // Search across all jobs for this invoice ID
    // We store invoiceId on the job doc for fast lookup
    const jobsSnap = await adminDb
      .collection('jobs')
      .where('latestInvoiceId', '==', invoiceId)
      .limit(1)
      .get();

    if (jobsSnap.empty) {
      // Fallback: collection group query
      const invoiceSnap = await adminDb
        .collectionGroup('invoices')
        .where('__name__', '==', invoiceId)
        .limit(1)
        .get();

      if (invoiceSnap.empty) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const doc = invoiceSnap.docs[0];
      return NextResponse.json({
        success: true,
        invoice: {
          id: doc.id,
          ...sanitize(doc.data()),
        },
      });
    }

    const jobDoc = jobsSnap.docs[0];
    const invSnap = await adminDb
      .collection('jobs').doc(jobDoc.id)
      .collection('invoices').doc(invoiceId)
      .get();

    if (!invSnap.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invSnap.id,
        jobId: jobDoc.id,
        jobDescription: jobDoc.data().description || '',
        ...sanitize(invSnap.data()!),
      },
    });
  } catch (err) {
    console.error('Error fetching public invoice:', err);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

// Strip sensitive server fields before sending to public endpoint
function sanitize(data: Record<string, any>) {
  const safe = { ...data };
  delete safe.stripePaymentIntentId;
  delete safe.homeownerId;
  delete safe.contractorId;
  // Convert Firestore timestamps
  if (safe.createdAt?.toDate) safe.createdAt = safe.createdAt.toDate().toISOString();
  if (safe.sentAt?.toDate) safe.sentAt = safe.sentAt.toDate().toISOString();
  if (safe.paidAt?.toDate) safe.paidAt = safe.paidAt.toDate().toISOString();
  return safe;
}
