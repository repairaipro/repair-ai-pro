import { NextRequest, NextResponse } from 'next/server';
import { getContractorSpecializations, recalculateSpecializations } from '@/lib/specializations';
import { adminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/contractors/[id]/specializations
 * Get all specializations for a contractor
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

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

    // Verify token: only the contractor themselves (or an admin) can force recalculation
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const adminUids = (process.env.ADMIN_UIDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (decoded.uid !== contractorId && !adminUids.includes(decoded.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
