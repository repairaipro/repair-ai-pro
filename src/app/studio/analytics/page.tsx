'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  ArrowLeft, TrendingUp, TrendingDown, Users, Heart, Eye,
  MessageSquare, Star, BarChart2, Camera, Zap, ArrowUpRight,
  Loader2, Link2, Film, Image as ImageIcon,
} from 'lucide-react';

type Analytics = {
  audience:    { followerCount: number; postCount: number; totalLikes: number; totalComments: number; totalViews: number; avgEngagement: number };
  thisMonth:   { posts: number; likes: number; views: number; likeDelta: number | null; viewDelta: number | null };
  topPosts:    { id: string; caption: string; photo: string | null; hasVideo: boolean; beforeAfter: boolean; likeCount: number; commentCount: number; viewCount: number; publishedTo: Record<string, any> }[];
  recentRevenue:   number;
  recentJobCount:  number;
  connections:     { instagram: { connected: boolean; username: string } | null; tiktok: { connected: boolean; username: string } | null };
  handles:         Record<string, string>;
  rating:          number | null;
  reviewCount:     number;
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData]     = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(async (token: string) => {
      const res = await fetch('/api/contractors/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setData(d);
    }).finally(() => setLoading(false));
  }, [user]);

  if (!user) return <SignInWall />;

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/studio" className="p-2 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Analytics</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>How your content is performing</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
          </div>
        )}

        {data && (
          <>
            {/* ── Audience overview ── */}
            <Section title="Audience">
              <div className="grid grid-cols-2 gap-3">
                <BigStat
                  icon={<Users className="w-4 h-4" />}
                  label="Followers"
                  value={data.audience.followerCount.toLocaleString()}
                  accent="#818cf8"
                  sub={data.audience.followerCount === 0 ? 'Share your /pro link to grow' : 'People following your work'}
                />
                <BigStat
                  icon={<Camera className="w-4 h-4" />}
                  label="Posts"
                  value={data.audience.postCount.toLocaleString()}
                  accent="#34d399"
                  sub="Work posts published"
                />
                <BigStat
                  icon={<Heart className="w-4 h-4" />}
                  label="Total likes"
                  value={data.audience.totalLikes.toLocaleString()}
                  accent="#f472b6"
                  sub="Across all posts"
                />
                <BigStat
                  icon={<Eye className="w-4 h-4" />}
                  label="Total views"
                  value={data.audience.totalViews.toLocaleString()}
                  accent="#38bdf8"
                  sub="Post detail page opens"
                />
              </div>

              {data.audience.avgEngagement > 0 && (
                <div className="rounded-xl p-3 flex items-center gap-3 mt-1" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#818cf8' }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{data.audience.avgEngagement}% engagement rate</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                      {data.audience.avgEngagement >= 5
                        ? 'Excellent — well above average'
                        : data.audience.avgEngagement >= 2
                        ? 'Good — on par with industry average'
                        : 'Post more consistently to improve'}
                    </p>
                  </div>
                </div>
              )}
            </Section>

            {/* ── This month ── */}
            <Section title="This Month">
              <div className="grid grid-cols-3 gap-3">
                <MonthStat label="Posts" value={data.thisMonth.posts} delta={null} color="#34d399" />
                <MonthStat label="Likes" value={data.thisMonth.likes} delta={data.thisMonth.likeDelta} color="#f472b6" />
                <MonthStat label="Views" value={data.thisMonth.views} delta={data.thisMonth.viewDelta} color="#38bdf8" />
              </div>
            </Section>

            {/* ── Top posts ── */}
            {data.topPosts.length > 0 && (
              <Section title="Top Posts" action={<Link href="/work" className="text-xs" style={{ color: 'var(--color-brand)' }}>See all →</Link>}>
                <div className="space-y-2">
                  {data.topPosts.map((post, i) => (
                    <Link
                      key={post.id}
                      href={`/work/${post.id}`}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors"
                      style={{ background: 'var(--color-surface-2)', textDecoration: 'none' }}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#1a1d27' }}>
                        {post.photo
                          ? <img src={post.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-5 h-5" style={{ color: 'var(--color-text-4)' }} /></div>
                        }
                        {post.hasVideo && (
                          <div className="absolute top-1 right-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', padding: '1px 4px', fontSize: 9, color: '#fff' }}>▶</div>
                        )}
                        {post.beforeAfter && (
                          <div className="absolute bottom-1 left-1 rounded" style={{ background: 'rgba(99,102,241,0.85)', padding: '1px 4px', fontSize: 8, color: '#fff' }}>B/A</div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-3)' }}>
                          {post.caption || 'No caption'}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] flex items-center gap-1" style={{ color: '#f472b6' }}>
                            <Heart className="w-3 h-3" /> {post.likeCount}
                          </span>
                          <span className="text-[11px] flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <MessageSquare className="w-3 h-3" /> {post.commentCount}
                          </span>
                          <span className="text-[11px] flex items-center gap-1" style={{ color: '#38bdf8' }}>
                            <Eye className="w-3 h-3" /> {post.viewCount}
                          </span>
                        </div>
                        {/* Published-to badges */}
                        {Object.keys(post.publishedTo ?? {}).length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {post.publishedTo.instagram && <PlatformBadge label="IG" color="#e1306c" />}
                            {post.publishedTo.tiktok    && <PlatformBadge label="TT" color="#010101" />}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center flex-shrink-0">
                        <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-4)' }}>#{i + 1}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 mt-1" style={{ color: 'var(--color-text-4)' }} />
                      </div>
                    </Link>
                  ))}
                </div>

                {data.topPosts.length === 0 && (
                  <EmptyState
                    icon={<Camera className="w-6 h-6" />}
                    title="No posts yet"
                    sub="Post your first before/after to start tracking performance."
                    cta={{ label: 'Post work', href: '/work/post' }}
                  />
                )}
              </Section>
            )}

            {/* ── Revenue last 30 days ── */}
            <Section title="Revenue (last 30 days)">
              <div className="grid grid-cols-2 gap-3">
                <BigStat
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Earned"
                  value={'$' + data.recentRevenue.toLocaleString()}
                  accent="#22c55e"
                  sub="From confirmed jobs"
                />
                <BigStat
                  icon={<BarChart2 className="w-4 h-4" />}
                  label="Jobs done"
                  value={String(data.recentJobCount)}
                  accent="#fb923c"
                  sub="Completed & confirmed"
                />
              </div>
              {data.rating && (
                <div className="rounded-xl p-3 flex items-center gap-3 mt-1" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <Star className="w-4 h-4 flex-shrink-0" style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                    <span className="font-bold">{data.rating.toFixed(1)}</span>
                    <span style={{ color: 'var(--color-text-4)' }}> avg rating · {data.reviewCount} review{data.reviewCount !== 1 ? 's' : ''}</span>
                  </p>
                </div>
              )}
            </Section>

            {/* ── Social connections ── */}
            <Section title="Connected Accounts">
              <div className="space-y-2">
                <ConnectionRow
                  label="Instagram"
                  color="#e1306c"
                  icon="📸"
                  connection={data.connections.instagram}
                  handle={data.handles.instagram}
                  connectHref="/studio"
                />
                <ConnectionRow
                  label="TikTok"
                  color="#010101"
                  icon="🎵"
                  connection={data.connections.tiktok}
                  handle={data.handles.tiktok}
                  connectHref="/studio"
                />
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-4)' }}>
                Connected accounts auto-post your work to Instagram and TikTok when you publish. Manage in{' '}
                <Link href="/studio" style={{ color: 'var(--color-brand)' }}>Studio →</Link>
              </p>
            </Section>

            {/* ── Growth tips ── */}
            <Section title="Growth Tips">
              <div className="space-y-2">
                {data.audience.followerCount < 50 && (
                  <Tip icon="🔗" text={`Share your bio link (repairai.pro/pro/${user?.uid}) in your Instagram and TikTok bio right now. Every profile visitor is a potential customer.`} />
                )}
                {data.audience.postCount < 5 && (
                  <Tip icon="📸" text="Pros who post 4+ times per month get 3× more profile visits. Aim for one post per week — even a quick photo works." />
                )}
                {!data.connections.instagram && !data.connections.tiktok && (
                  <Tip icon="🚀" text="Connect Instagram or TikTok in Studio. Each post you make on RepairAI will automatically cross-post — zero extra effort." />
                )}
                {data.topPosts.some(p => p.beforeAfter) === false && data.audience.postCount > 0 && (
                  <Tip icon="↔️" text='Before/after posts get 2.4× more likes than regular photos. Try toggling "Before & After" on your next post.' />
                )}
                {data.audience.postCount > 0 && !data.topPosts.some(p => p.hasVideo) && (
                  <Tip icon="🎬" text="Video posts get the most reach. A 15-second clip of your work — even shaky phone footage — outperforms photos by 5× on TikTok." />
                )}
                {data.topPosts.length === 0 && (
                  <Tip icon="⚡" text="Post your first job today. It shows on the public work feed and your profile — every post is a 24/7 customer magnet." />
                )}
              </div>
            </Section>

          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-3)' }}>{title}</h2>
        {action}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function BigStat({ icon, label, value, accent, sub }: { icon: React.ReactNode; label: string; value: string; accent: string; sub: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: accent }}>{icon}<span className="text-[10px] font-bold uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-extrabold leading-tight" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{sub}</p>
    </div>
  );
}

