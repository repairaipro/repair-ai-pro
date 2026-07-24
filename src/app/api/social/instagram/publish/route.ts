import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

/**
 * POST /api/social/instagram/publish
 * Auto-publishes a RepairAI work post to the contractor's connected Instagram.
 *
 * Body: { postId: string }
 *
 * Instagram Content Publishing API flow:
 *   1. Create a media container (image or video)
 *   2. Wait for container to be ready (video only)
 *   3. Publish the container
 */
// Reads request headers per-request — declare dynamic so Next does not try to prerender it.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(req, 'ig-publish', 10, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  // Load the work post
  const postSnap = await adminDb.collection('posts').doc(postId).get();
  if (!postSnap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  const post = postSnap.data()!;
  if (post.contractorId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Load Instagram connection
  const contractorSnap = await adminDb.collection('contractors').doc(uid).get();
  const ig = contractorSnap.data()?.socialConnections?.instagram;
  if (!ig?.connected || !ig.accessToken) {
    return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 });
  }

  const accessToken = ig.accessToken;
  const igUserId    = ig.userId;
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const postUrl     = `${appUrl}/work/${postId}`;

  const caption = buildCaption(post, postUrl);

  try {
    let containerId: string;

    if (post.hasVideo && post.video) {
      // Video container
      const res = await fetch(
        `https://graph.instagram.com/${igUserId}/media?media_type=REELS&video_url=${encodeURIComponent(post.video)}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!data.id) throw new Error(data.error?.message ?? 'Container creation failed');
      containerId = data.id;

      // Poll until container is ready (videos take ~30s)
      await pollContainerStatus(containerId, accessToken);
    } else {
      // Photo container — use first photo
      const photoUrl = post.photos?.[0];
      if (!photoUrl) return NextResponse.json({ error: 'No media to publish' }, { status: 400 });

      const res = await fetch(
        `https://graph.instagram.com/${igUserId}/media?image_url=${encodeURIComponent(photoUrl)}&caption=${encodeURIComponent(caption)}&access_token=${accessToken}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!data.id) throw new Error(data.error?.message ?? 'Container creation failed');
      containerId = data.id;
    }

    // Publish
    const publishRes = await fetch(
      `https://graph.instagram.com/${igUserId}/media_publish?creation_id=${containerId}&access_token=${accessToken}`,
      { method: 'POST' }
    );
    const published = await publishRes.json();
    if (!published.id) throw new Error('Publish failed');

    // Record on the post doc
    await adminDb.collection('posts').doc(postId).set(
      { publishedTo: { instagram: { id: published.id, publishedAt: new Date().toISOString() } } },
      { merge: true }
    );

    return NextResponse.json({ success: true, instagramId: published.id });
  } catch (err: any) {
    console.error('Instagram publish error:', err);
    return NextResponse.json({ error: err.message ?? 'Publish failed' }, { status: 500 });
  }
}

async function pollContainerStatus(containerId: string, token: string, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const res  = await fetch(`https://graph.instagram.com/${containerId}?fields=status_code&access_token=${token}`);
    const data = await res.json();
    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') throw new Error('Instagram video processing failed');
  }
  throw new Error('Instagram video timed out');
}

function buildCaption(post: any, postUrl: string): string {
  const trade    = post.trade ?? 'home repair';
  const tradeTag = '#' + trade.toLowerCase().replace(/[^a-z0-9]/g, '');
  const base     = post.caption?.trim() ? post.caption : `${trade} work, done right.`;
  return `${base}\n\n${post.beforeAfter ? 'Before & after 👇 ' : ''}Book via RepairAI Pro → ${postUrl}\n\n${tradeTag} #beforeandafter #homerepair #satisfying #reels`;
}
