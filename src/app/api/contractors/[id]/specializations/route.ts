import { NextRequest, NextResponse } from 'next/server';
import { getContractorSpecializations, recalculateSpecializations } from '@/lib/specializations';

/**
 * GET /api/contractors/[id]/specializations
 * Get all specializations for a contractor
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

    const specializations = await getContractorSpecializations(contractorId);

    return NextResponse.json({
      success: true,
      specializations,
      count: specializations.length,
      verified: specializations.filter(s => s.verified).length,
    });
  } catch (error) {
    console.error('Error fetching specializations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specializations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contractors/[id]/specializations/recalculate
 * Force recalculation of specializations
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
    // For now, just proceed

    await recalculateSpecializations(contractorId);

    const specializations = await getContractorSpecializations(contractorId);

    return NextResponse.json({
      success: true,
      message: 'Specializations recalculated',
      specializations,
    });
  } catch (error) {
    console.error('Error recalculating specializations:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate specializations' },
      { status: 500 }
    );
  }
}
