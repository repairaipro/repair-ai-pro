import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';

// POST — homeowner uploads evidence photos for open dispute
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

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
    if (!jobSnap.exists) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const job = jobSnap.data()!;

    if (job.userId !== userId) {
      return NextResponse.json({ error: 'Only the homeowner can upload dispute evidence' }, { status: 403 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = (formData.get('caption') as string) || '';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: JSON.stringify({
          file: dataURI,
          upload_preset: 'repair_ai_photos',
          folder: `repair-ai/jobs/${jobId}/dispute`,
          public_id: uuid(),
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!cloudRes.ok) {
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    const cloudData = await cloudRes.json();
    const photoUrl = cloudData.secure_url as string;

    // Find open dispute for this job
    const disputesSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('disputes')
      .where('status', '==', 'open')
      .limit(1)
      .get();

    const disputeRef = disputesSnap.empty
      ? adminDb.collection('jobs').doc(jobId).collection('disputes').doc()
      : disputesSnap.docs[0].ref;

    // Add evidence photo to dispute doc
    await disputeRef.update({
      evidencePhotos: FieldValue.arrayUnion({
        url: photoUrl,
        caption,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, url: photoUrl });
  } catch (err) {
    console.error('Evidence upload error:', err);
    return NextResponse.json({ error: 'Failed to upload evidence' }, { status: 500 });
  }
}
