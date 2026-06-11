import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getStripe } from '@/lib/stripe';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/invoices/[invoiceId]/pay
 *
 * Payment is confirmed CLIENT-SIDE via Stripe Elements (PCI-compliant —
 * raw card data never touches our server). This endpoint verifies the
 * PaymentIntent actually succeeded and belongs to this invoice, then
 * marks the invoice paid.
 *
 * Body: { paymentIntentId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;

    const body = await request.json() as { paymentIntentId?: string };
    if (!body.paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    // Find the invoice across jobs
    const jobsSnap = await adminDb
      .collection('jobs')
      .where('latestInvoiceId', '==', invoiceId)
      .limit(1)
      .get();

    if (jobsSnap.empty) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const jobId = jobsSnap.docs[0].id;
    const invoiceRef = adminDb.collection('jobs').doc(jobId).collection('invoices').doc(invoiceId);

    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceSnap.data()!;

    if (invoice.status === 'paid') {
      return NextResponse.json({ success: true, status: 'paid', alreadyPaid: true });
    }
    if (invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Invoice has been cancelled' }, { status: 400 });
    }

    // The confirmed intent must be the one created for this invoice
    if (!invoice.stripePaymentIntentId || invoice.stripePaymentIntentId !== body.paymentIntentId) {
      return NextResponse.json({ error: 'Payment does not match this invoice' }, { status: 403 });
    }

    // Verify with Stripe that the payment actually succeeded
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);

    if (intent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not confirmed (status: ${intent.status})` },
        { status: 402 }
      );
    }

    await invoiceRef.update({
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection('jobs').doc(jobId).update({
      invoiceStatus: 'paid',
    });

    return NextResponse.json({ success: true, status: 'paid' });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    const message = err?.raw?.message || err?.message || 'Payment verification failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
