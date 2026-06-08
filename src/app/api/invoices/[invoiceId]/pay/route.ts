import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getStripe } from '@/lib/stripe';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params;

    // Find the invoice across jobs
    const jobsSnap = await adminDb
      .collection('jobs')
      .where('latestInvoiceId', '==', invoiceId)
      .limit(1)
      .get();

    let jobId: string;
    let invoiceRef: FirebaseFirestore.DocumentReference;

    if (!jobsSnap.empty) {
      jobId = jobsSnap.docs[0].id;
      invoiceRef = adminDb.collection('jobs').doc(jobId).collection('invoices').doc(invoiceId);
    } else {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceSnap.data()!;

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }
    if (invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Invoice has been cancelled' }, { status: 400 });
    }

    // Confirm the existing Stripe PaymentIntent
    const stripe = getStripe();

    if (!invoice.stripePaymentIntentId) {
      return NextResponse.json({ error: 'No payment intent found for this invoice' }, { status: 400 });
    }

    const body = await request.json() as {
      cardName: string;
      cardNumber: string;
      cardExpiry: string;
      cardCvc: string;
    };

    const [expMonth, expYear] = body.cardExpiry.split('/').map((s: string) => parseInt(s.trim(), 10));

    // Create a PaymentMethod from the raw card data
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: body.cardNumber,
        exp_month: expMonth,
        exp_year: expYear + 2000,
        cvc: body.cardCvc,
      },
      billing_details: {
        name: body.cardName,
      },
    });

    // Confirm the payment intent
    const confirmed = await stripe.paymentIntents.confirm(invoice.stripePaymentIntentId, {
      payment_method: paymentMethod.id,
    });

    if (confirmed.status === 'succeeded') {
      await invoiceRef.update({
        status: 'paid',
        paidAt: FieldValue.serverTimestamp(),
      });

      await adminDb.collection('jobs').doc(jobId).update({
        invoiceStatus: 'paid',
      });

      return NextResponse.json({ success: true, status: 'paid' });
    }

    if (confirmed.status === 'requires_action') {
      return NextResponse.json({
        success: false,
        requiresAction: true,
        clientSecret: confirmed.client_secret,
        error: '3D Secure authentication required. Please complete verification.',
      });
    }

    return NextResponse.json({ error: 'Payment could not be completed', status: confirmed.status }, { status: 400 });
  } catch (err: any) {
    console.error('Payment error:', err);
    const message = err?.raw?.message || err?.message || 'Payment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
