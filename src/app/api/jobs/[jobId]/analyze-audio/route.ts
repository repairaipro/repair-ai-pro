import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { analyzeAudioDefect } from '@/lib/audioDiagnosis';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

export type AudioDiagnosisRequest = {
  /** base64-encoded WAV audio, no data: URI prefix */
  audioBase64: string;
};

// ~2MB of base64 covers roughly 20s of 44.1kHz mono 16-bit WAV — plenty
// for a diagnostic sound clip, and keeps well under serverless body limits.
const MAX_BASE64_LENGTH = 2_000_000;

/**
 * POST /api/jobs/[jobId]/analyze-audio
 * Homeowner records a sound (grinding, dripping, humming, etc.) and AI
 * diagnoses the likely cause — same pattern as /analyze-photos, but for
 * audio via GPT-4o's audio-input model instead of its vision model.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const rl = rateLimit(request, 'analyze-audio', 10);
  if (!rl.ok) return rateLimitResponse(rl);

  try {
    const { jobId } = params;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobData = jobSnap.data();
    if (jobData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json() as AudioDiagnosisRequest;
    const { audioBase64 } = body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return NextResponse.json({ error: 'audioBase64 is required' }, { status: 400 });
    }
    if (audioBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Recording too long — keep it under ~20 seconds' }, { status: 400 });
    }

    const analysis = await analyzeAudioDefect(audioBase64);

    const analysisDoc = await adminDb
      .collection('jobs').doc(jobId)
      .collection('audioAnalyses')
      .add({
        defects: analysis.detectedDefects,
        soundDescription: analysis.soundDescription,
        severity: analysis.estimatedSeverity,
        summary: analysis.summary,
        requiresVideoConsultation: analysis.requiresVideoConsultation,
        analysedAt: FieldValue.serverTimestamp(),
      });

    await adminDb.collection('jobs').doc(jobId).update({
      latestAudioAnalysisId: analysisDoc.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        analysisId: analysisDoc.id,
        ...analysis,
      },
    });
  } catch (error) {
    console.error('Error analyzing audio:', error);
    return NextResponse.json({ error: 'Failed to analyze audio' }, { status: 500 });
  }
}
