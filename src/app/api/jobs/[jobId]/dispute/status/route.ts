import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

// GET — fetch the open dispute + evidence for a job
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
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    if (job.userId !== userId && job.claimedBy !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const disputesSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('disputes')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (disputesSnap.empty) {
      return NextResponse.json({ success: true, dispute: null });
    }

    const doc = disputesSnap.docs[0];
    const data = doc.data();

    // Fetch contractor's completion photos for comparison
    const completionSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('completionPhotos')
      .orderBy('uploadedAt', 'asc')
      .get();

    const completionPhotos = completionSnap.docs.map((d) => ({
      url: d.data().url,
      uploadedAt: d.data().uploadedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      dispute: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() || null,
        completionPhotos,
      },
    });
  } catch (err) {
    console.error('Error fetching dispute:', err);
    return NextResponse.json({ error: 'Failed to fetch dispute' }, { status: 500 });
  }
}
