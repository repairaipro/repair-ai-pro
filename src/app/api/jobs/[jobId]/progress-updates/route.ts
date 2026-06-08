import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export type ProgressStatus =
  | 'arrived'
  | 'diagnosing'
  | 'working'
  | 'milestone_complete'
  | 'wrapping_up'
  | 'completed';

export interface ProgressUpdate {
  id?: string;
  contractorId: string;
  status: ProgressStatus;
  currentTask: string;
  elapsedMinutes: number;
  estimatedMinutesRemaining: number;
  notes?: string;
  photoIds?: string[];
  location?: { lat: number; lng: number };
  createdAt?: any;
}

// POST /api/jobs/[jobId]/progress-updates
// Contractor logs a progress update
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

    // Only the assigned contractor can log progress
    if (job.claimedBy !== userId) {
      return NextResponse.json(
        { error: 'Only the assigned contractor can log progress' },
        { status: 403 }
      );
    }

    const body = await request.json() as {
      status: ProgressStatus;
      currentTask: string;
      elapsedMinutes?: number;
      estimatedMinutesRemaining?: number;
      notes?: string;
      photoIds?: string[];
      location?: { lat: number; lng: number };
    };

    if (!body.status || !body.currentTask) {
      return NextResponse.json(
        { error: 'status and currentTask are required' },
        { status: 400 }
      );
    }

    const update: ProgressUpdate = {
      contractorId: userId,
      status: body.status,
      currentTask: body.currentTask,
      elapsedMinutes: body.elapsedMinutes ?? 0,
      estimatedMinutesRemaining: body.estimatedMinutesRemaining ?? 0,
      notes: body.notes ?? '',
      photoIds: body.photoIds ?? [],
      ...(body.location ? { location: body.location } : {}),
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb
      .collection('jobs')
      .doc(jobId)
      .collection('progressUpdates')
      .add(update);

    // Mirror latest status on the job doc for quick reads
    const jobUpdate: Record<string, any> = {
      latestProgressStatus: body.status,
      latestProgressTask: body.currentTask,
      latestProgressAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If contractor marks job fully complete via progress update
    if (body.status === 'completed') {
      jobUpdate.status = 'awaiting_confirmation';
    }

    await adminDb.collection('jobs').doc(jobId).update(jobUpdate);

    return NextResponse.json({ success: true, updateId: docRef.id });
  } catch (err) {
    console.error('Progress update error:', err);
    return NextResponse.json(
      { error: 'Failed to log progress update' },
      { status: 500 }
    );
  }
}

// GET /api/jobs/[jobId]/progress-updates
// Homeowner or contractor fetches the full progress timeline
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

    const snap = await adminDb
      .collection('jobs')
      .doc(jobId)
      .collection('progressUpdates')
      .orderBy('createdAt', 'asc')
      .get();

    const updates: ProgressUpdate[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        contractorId: data.contractorId,
        status: data.status,
        currentTask: data.currentTask,
        elapsedMinutes: data.elapsedMinutes ?? 0,
        estimatedMinutesRemaining: data.estimatedMinutesRemaining ?? 0,
        notes: data.notes ?? '',
        photoIds: data.photoIds ?? [],
        location: data.location ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ updates });
  } catch (err) {
    console.error('Fetch progress updates error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch progress updates' },
      { status: 500 }
    );
  }
}
