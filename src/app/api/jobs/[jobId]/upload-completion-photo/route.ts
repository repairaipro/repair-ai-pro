import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuid } from 'uuid';

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
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobSnap.data()!;
    if (job.claimedBy !== userId) {
      return NextResponse.json(
        { error: 'Only assigned contractor can upload completion photos' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
    }

    // Upload to Cloudinary
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
          folder: `repair-ai/jobs/${jobId}/completion`,
          public_id: uuid(),
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!cloudRes.ok) {
      console.error('Cloudinary upload failed:', await cloudRes.text());
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    const cloudData = (await cloudRes.json()) as any;

    // Store photo record
    const photoRef = await adminDb
      .collection('jobs').doc(jobId)
      .collection('completionPhotos')
      .add({
        url: cloudData.secure_url,
        thumbnailUrl: cloudData.secure_url,
        uploadedBy: userId,
        uploadedAt: FieldValue.serverTimestamp(),
        cloudinaryPublicId: cloudData.public_id,
        metadata: {
          width: cloudData.width,
          height: cloudData.height,
          size: cloudData.bytes,
          format: cloudData.format,
        },
      });

    // After upload, try to build before/after pairs
    try {
      await buildBeforeAfterPairs(jobId, userId);
    } catch (err) {
      console.error('Photo matching failed (non-fatal):', err);
    }

    return NextResponse.json({
      success: true,
      photoId: photoRef.id,
      url: cloudData.secure_url,
    });
  } catch (err) {
    console.error('Error uploading completion photo:', err);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}

async function buildBeforeAfterPairs(jobId: string, contractorId: string) {
  const [analysisSnap, completionSnap] = await Promise.all([
    adminDb
      .collection('jobs').doc(jobId)
      .collection('photoAnalyses')
      .orderBy('analysedAt', 'desc')
      .limit(1)
      .get(),
    adminDb
      .collection('jobs').doc(jobId)
      .collection('completionPhotos')
      .orderBy('uploadedAt', 'asc')
      .get(),
  ]);

  if (analysisSnap.empty) return;

  const analysis = analysisSnap.docs[0].data();
  const beforePhotos: string[] = analysis.photoUrls || [];
  const afterPhotos = completionSnap.docs.map((d) => ({ id: d.id, url: d.data().url as string }));

  if (!beforePhotos.length || !afterPhotos.length) return;

  const pairs = afterPhotos.slice(0, beforePhotos.length).map((after, idx) => ({
    beforePhotoUrl: beforePhotos[idx] || beforePhotos[0],
    afterPhotoUrl: after.url,
    area: `Area ${idx + 1}`,
    matchConfidence: 75,
  }));

  // Upsert completion record
  const existingSnap = await adminDb
    .collection('jobs').doc(jobId)
    .collection('completions')
    .orderBy('completedAt', 'desc')
    .limit(1)
    .get();

  if (existingSnap.empty) {
    await adminDb.collection('jobs').doc(jobId).collection('completions').add({
      contractorId,
      completedAt: FieldValue.serverTimestamp(),
      beforeAndAfterPairs: pairs,
      status: 'awaiting_homeowner_approval',
    });
  } else {
    await existingSnap.docs[0].ref.update({ beforeAndAfterPairs: pairs });
  }
}
