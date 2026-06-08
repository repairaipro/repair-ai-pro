import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { getStripe } from '@/lib/stripe';
import { FieldValue } from 'firebase-admin/firestore';

// PATCH — pause or cancel a maintenance plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    const planRef = adminDb.collection('maintenancePlans').doc(planId);
    const planSnap = await planRef.get();
    if (!planSnap.exists) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const plan = planSnap.data()!;
    if (plan.homeownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json() as { action: 'pause' | 'resume' | 'cancel' };
    const stripe = getStripe();

    if (body.action === 'pause') {
      await stripe.subscriptions.update(plan.stripeSubscriptionId, {
        pause_collection: { behavior: 'mark_uncollectible' },
      });
      await planRef.update({ status: 'paused', updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, message: 'Plan paused' });
    }

    if (body.action === 'resume') {
      await stripe.subscriptions.update(plan.stripeSubscriptionId, {
        pause_collection: '',
      } as any);
      await planRef.update({ status: 'active', updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, message: 'Plan resumed' });
    }

    if (body.action === 'cancel') {
      await stripe.subscriptions.cancel(plan.stripeSubscriptionId);
      await planRef.update({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true, message: 'Plan cancelled' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Maintenance plan update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update plan' }, { status: 500 });
  }
}

// GET — single plan detail with job history
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    const planSnap = await adminDb.collection('maintenancePlans').doc(planId).get();
    if (!planSnap.exists) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const plan = planSnap.data()!;
    if (plan.homeownerId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get jobs created from this plan
    const jobsSnap = await adminDb
      .collection('jobs')
      .where('maintenancePlanId', '==', planId)
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get();

    const jobs = jobsSnap.docs.map((d) => ({
      id: d.id,
      status: d.data().status,
      description: d.data().description,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      plan: {
        id: planSnap.id,
        ...plan,
        createdAt: plan.createdAt?.toDate?.()?.toISOString() || null,
        nextServiceDate: plan.nextServiceDate?.toDate?.()?.toISOString() || null,
        lastServiceDate: plan.lastServiceDate?.toDate?.()?.toISOString() || null,
      },
      jobs,
    });
  } catch (err) {
    console.error('Error fetching plan:', err);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}
