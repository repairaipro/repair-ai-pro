import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/contractors/analytics
 * Returns aggregated social + marketplace analytics for the signed-in contractor.
 * Used by /studio/analytics page.
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [contractorSnap, postsSnap, jobsSnap] = await Promise.all([
    adminDb.collection('contractors').doc(uid).get(),
    adminDb.collection('posts')
      .where('contractorId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
    adminDb.collection('jobs')
      .where('claimedBy', '==', uid)
      .where('status', '==', 'confirmed')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get(),
  ]);

  if (!contractorSnap.exists) {
    return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
  }

  const contractor = contractorSnap.data()!;

  // ── Post analytics ──
  const posts = postsSnap.docs.map(d => {
    const p = d.data();
    return {
      id:           d.id,
      caption:      (p.caption ?? '').slice(0, 80),
      photo:        p.photos?.[0] ?? p.poster ?? null,
      hasVideo:     p.hasVideo ?? false,
      beforeAfter:  p.beforeAfter ?? false,
      likeCount:    p.likeCount ?? 0,
      commentCount: p.commentCount ?? 0,
      viewCount:    p.viewCount ?? 0,
      trade:        p.trade ?? null,
      createdAt:    p.createdAt?.toDate?.()?.toISOString() ?? null,
      publishedTo:  p.publishedTo ?? {},
    };
  });

  const thisMonthPosts = posts.filter(p => p.createdAt && new Date(p.createdAt) >= startOfMonth);
  const lastMonthPosts = posts.filter(p => {
    if (!p.createdAt) return false;
    const d = new Date(p.createdAt);
    return d >= startOfLastMonth && d < startOfMonth;
  });

  const totalLikes    = posts.reduce((s, p) => s + p.likeCount, 0);
  const totalComments = posts.reduce((s, p) => s + p.commentCount, 0);
  const totalViews    = posts.reduce((s, p) => s + p.viewCount, 0);

  const thisMonthLikes    = thisMonthPosts.reduce((s, p) => s + p.likeCount, 0);
  const lastMonthLikes    = lastMonthPosts.reduce((s, p) => s + p.likeCount, 0);
  const thisMonthViews    = thisMonthPosts.reduce((s, p) => s + p.viewCount, 0);
  const lastMonthViews    = lastMonthPosts.reduce((s, p) => s + p.viewCount, 0);

  // Top posts by engagement score (likes × 2 + comments × 3 + views × 0.1)
  const topPosts = [...posts]
    .sort((a, b) => (b.likeCount * 2 + b.commentCount * 3 + b.viewCount * 0.1) -
                    (a.likeCount * 2 + a.commentCount * 3 + a.viewCount * 0.1))
    .slice(0, 6);

  // Avg engagement rate per post
  const followerCount = contractor.followerCount ?? 0;
  const avgEngagement = posts.length > 0 && followerCount > 0
    ? Math.round(((totalLikes + totalComments) / posts.length / Math.max(followerCount, 1)) * 100)
    : 0;

  // ── Revenue analytics (last 30 days) ──
  const recentJobs = jobsSnap.docs.filter(d => {
    const t = d.data().createdAt?.toDate?.();
    return t && t >= thirtyDaysAgo;
  });
  const recentRevenue = recentJobs.reduce((s, d) => s + (d.data().paymentAmountUsd ?? 0), 0);

  // ── Social connections ──
  const connections = contractor.socialConnections ?? {};
  const handles     = contractor.socialHandles ?? {};

  return NextResponse.json({
    success: true,
    audience: {
      followerCount,
      postCount:   contractor.postCount ?? posts.length,
      totalLikes,
      totalComments,
      totalViews,
      avgEngagement,
    },
    thisMonth: {
      posts:    thisMonthPosts.length,
      likes:    thisMonthLikes,
      views:    thisMonthViews,
      likeDelta:  lastMonthLikes  > 0 ? Math.round(((thisMonthLikes  - lastMonthLikes)  / lastMonthLikes)  * 100) : null,
      viewDelta:  lastMonthViews  > 0 ? Math.round(((thisMonthViews  - lastMonthViews)  / lastMonthViews)  * 100) : null,
    },
    topPosts,
    recentRevenue,
    recentJobCount: recentJobs.length,
    connections: {
      instagram: connections.instagram?.connected ? { connected: true, username: connections.instagram.username } : null,
      tiktok:    connections.tiktok?.connected    ? { connected: true, username: connections.tiktok.username }    : null,
    },
    handles,
    rating:     contractor.avgRating ?? contractor.rating ?? null,
    reviewCount: contractor.reviewCount ?? 0,
  });
}
