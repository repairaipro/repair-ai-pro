import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getStripe } from '@/lib/stripe';
import { FieldValue } from 'firebase-admin/firestore';

const FREQUENCY_MAP: Record<string, { interval: 'month' | 'year'; interval_count: number; label: string }> = {
  monthly:     { interval: 'month', interval_count: 1,  label: 'Monthly' },
  quarterly:   { interval: 'month', interval_count: 3,  label: 'Quarterly' },
  semi_annual: { interval: 'month', interval_count: 6,  label: 'Every 6 Months' },
  annual:      { interval: 'year',  interval_count: 1,  label: 'Annual' },
};

// GET — list all maintenance plans for the authenticated homeowner
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    const snap = await adminDb
      .collection('maintenancePlans')
      .where('homeownerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const plans = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        nextServiceDate: data.nextServiceDate?.toDate?.()?.toISOString() || null,
        lastServiceDate: data.lastServiceDate?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ success: true, plans });
  } catch (err) {
    console.error('Error fetching maintenance plans:', err);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST — create a new maintenance plan + Stripe subscription
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;
    const userRecord = await adminAuth.getUser(userId);

    const body = await request.json() as {
      title: string;
      description: string;
      trade: string;
      frequency: string;
      pricePerService: number;
      address: string;
      preferredContractorId?: string;
      startDate?: string;
    };

    const { title, description, trade, frequency, pricePerService, address } = body;

    if (!title || !trade || !frequency || !pricePerService || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const freqConfig = FREQUENCY_MAP[frequency];
    if (!freqConfig) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    if (pricePerService < 25 || pricePerService > 10000) {
      return NextResponse.json({ error: 'Price must be between $25 and $10,000' }, { status: 400 });
    }

    const stripe = getStripe();

    // Get or create Stripe customer
    let customerId: string | undefined;
    const homeownerSnap = await adminDb.collection('homeowners').doc(userId).get();
    const homeowner = homeownerSnap.data() || {};

    if (homeowner.stripeCustomerId) {
      customerId = homeowner.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: userRecord.email || undefined,
        name: userRecord.displayName || undefined,
        metadata: { uid: userId },
      });
      customerId = customer.id;
      await adminDb.collection('homeowners').doc(userId).set(
        { stripeCustomerId: customerId, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    // Calculate next service date
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    // Start at least 7 days from now
    const minStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const nextServiceDate = startDate < minStart ? minStart : startDate;

    // Create Stripe subscription with trial until first service date
    const trialEnd = Math.floor(nextServiceDate.getTime() / 1000);

    const subscription = await (stripe.subscriptions.create as any)({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: title,
            metadata: { trade, type: 'maintenance_plan' },
          },
          recurring: {
            interval: freqConfig.interval,
            interval_count: freqConfig.interval_count,
          },
          unit_amount: Math.round(pricePerService * 100),
        },
      }],
      trial_end: trialEnd,
      metadata: {
        type: 'maintenance_plan',
        homeownerId: userId,
        trade,
        frequency,
        address,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Store plan in Firestore
    const planRef = adminDb.collection('maintenancePlans').doc();
    await planRef.set({
      homeownerId: userId,
      homeownerEmail: userRecord.email || '',
      title,
      description: description || '',
      trade,
      frequency,
      frequencyLabel: freqConfig.label,
      pricePerService,
      address,
      preferredContractorId: body.preferredContractorId || null,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: 'active',
      nextServiceDate: nextServiceDate,
      lastServiceDate: null,
      jobsCreated: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update subscription metadata with planId
    await stripe.subscriptions.update(subscription.id, {
      metadata: { ...subscription.metadata, planId: planRef.id },
    });

    const invoice = subscription.latest_invoice as any;
    const clientSecret = invoice?.payment_intent?.client_secret || null;

    return NextResponse.json({
      success: true,
      planId: planRef.id,
      subscriptionId: subscription.id,
      clientSecret,
      nextServiceDate: nextServiceDate.toISOString(),
    });
  } catch (err: any) {
    console.error('Error creating maintenance plan:', err);
    return NextResponse.json({ error: err.message || 'Failed to create plan' }, { status: 500 });
  }
}
