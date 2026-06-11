import { NextRequest, NextResponse } from 'next/server';
import { getQualityScore, recalculateQualityScore } from '@/lib/qualityScore';
import { adminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/contractors/[id]/quality-score
 * Get quality score for a contractor
 * If not cached, calculates on the fly
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: contractorId } = params;

    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID required' },
        { status: 400 }
      );
    }

    // Try to get cached score
    let score = await getQualityScore(contractorId);

    // If no cached score, calculate it
    if (!score) {
      await recalculateQualityScore(contractorId);
      score = await getQualityScore(contractorId);
    }

    return NextResponse.json({
      success: true,
      score,
    });
  } catch (error) {
    console.error('Error fetching quality score:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quality score' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contractors/[id]/quality-score/recalculate
 * Force recalculation of quality score
 * Protected: only contractor themselves or admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: contractorId } = params;
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token: only the contractor themselves (or an admin) can force recalculation
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const adminUids = (process.env.ADMIN_UIDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (decoded.uid !== contractorId && !adminUids.includes(decoded.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await recalculateQualityScore(contractorId);
    const score = await getQualityScore(contractorId);

    return NextResponse.json({
      success: true,
      message: 'Quality score recalculated',
      score,
    });
  } catch (error) {
    console.error('Error recalculating quality score:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate quality score' },
      { status: 500 }
    );
  }
}
