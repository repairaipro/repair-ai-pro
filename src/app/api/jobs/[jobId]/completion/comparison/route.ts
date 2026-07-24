import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

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

    const completionSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('completions')
      .orderBy('completedAt', 'desc')
      .limit(1)
      .get();

    if (completionSnap.empty) {
      return NextResponse.json({ success: true, comparison: null });
    }

    const doc = completionSnap.docs[0];
    const data = doc.data();

    const photoPairs = (data.beforeAndAfterPairs || []).map(
      (pair: any, idx: number) => ({
        id: `pair-${idx}`,
        beforeUrl: pair.beforePhotoUrl,
        afterUrl: pair.afterPhotoUrl,
        area: pair.area,
        matchConfidence: pair.matchConfidence,
      })
    );

    return NextResponse.json({
      success: true,
      comparison: {
        id: doc.id,
        completedAt: data.completedAt,
        contractorId: data.contractorId,
        photoPairs,
        status: data.status,
        notes: data.contractorNotes || '',
      },
    });
  } catch (err) {
    console.error('Error fetching comparison:', err);
    return NextResponse.json({ error: 'Failed to fetch comparison' }, { status: 500 });
  }
}

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

    if (job.userId !== userId) {
      return NextResponse.json(
        { error: 'Only homeowner can approve completion' },
        { status: 403 }
      );
    }

    const body = await request.json() as {
      completionId: string;
      approved: boolean;
      notes?: string;
    };

    await adminDb
      .collection('jobs').doc(jobId)
      .collection('completions').doc(body.completionId)
      .update({
        status: body.approved ? 'approved' : 'rejected',
        homeownerNotes: body.notes || '',
        approvedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      message: body.approved ? 'Work approved!' : 'Work marked as incomplete',
    });
  } catch (err) {
    console.error('Error approving completion:', err);
    return NextResponse.json({ error: 'Failed to approve completion' }, { status: 500 });
  }
}
