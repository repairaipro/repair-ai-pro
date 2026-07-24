import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { generateRtcToken, uidFromFirebaseUid, AGORA_APP_ID } from '@/lib/agora';

/**
 * POST /api/video/generate-token
 * Returns a short-lived Agora RTC token for a consultation channel.
 *
 * Body: { consultId: string, jobId: string }
 * Response: { token: string, uid: number, appId: string, channelName: string }
 *
 * Both the homeowner and contractor call this endpoint.
 * The token is scoped to the consultation's channel (consultId) and expires in 1h.
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const userId  = decoded.uid;

    const body = await request.json() as { consultId: string; jobId: string };
    const { consultId, jobId } = body;

    if (!consultId || !jobId) {
      return NextResponse.json({ error: 'consultId and jobId are required' }, { status: 400 });
    }

    // Verify user is a participant on the job
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobSnap.data()!;
    if (job.userId !== userId && job.claimedBy !== userId) {
      return NextResponse.json({ error: 'Not a participant on this job' }, { status: 403 });
    }

    // Verify the consultation exists and is scheduled/active
    const consultSnap = await adminDb
      .collection('jobs').doc(jobId)
      .collection('videoConsultations').doc(consultId)
      .get();

    if (!consultSnap.exists) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    const consult = consultSnap.data()!;
    if (!['scheduled', 'active'].includes(consult.status)) {
      return NextResponse.json({ error: 'Consultation is not active' }, { status: 400 });
    }

    // Generate token — channel name = consultId, uid = hash of Firebase UID
    const uid         = uidFromFirebaseUid(userId);
    const channelName = consultId;
    const token       = generateRtcToken(channelName, uid, 'publisher', 3600);

    // Mark consultation as active on first join
    if (consult.status === 'scheduled') {
      await consultSnap.ref.update({ status: 'active' });
    }

    return NextResponse.json({
      token,
      uid,
      appId: AGORA_APP_ID,
      channelName,
    });
  } catch (err: any) {
    console.error('Token generation error:', err);
    if (err.message?.includes('credentials not configured')) {
      return NextResponse.json(
        { error: 'Agora not configured. Add NEXT_PUBLIC_AGORA_APP_ID and AGORA_APP_CERTIFICATE to .env.local' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
