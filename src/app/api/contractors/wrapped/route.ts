import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/contractors/wrapped
 * Returns the contractor's year-in-review stats for the Wrapped card.
 * Uses calendar year (Jan 1 → today) so it works as both mid-year and
 * end-of-year recap.
 */
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const now      = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1); // Jan 1

  const [contractorSnap, jobsSnap, postsSnap] = await Promise.all([
    adminDb.collection('contractors').doc(uid).get(),
    adminDb.collection('jobs')
      .where('claimedBy', '==', uid)
      .where('status', 'in', ['confirmed', 'completed'])
      .where('createdAt', '>=', yearStart)
      .orderBy('createdAt', 'asc')
      .limit(500)
      .get(),
    adminDb.collection('posts')
      .where('contractorId', '==', uid)
      .where('createdAt', '>=', yearStart)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get(),
  ]);

  if (!contractorSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const c = contractorSnap.data()!;

  // ── Jobs ─────────────────────────────────────────────────────────────
  const jobs = jobsSnap.docs.map(d => d.data());
  const totalEarned   = jobs.reduce((s, j) => s + (j.paymentAmountUsd ?? 0), 0);
  const jobCount      = jobs.length;

  // Trade breakdown
  const tradeCounts: Record<string, number> = {};
  jobs.forEach(j => { const t = j.trade ?? 'General'; tradeCounts[t] = (tradeCounts[t] ?? 0) + 1; });
  const topTrade = Object.entries(tradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? c.trade ?? 'General';

  // Busiest month
  const monthCounts: Record<number, number> = {};
  jobs.forEach(j => {
    const m = j.createdAt?.toDate?.()?.getMonth() ?? -1;
    if (m >= 0) monthCounts[m] = (monthCounts[m] ?? 0) + 1;
  });
  const busiestMonthIdx = Number(Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const busiestMonth = busiestMonthIdx >= 0 ? MONTHS[busiestMonthIdx] : null;

  // ── Posts & social ────────────────────────────────────────────────────
  const posts = postsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  const totalLikes    = posts.reduce((s, p) => s + (p.likeCount ?? 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentCount ?? 0), 0);
  const postCount     = posts.length;

  // Top post by likes
  const topPost = posts.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))[0] ?? null;

  // ── Milestones ───────────────────────────────────────────────────────
  const milestones: string[] = [];
  if (jobCount >= 100)        milestones.push('💯 100 jobs completed');
  else if (jobCount >= 50)    milestones.push('🎯 50 jobs completed');
  else if (jobCount >= 10)    milestones.push('🔟 10 jobs completed');
  if (totalEarned >= 100_000) milestones.push('💰 Six figures earned');
  else if (totalEarned >= 50_000) milestones.push('💵 $50K+ earned');
  if ((c.followerCount ?? 0) >= 500) milestones.push('👥 500+ followers');
  else if ((c.followerCount ?? 0) >= 100) milestones.push('👥 100+ followers');
  if ((c.avgRating ?? 0) >= 4.8) milestones.push('⭐ Near-perfect rating');
  if (topPost && (topPost.likeCount ?? 0) >= 50) milestones.push(`🔥 ${topPost.likeCount} likes on one post`);

  // ── Fun stat ─────────────────────────────────────────────────────────
  const avgJobValue = jobCount > 0 ? Math.round(totalEarned / jobCount) : 0;
  const daysSinceJan1 = Math.max(1, Math.floor((now.getTime() - yearStart.getTime()) / 86_400_000));
  const jobsPerMonth  = jobCount > 0 ? (jobCount / (daysSinceJan1 / 30)).toFixed(1) : '0';

  return NextResponse.json({
    success: true,
    year:       now.getFullYear(),
    isMidYear:  now.getMonth() < 11,
    name:       c.name ?? 'Pro',
    trade:      c.trade ?? 'General',
    city:       c.city ?? null,
    photoUrl:   c.photoUrl ?? null,
    stats: {
      jobCount,
      totalEarned:    Math.round(totalEarned),
      avgJobValue,
      jobsPerMonth,
      topTrade,
      busiestMonth,
      followerCount:  c.followerCount ?? 0,
      followerGain:   c.followerCount ?? 0, // all-time; year-delta needs historical data
      postCount,
      totalLikes,
      totalComments,
      rating:         c.avgRating ?? null,
      reviewCount:    c.reviewCount ?? 0,
    },
    topPost: topPost ? {
      id:         topPost.id,
      photo:      topPost.photos?.[0] ?? topPost.poster ?? null,
      likeCount:  topPost.likeCount ?? 0,
      caption:    (topPost.caption ?? '').slice(0, 60),
    } : null,
    milestones,
  });
}
