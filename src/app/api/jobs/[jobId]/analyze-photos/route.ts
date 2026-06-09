import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { analyzeJobPhotos, generateAnalysisReport } from '@/lib/awsRekognition';

export type PhotoAnalysisRequest = {
  photoUrls: string[];
  trade?: string;
  description?: string;
};

export type PhotoAnalysisResponse = {
  jobId: string;
  analysisId: string;
  photoCount: number;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  defects: Array<{
    type: string;
    confidence: number;
    severity: string;
    recommendations: string[];
  }>;
  detectedObjects: Array<{
    label: string;
    confidence: number;
  }>;
  requiresVideoConsultation: boolean;
  report: {
    title: string;
    sections: Array<{
      heading: string;
      content: string;
    }>;
  };
  timestamp: string;
};

/**
 * POST /api/jobs/[jobId]/analyze-photos
 * Analyze uploaded job photos using AWS Rekognition
 *
 * Request body:
 * {
 *   photoUrls: string[], // URLs of photos to analyze
 *   trade?: string,      // job trade for context
 *   description?: string // job description for context
 * }
 *
 * Response includes:
 * - Detected defects and issues
 * - Severity assessment
 * - Detected objects/components
 * - Recommendations for contractor
 * - Whether video consultation is needed
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

    // Verify user has access to this job
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();

    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();
    const isHomeowner = jobData?.userId === userId;

    if (!isHomeowner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse request
    const body = await request.json() as PhotoAnalysisRequest;
    const { photoUrls, trade, description } = body;

    if (!photoUrls || photoUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo URL required' },
        { status: 400 }
      );
    }

    if (photoUrls.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 photos per analysis' },
        { status: 400 }
      );
    }

    // Analyze photos with AWS Rekognition
    console.log(`Analyzing ${photoUrls.length} photos for job ${jobId}...`);
    const analysis = await analyzeJobPhotos(photoUrls);

    // Generate contractor-ready report
    const report = generateAnalysisReport(analysis.analyses[0]);

    // Store analysis in Firestore
    const analysisDoc = await adminDb
      .collection('jobs').doc(jobId)
      .collection('photoAnalyses')
      .add({
        photoUrls,
        trade,
        description,
        severity: analysis.aggregatedSeverity,
        defects: analysis.allDefects,
        detectedObjects: analysis.analyses[0]?.detectedObjects || [],
        summary: analysis.overallSummary,
        requiresVideoConsultation: analysis.requiresVideoConsultation,
        report,
        analysedAt: FieldValue.serverTimestamp(),
        analysisCount: photoUrls.length,
      });

    // Update job document with analysis reference
    await adminDb.collection('jobs').doc(jobId).update({
      latestPhotoAnalysisId: analysisDoc.id,
      photoAnalysisSeverity: analysis.aggregatedSeverity,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Build response
    const response: PhotoAnalysisResponse = {
      jobId,
      analysisId: analysisDoc.id,
      photoCount: photoUrls.length,
      severity: analysis.aggregatedSeverity,
      summary: analysis.overallSummary,
      defects: analysis.allDefects.map(d => ({
        type: d.defectType,
        confidence: d.confidence,
        severity: d.severity,
        recommendations: d.recommendations,
      })),
      detectedObjects: analysis.analyses[0]?.detectedObjects || [],
      requiresVideoConsultation: analysis.requiresVideoConsultation,
      report,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error analyzing photos:', error);

    // Check if it's an AWS credentials error
    if (
      error instanceof Error &&
      (error.message.includes('AWS') || error.message.includes('credentials'))
    ) {
      return NextResponse.json(
        {
          error: 'AWS configuration error',
          message: 'Photo analysis service not configured. Add AWS credentials to .env.local',
          details: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze photos' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/[jobId]/analyze-photos
 * Get existing photo analysis for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const searchParams = request.nextUrl.searchParams;
    const analysisId = searchParams.get('analysisId');

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

    // Verify access
    const jobSnap = await adminDb.collection('jobs').doc(jobId).get();
    if (!jobSnap.exists) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const jobData = jobSnap.data();
    const isHomeowner = jobData?.userId === userId;
    const isContractor = jobData?.claimedBy === userId;

    if (!isHomeowner && !isContractor) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get specific analysis or latest
    let analysisSnap;
    if (analysisId) {
      analysisSnap = await adminDb
        .collection('jobs').doc(jobId)
        .collection('photoAnalyses').doc(analysisId)
        .get();
    } else {
      // Get latest analysis
      const snap = await adminDb
        .collection('jobs').doc(jobId)
        .collection('photoAnalyses')
        .orderBy('analysedAt', 'desc')
        .limit(1)
        .get();
      analysisSnap = snap.docs[0];
    }

    if (!analysisSnap?.exists) {
      return NextResponse.json(
        { error: 'No analysis found' },
        { status: 404 }
      );
    }

    const analysisData = analysisSnap.data();

    return NextResponse.json({
      success: true,
      analysis: {
        id: analysisSnap.id,
        ...analysisData,
      },
    });
  } catch (error) {
    console.error('Error fetching photo analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