function MonthStat({ label, value, delta, color }: { label: string; value: number; delta: number | null; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-2)' }}>
      <p className="text-xl font-extrabold" style={{ color: value > 0 ? color : 'var(--color-text-4)' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</p>
      {delta !== null && (
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {delta >= 0
            ? <TrendingUp className="w-3 h-3" style={{ color: '#22c55e' }} />
            : <TrendingDown className="w-3 h-3" style={{ color: '#f87171' }} />}
          <span className="text-[10px] font-bold" style={{ color: delta >= 0 ? '#22c55e' : '#f87171' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        </div>
      )}
    </div>
  );
}

function PlatformBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: color, color: '#fff' }}>
      {label}
    </span>
  );
}

function ConnectionRow({ label, color, icon, connection, handle, connectHref }: {
  label: string; color: string; icon: string;
  connection: { connected: boolean; username: string } | null;
  handle?: string; connectHref: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
          {connection?.connected
            ? `@${connection.username} · auto-post enabled`
            : handle
            ? `@${handle} · not auto-posting`
            : 'Not connected'}
        </p>
      </div>
      {connection?.connected
        ? <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>✓ Live</span>
        : <Link href={connectHref} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', textDecoration: 'none' }}>Connect</Link>
      }
    </div>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3)' }}>{text}</p>
    </div>
  );
}

function EmptyState({ icon, title, sub, cta }: { icon: React.ReactNode; title: string; sub: string; cta?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-3">
      <div style={{ color: 'var(--color-text-4)' }}>{icon}</div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-3)' }}>{title}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>{sub}</p>
      </div>
      {cta && <Link href={cta.href} className="btn btn-primary btn-sm">{cta.label}</Link>}
    </div>
  );
}

function SignInWall() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="card p-8 text-center max-w-sm w-full">
        <BarChart2 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-brand)' }} />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Analytics</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-3)' }}>Sign in to see how your content is performing.</p>
        <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In</Link>
      </div>
    </div>
  );
}
