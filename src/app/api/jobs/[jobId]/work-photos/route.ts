import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { WorkPhoto } from '@/types/firestore';

/**
 * GET /api/jobs/[jobId]/work-photos
 * Get all work photos for a job
 * Contractor: see own photos + homeowner's dispute photos
 * Homeowner: see all photos after job completion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Verify user has access to this job
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();

    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();
    const isContractor = jobData?.claimedBy === userId;
    const isHomeowner = jobData?.userId === userId;

    if (!isContractor && !isHomeowner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all photos
    const photosSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('workPhotos')
      .orderBy('uploadedAt', 'desc')
      .get();

    const photos: (WorkPhoto & { id: string })[] = photosSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as WorkPhoto & { id: string }));

    return NextResponse.json({
      success: true,
      photos,
      count: photos.length,
    });
  } catch (error) {
    console.error('Error fetching work photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/[jobId]/work-photos
 * Upload a work photo
 * Only contractor can upload during job
 * Homeowner can upload dispute photos after job completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse request body
    const body = await request.json();
    const { url, caption, stage, aiCategory, thumbnailUrl, metadata } = body;

    if (!url || !stage) {
      return NextResponse.json(
        { error: 'url and stage required' },
        { status: 400 }
      );
    }

    // Verify user has access to this job
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();

    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();
    const isContractor = jobData?.claimedBy === userId;
    const isHomeowner = jobData?.userId === userId;

    if (!isContractor && !isHomeowner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Contractors can only upload during job
    if (isContractor && !['accepted', 'in_progress'].includes(jobData?.status)) {
      return NextResponse.json(
        { error: 'Cannot upload photos for inactive jobs' },
        { status: 400 }
      );
    }

    // Create photo document
    const photo = {
      url,
      uploadedBy: userId,
      uploadedAt: FieldValue.serverTimestamp(),
      caption: caption || '',
      stage: stage || 'in-progress',
      verified: false,
      aiCategory: aiCategory || '',
      thumbnailUrl: thumbnailUrl || url,
      metadata: metadata || { width: 0, height: 0, size: 0 },
    };

    // Add to Firestore (Admin SDK)
    const docRef = await adminDb
      .collection('jobs').doc(jobId)
      .collection('workPhotos')
      .add(photo);

    return NextResponse.json({
      success: true,
      photoId: docRef.id,
      photo: { id: docRef.id, ...photo },
    });
  } catch (error) {
    console.error('Error uploading work photo:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
