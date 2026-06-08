import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

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

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId = decoded.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobSnap.data()!;
    const isHomeowner = job.userId === userId;
    const isContractor = job.claimedBy === userId;

    if (!isHomeowner && !isContractor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json() as {
      productId: string;
      source: string;
      eventType: 'clicked' | 'viewed' | 'purchased';
    };

    await adminDb.collection('jobs').doc(jobId).collection('productEvents').add({
      productId: body.productId,
      source: body.source,
      eventType: body.eventType,
      userId,
      userType: isHomeowner ? 'homeowner' : 'contractor',
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error tracking product:', err);
    return NextResponse.json({ error: 'Failed to track product event' }, { status: 500 });
  }
}
