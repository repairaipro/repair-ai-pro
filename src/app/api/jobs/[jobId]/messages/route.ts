import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

/**
 * GET /api/jobs/[jobId]/messages
 * Fetch all messages for a job (paginated, last 50)
 */
export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  try {
    const messagesSnap = await adminDb
      .collection('jobs')
      .doc(jobId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(50)
      .get();

    const messages = messagesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Messages fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[jobId]/messages
 * Send a message in a job chat
 * Body: { text: string }
 */
export async function POST(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const rl = rateLimit(req, `messages-${params.jobId}`, 50, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const userId = decoded.uid;
  const { jobId } = params;
  const { text } = await req.json();

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Message text required' }, { status: 400 });
  }

  try {
    // Verify user is part of this job (owner or claimed contractor)
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobSnap.data()!;
    const isOwner = job.userId === userId;
    const isContractor = job.claimedBy === userId;

    if (!isOwner && !isContractor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get sender's name
    let senderName = 'Unknown';
    if (isOwner) {
      const userSnap = await adminDb.collection('users').doc(userId).get();
      senderName = userSnap.data()?.displayName ?? 'Homeowner';
    } else {
      const contractorSnap = await adminDb.collection('contractors').doc(userId).get();
      senderName = contractorSnap.data()?.name ?? 'Contractor';
    }

    // Save message
    const messageRef = await adminDb
      .collection('jobs')
      .doc(jobId)
      .collection('messages')
      .add({
        senderId: userId,
        senderName,
        text: text.trim(),
        createdAt: FieldValue.serverTimestamp(),
      });

    // Update job's lastMessageAt
    await adminDb.collection('jobs').doc(jobId).update({
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageSenderId: userId,
    });

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
    });
  } catch (err) {
    console.error('Message send error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
