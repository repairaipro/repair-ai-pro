import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

/**
 * POST /api/posts/[postId]/view
 * Increments viewCount on a post. Called client-side on post permalink load.
 * Rate-limited per IP so a single visitor can't inflate counts.
 */
export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const rl = rateLimit(req, `view:${params.postId}`, 2, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false });

  try {
    await adminDb.collection('posts').doc(params.postId).update({
      viewCount: FieldValue.increment(1),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
