'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import {
  Hammer, MapPin, Loader2, Sparkles, ArrowRight, Camera, Heart, BadgeCheck, MessageCircle,
} from 'lucide-react';

type Contractor = { id: string; name: string; photoUrl: string | null; city?: string | null };

type FeedItem = {
  key: string;
  kind: 'post' | 'job';
  id: string;
  trade: string;
  city: string | null;
  caption: string;
  photos: { url: string; caption?: string }[];
  beforeAfter: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  contractor: Contractor | null;
  at: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function WorkFeedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [likeBusy, setLikeBusy] = useState<string | null>(null);
  const [view, setView] = useState<'discover' | 'following'>('discover');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

      // Following view: posts from followed pros only (no verified-job feed mix)
      if (view === 'following') {
        if (!user) { setItems([]); setLoading(false); return; }
        const res = await fetch('/api/posts?following=true', { headers });
        const data = await res.json();
        const postItems: FeedItem[] = (data.posts ?? []).map((p: any) => ({
          key: `post_${p.id}`,
          kind: 'post' as const,
          id: p.id,
          trade: p.trade,
          city: p.contractor?.city ?? null,
          caption: p.caption ?? '',
          photos: (p.photos ?? []).map((url: string) => ({ url })),
          beforeAfter: p.beforeAfter ?? false,
          likeCount: p.likeCount ?? 0,
          commentCount: p.commentCount ?? 0,
          likedByMe: p.likedByMe ?? false,
          contractor: p.contractor,
          at: p.createdAt,
        }));
        setItems(postItems);
        setLoading(false);
        return;
      }

      const [jobsRes, postsRes] = await Promise.all([
        fetch('/api/public/work-feed').then((r) => (r.ok ? r.json() : { items: [] })),
        fetch('/api/posts', { headers }).then((r) => (r.ok ? r.json() : { posts: [] })),
      ]);

      const jobItems: FeedItem[] = (jobsRes.items ?? []).map((j: any) => ({
        key: `job_${j.jobId}`,
        kind: 'job',
        id: j.jobId,
        trade: j.trade,
        city: j.city,
        caption: j.photos?.[0]?.caption ?? '',
        photos: j.photos ?? [],
        beforeAfter: (j.photos?.length ?? 0) > 1,
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        contractor: j.contractor,
        at: j.completedAt,
      }));

      const postItems: FeedItem[] = (postsRes.posts ?? []).map((p: any) => ({
        key: `post_${p.id}`,
        kind: 'post',
        id: p.id,
        trade: p.trade,
        city: p.contractor?.city ?? null,
        caption: p.caption ?? '',
        photos: (p.photos ?? []).map((url: string) => ({ url })),
        beforeAfter: p.beforeAfter ?? false,
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        likedByMe: p.likedByMe ?? false,
        contractor: p.contractor,
        at: p.createdAt,
      }));

      const merged = [...jobItems, ...postItems].sort(
        (a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime()
      );
      setItems(merged);
    } catch { /* keep whatever rendered */ }
    finally { setLoading(false); }
  }, [user, view]);

  useEffect(() => { load(); }, [load]);

  async function toggleLike(item: FeedItem) {
    if (!user) { window.location.href = '/auth/signin'; return; }
    if (item.kind !== 'post' || likeBusy === item.id) return;
    setLikeBusy(item.id);

    // Optimistic flip
    setItems((prev) => prev.map((it) => it.key === item.key
      ? { ...it, likedByMe: !it.likedByMe, likeCount: it.likeCount + (it.likedByMe ? -1 : 1) }
      : it));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/posts/${item.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setItems((prev) => prev.map((it) => it.key === item.key
          ? { ...it, likedByMe: data.liked, likeCount: data.likeCount }
          : it));
      }
    } catch { /* optimistic state stands until reload */ }
    finally { setLikeBusy(null); }
  }

  const trades = Array.from(new Set(items.map((i) => i.trade))).sort();
  const filtered = tradeFilter === 'all' ? items : items.filter((i) => i.trade === tradeFilter);

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
          >
            <Camera className="w-3 h-3" /> Real pros, real work
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Work Feed
          </h1>
          <p className="text-sm max-w-md mx-auto mb-4" style={{ color: 'var(--color-text-4)' }}>
            Transformations by local pros. Posts with a <BadgeCheck className="w-3.5 h-3.5 inline" style={{ color: '#22c55e' }} /> badge
            were completed and paid through RepairAI Pro.
          </p>
          <Link href="/work/post" className="btn btn-secondary btn-sm">
            <Camera className="w-3.5 h-3.5" /> Share your work
          </Link>
        </div>

        {/* Discover / Following toggle */}
        <div className="flex justify-center">
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            {(['discover', 'following'] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); setTradeFilter('all'); }}
                className="px-5 py-2 text-sm font-medium capitalize transition-all"
                style={view === v
                  ? { background: 'var(--color-brand)', color: '#fff' }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-3)' }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Trade filter pills */}
        {view === 'discover' && trades.length > 1 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {['all', ...trades].map((t) => (
              <button
                key={t}
                onClick={() => setTradeFilter(t)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  tradeFilter === t
                    ? { background: 'var(--color-brand)', color: '#fff' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }
                }
              >
                {t === 'all' ? 'All trades' : t}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
          </div>
        )}

        {/* Empty — following view */}
        {!loading && view === 'following' && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Heart className="w-8 h-8" style={{ color: 'var(--color-text-4)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {user ? 'Follow pros to fill this feed' : 'Sign in to follow pros'}
              </h3>
              <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--color-text-4)' }}>
                {user
                  ? 'Tap Follow on any contractor’s profile and their new work shows up here.'
                  : 'Sign in, then follow contractors whose work you love.'}
              </p>
            </div>
            <button onClick={() => setView('discover')} className="btn btn-primary btn-sm">
              Discover pros
            </button>
          </div>
        )}

        {/* Empty — discover view */}
        {!loading && view === 'discover' && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Hammer className="w-8 h-8" style={{ color: 'var(--color-text-4)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Be the first to post
              </h3>
              <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--color-text-4)' }}>
                Pros: share photos of work you&apos;re proud of. Homeowners will find you here.
              </p>
            </div>
            <Link href="/work/post" className="btn btn-primary btn-sm">
              <Camera className="w-3.5 h-3.5" /> Share your work
            </Link>
          </div>
        )}

        {/* Feed grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
              className="card overflow-hidden flex flex-col"
            >
              {/* Photos — side-by-side for before/after. Posts open their permalink. */}
              {(() => {
                const PhotoInner = (
                  <div className={`relative grid ${item.photos.length > 1 ? 'grid-cols-2 gap-0.5' : 'grid-cols-1'}`}>
                    {item.photos.slice(0, 2).map((p, pi) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={pi}
                        src={p.url}
                        alt={item.caption || `${item.trade} work`}
                        className="w-full h-44 object-cover"
                        loading="lazy"
                      />
                    ))}
                    {item.beforeAfter && item.photos.length > 1 && (
                      <>
                        <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}>BEFORE</span>
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}>AFTER</span>
                      </>
                    )}
                  </div>
                );
                return item.kind === 'post'
                  ? <Link href={`/work/${item.id}`} className="block">{PhotoInner}</Link>
                  : PhotoInner;
              })()}

              <div className="p-4 flex flex-col gap-2 flex-1">
                {/* Trade + verified + time */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {item.trade}
                  </span>
                  {item.kind === 'job' && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                    >
                      <BadgeCheck className="w-2.5 h-2.5" /> Verified job
                    </span>
                  )}
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-4)' }}>
                    {timeAgo(item.at)}
                  </span>
                </div>

                {/* Caption */}
                {item.caption && (
                  <p className="text-xs line-clamp-3" style={{ color: 'var(--color-text-3)' }}>
                    {item.caption}
                  </p>
                )}

                {/* Contractor + city + like */}
                <div className="flex items-center justify-between mt-auto pt-2 gap-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  {item.contractor ? (
                    <Link href={`/contractor/${item.contractor.id}`} className="flex items-center gap-2 group min-w-0">
                      <div
                        className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
                      >
                        {item.contractor.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.contractor.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          item.contractor.name[0]?.toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-medium group-hover:underline truncate" style={{ color: 'var(--color-text-2)' }}>
                        {item.contractor.name}
                      </span>
                    </Link>
                  ) : <span />}

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.city && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                        <MapPin className="w-2.5 h-2.5" /> {item.city}
                      </span>
                    )}
                    {item.kind === 'post' && (
                      <>
                        <Link
                          href={`/work/${item.id}`}
                          className="flex items-center gap-1 text-[11px] font-semibold"
                          style={{ color: 'var(--color-text-4)' }}
                          aria-label="Comments"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {item.commentCount > 0 && item.commentCount}
                        </Link>
                        <button
                          onClick={() => toggleLike(item)}
                          className="flex items-center gap-1 text-[11px] font-semibold transition-transform active:scale-110"
                          style={{ color: item.likedByMe ? '#f87171' : 'var(--color-text-4)' }}
                          aria-label={item.likedByMe ? 'Unlike' : 'Like'}
                        >
                          <Heart className="w-3.5 h-3.5" fill={item.likedByMe ? '#f87171' : 'none'} />
                          {item.likeCount > 0 && item.likeCount}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        {!loading && filtered.length > 0 && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
          >
            <h3 className="font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              Need work like this done?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-4)' }}>
              Describe your problem — AI diagnoses it and matches you with pros like these.
            </p>
            <Link href="/diagnose" className="btn btn-primary btn-sm">
              <Sparkles className="w-3.5 h-3.5" /> Diagnose It Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
