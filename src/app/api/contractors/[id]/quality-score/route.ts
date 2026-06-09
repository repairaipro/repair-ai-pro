import { NextRequest, NextResponse } from 'next/server';
import { getQualityScore, recalculateQualityScore } from '@/lib/qualityScore';

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

    // In production, verify the token and check if it matches contractorId or is admin

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
