import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { generateInvoiceFromJobData, formatInvoiceNumber } from '@/lib/invoiceGenerator';
import { getStripe } from '@/lib/stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { sendInvoiceEmail, APP_URL } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobSnap.data()!;

    if (job.claimedBy !== userId) {
      return NextResponse.json(
        { error: 'Only the assigned contractor can generate invoices' },
        { status: 403 }
      );
    }

    const body = await request.json() as {
      timeSpentHours?: number;
      additionalNotes?: string;
      taxRate?: number;
    };

    // Gather job context in parallel
    const [contractorSnap, analysisSnap, completionSnap, questionnaireSnap] =
      await Promise.all([
        adminDb.collection('contractors').doc(userId).get(),
        adminDb.collection('jobs').doc(jobId)
          .collection('photoAnalyses')
          .orderBy('analysedAt', 'desc')
          .limit(1)
          .get(),
        adminDb.collection('jobs').doc(jobId)
          .collection('completionPhotos')
          .orderBy('uploadedAt', 'desc')
          .limit(6)
          .get(),
        adminDb.collection('jobs').doc(jobId)
          .collection('questionnaireAnswers')
          .orderBy('answeredAt', 'desc')
          .limit(1)
          .get(),
      ]);

    const contractor = contractorSnap.data() || {};
    const analysis = analysisSnap.empty ? null : analysisSnap.docs[0].data();
    const completionPhotos = completionSnap.docs.map((d) => d.data().url as string);
    const questionnaire = questionnaireSnap.empty
      ? {}
      : ((questionnaireSnap.docs[0].data().answers || {}) as Record<string, string>);

    const beforePhotos: string[] = analysis?.photoUrls || [];
    const defects: Array<{ defectType: string; description: string }> =
      analysis?.defects || [];

    const invoiceData = await generateInvoiceFromJobData({
      jobDescription: job.description || '',
      trade: job.aiDetectedTrade || job.trade || 'General',
      zipCode: job.location?.zipCode || job.location?.zip,
      completionPhotoUrls: completionPhotos,
      beforePhotoUrls: beforePhotos,
      defects,
      questionnaire,
      productsUsed: [],
      contractorName: contractor.name || 'Contractor',
      timeSpentHours: body.timeSpentHours,
    });

    if (body.taxRate !== undefined) {
      invoiceData.taxRate = body.taxRate;
      invoiceData.taxAmount =
        Math.round(invoiceData.subtotal * invoiceData.taxRate * 100) / 100;
      invoiceData.total = invoiceData.subtotal + invoiceData.taxAmount;
    }

    if (body.additionalNotes) {
      invoiceData.notes = [invoiceData.notes, body.additionalNotes]
        .filter(Boolean)
        .join('\n');
    }

    // Create Stripe payment intent
    let stripePaymentIntentId: string | null = null;
    try {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(invoiceData.total * 100),
        currency: 'usd',
        metadata: {
          jobId,
          contractorId: userId,
          homeownerId: job.userId || '',
          type: 'invoice_payment',
        },
        description: `Invoice for ${job.description || 'repair work'} - Job #${jobId.slice(-6)}`,
      });
      stripePaymentIntentId = intent.id;
    } catch (stripeErr) {
      console.error('Stripe intent creation failed:', stripeErr);
    }

    const invoiceRef = adminDb.collection('jobs').doc(jobId).collection('invoices').doc();
    const invoiceNumber = formatInvoiceNumber(invoiceRef.id);

    await invoiceRef.set({
      invoiceNumber,
      contractorId: userId,
      homeownerId: job.userId || '',
      jobId,
      ...invoiceData,
      stripePaymentIntentId,
      status: 'draft',
      createdAt: FieldValue.serverTimestamp(),
      sentAt: null,
      paidAt: null,
      contractorInfo: {
        name: contractor.name || 'Contractor',
        email: contractor.email || '',
        phone: contractor.phone || '',
        trade: contractor.trade || job.trade || '',
      },
      homeownerInfo: {
        address:
          typeof job.location === 'object' ? job.location?.address || '' : '',
      },
    });

    await adminDb.collection('jobs').doc(jobId).update({
      latestInvoiceId: invoiceRef.id,
      latestInvoiceNumber: invoiceNumber,
      invoiceStatus: 'draft',
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoiceRef.id,
      invoiceNumber,
      invoice: invoiceData,
      stripePaymentIntentId,
    });
  } catch (err) {
    console.error('Invoice generation error:', err);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobSnap.data()!;

    if (job.userId !== userId && job.claimedBy !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const invoicesSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('invoices')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (invoicesSnap.empty) {
      return NextResponse.json({ success: true, invoice: null });
    }

    const doc = invoicesSnap.docs[0];
    return NextResponse.json({ success: true, invoice: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Error fetching invoice:', err);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    const body = await request.json() as {
      invoiceId: string;
      action: 'send' | 'mark_paid' | 'cancel';
      lineItems?: any[];
    };

    const invoiceRef = adminDb
      .collection('jobs').doc(jobId)
      .collection('invoices').doc(body.invoiceId);

    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoiceSnap.data()!;
    if (invoice.contractorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updates: Record<string, any> = {};

    if (body.action === 'send') {
      updates.status = 'sent';
      updates.sentAt = FieldValue.serverTimestamp();

      // Email homeowner
      try {
        const homeownerRecord = await adminAuth.getUser(invoice.homeownerId);
        if (homeownerRecord.email) {
          await sendInvoiceEmail(homeownerRecord.email, {
            contractorName: invoice.contractorInfo?.name || 'Your contractor',
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            jobDescription: invoice.jobSummary || '',
            payUrl: `${APP_URL}/pay/${body.invoiceId}`,
          });
        }
      } catch (emailErr) {
        console.error('Invoice email failed (non-fatal):', emailErr);
      }
    } else if (body.action === 'mark_paid') {
      updates.status = 'paid';
      updates.paidAt = FieldValue.serverTimestamp();
      await adminDb.collection('jobs').doc(jobId).update({ invoiceStatus: 'paid' });
    } else if (body.action === 'cancel') {
      updates.status = 'cancelled';
    }

    if (body.lineItems && invoice.status === 'draft') {
      const labor = body.lineItems.filter((i: any) => i.category === 'labor');
      const parts = body.lineItems.filter((i: any) => i.category !== 'labor');
      updates.lineItems = body.lineItems;
      updates.laborSubtotal = labor.reduce((s: number, i: any) => s + i.total, 0);
      updates.partsSubtotal = parts.reduce((s: number, i: any) => s + i.total, 0);
      updates.subtotal = updates.laborSubtotal + updates.partsSubtotal;
      updates.taxAmount =
        Math.round(updates.subtotal * (invoice.taxRate || 0) * 100) / 100;
      updates.total = updates.subtotal + updates.taxAmount;
    }

    await invoiceRef.update(updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Invoice update error:', err);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
