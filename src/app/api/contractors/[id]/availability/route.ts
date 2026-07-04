import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

interface AvailabilityBlock {
  date: string; // YYYY-MM-DD
  status: 'available' | 'busy' | 'blocked';
}

/**
 * GET /api/contractors/[contractorId]/availability
 * Returns contractor's availability blocks for the next 90 days
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id: contractorId } = params;

  try {
    const snap = await adminDb.collection('contractors').doc(contractorId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    const data = snap.data()!;
    const blocks: AvailabilityBlock[] = data.availabilityBlocks || [];

    return NextResponse.json({ blocks });
  } catch (err) {
    console.error('Availability fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

/**
 * POST /api/contractors/[contractorId]/availability
 * Updates contractor's availability blocks
 * Body: { blocks: Array<{ date: "YYYY-MM-DD", status: "available"|"busy"|"blocked" }> }
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const { id: contractorId } = params;

  // Only allow contractors to update their own availability
  if (decoded.uid !== contractorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { blocks } = await req.json();
  if (!Array.isArray(blocks)) {
    return NextResponse.json({ error: 'blocks must be an array' }, { status: 400 });
  }

  // Validate blocks
  for (const block of blocks) {
    if (!block.date || !block.status) {
      return NextResponse.json({ error: 'Each block must have date and status' }, { status: 400 });
    }
    if (!['available', 'busy', 'blocked'].includes(block.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(block.date)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
  }

  try {
    await adminDb.collection('contractors').doc(contractorId).update({
      availabilityBlocks: blocks,
      availabilityUpdatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, blocksCount: blocks.length });
  } catch (err) {
    console.error('Availability update error:', err);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}
