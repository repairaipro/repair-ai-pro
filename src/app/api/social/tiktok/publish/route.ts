import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { rateLimit, rateLimitResponse } from '@/lib/rateLimit';

/**
 * POST /api/social/tiktok/publish
 * Auto-publishes a RepairAI work post to the contractor's connected TikTok.
 *
 * Body: { postId: string }
 *
 * TikTok Content Posting API v2:
 *   - Videos: /v2/post/publish/video/init/ → upload → /v2/post/publish/status/fetch/
 *   - Photos: /v2/post/publish/content/init/ (PHOTO type)
 */
export async function POST(req: Request) {
  const rl = rateLimit(req, 'tt-publish', 10, 60_000);
  if (!rl.ok) return rateLimitResponse(rl);

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  const postSnap = await adminDb.collection('posts').doc(postId).get();
  if (!postSnap.exists) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  const post = postSnap.data()!;
  if (post.contractorId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const contractorSnap = await adminDb.collection('contractors').doc(uid).get();
  const tt = contractorSnap.data()?.socialConnections?.tiktok;
  if (!tt?.connected || !tt.accessToken) {
    return NextResponse.json({ error: 'TikTok not connected' }, { status: 400 });
  }

  const accessToken = tt.accessToken;
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const postUrl     = `${appUrl}/work/${postId}`;
  const caption     = buildCaption(post, postUrl);

  try {
    if (post.hasVideo && post.video) {
      // Video publish via URL
      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title:           caption.slice(0, 2200),
            privacy_level:   'PUBLIC_TO_EVERYONE',
            disable_duet:    false,
            disable_comment: false,
            disable_stitch:  false,
          },
          source_info: {
            source:    'PULL_FROM_URL',
            video_url: post.video,
          },
        }),
      });
      const initData = await initRes.json();
      if (!initData.data?.publish_id) throw new Error(JSON.stringify(initData));

      const publishId = initData.data.publish_id;

      // Record publish attempt
      await adminDb.collection('posts').doc(postId).set(
        { publishedTo: { tiktok: { publishId, publishedAt: new Date().toISOString() } } },
        { merge: true }
      );

      return NextResponse.json({ success: true, publishId });
    } else {
      // Photo post
      const photoUrls = (post.photos ?? []).slice(0, 35); // TikTok max 35 photos
      if (!photoUrls.length) return NextResponse.json({ error: 'No media' }, { status: 400 });

      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title:           caption.slice(0, 2200),
            privacy_level:   'PUBLIC_TO_EVERYONE',
            disable_duet:    false,
            disable_comment: false,
            disable_stitch:  false,
            auto_add_music:  true,
          },
          source_info: {
            source:     'PULL_FROM_URL',
            photo_cover_index: 0,
            photo_images: photoUrls,
          },
          post_mode:    'DIRECT_POST',
          media_type:   'PHOTO',
        }),
      });
      const initData = await initRes.json();
      if (!initData.data?.publish_id) throw new Error(JSON.stringify(initData));

      await adminDb.collection('posts').doc(postId).set(
        { publishedTo: { tiktok: { publishId: initData.data.publish_id, publishedAt: new Date().toISOString() } } },
        { merge: true }
      );

      return NextResponse.json({ success: true, publishId: initData.data.publish_id });
    }
  } catch (err: any) {
    console.error('TikTok publish error:', err);
    return NextResponse.json({ error: err.message ?? 'Publish failed' }, { status: 500 });
  }
}

function buildCaption(post: any, postUrl: string): string {
  const trade    = post.trade ?? 'home repair';
  const tradeTag = '#' + trade.toLowerCase().replace(/[^a-z0-9]/g, '');
  const base     = post.caption?.trim() ? post.caption : `${trade} work, done right.`;
  return `${base}\n\n${post.beforeAfter ? 'Before & after 👇 ' : ''}Book via RepairAI Pro → ${postUrl}\n\n${tradeTag} #beforeandafter #homerepair #satisfying #fyp #tiktok`;
}
