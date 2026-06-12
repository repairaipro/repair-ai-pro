'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Hammer, MapPin, Loader2, Sparkles, ArrowRight, Camera,
} from 'lucide-react';

type FeedItem = {
  jobId: string;
  trade: string;
  city: string | null;
  photos: { url: string; caption: string }[];
  contractor: { id: string; name: string; photoUrl: string | null } | null;
  completedAt: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function WorkFeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeFilter, setTradeFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/public/work-feed')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            <Camera className="w-3 h-3" /> Real jobs, real photos
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Recent Work
          </h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--color-text-4)' }}>
            Every photo here comes from a verified, completed job on RepairAI Pro —
            documented by the pro who did the work.
          </p>
        </div>

        {/* Trade filter pills */}
        {trades.length > 1 && (
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

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Hammer className="w-8 h-8" style={{ color: 'var(--color-text-4)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                Completed work will appear here
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-4)' }}>
                As pros finish jobs and document them with photos, this feed fills up.
              </p>
            </div>
            <Link href="/jobs/new" className="btn btn-primary btn-sm">
              <Sparkles className="w-3.5 h-3.5" /> Post the first job
            </Link>
          </div>
        )}

        {/* Feed grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <motion.div
              key={item.jobId}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
              className="card overflow-hidden flex flex-col"
            >
              {/* Photos — side-by-side when there are two (before/after feel) */}
              <div className={`grid ${item.photos.length > 1 ? 'grid-cols-2 gap-0.5' : 'grid-cols-1'}`}>
                {item.photos.map((p, pi) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={pi}
                    src={p.url}
                    alt={p.caption || `${item.trade} work`}
                    className="w-full h-44 object-cover"
                    loading="lazy"
                  />
                ))}
              </div>

              <div className="p-4 flex flex-col gap-2 flex-1">
                {/* Trade + location + time */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {item.trade}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                    {timeAgo(item.completedAt)}
                  </span>
                </div>

                {/* Caption */}
                {item.photos[0]?.caption && (
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-3)' }}>
                    {item.photos[0].caption}
                  </p>
                )}

                {/* Contractor + city */}
                <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  {item.contractor ? (
                    <Link
                      href={`/contractor/${item.contractor.id}`}
                      className="flex items-center gap-2 group"
                    >
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
                      <span className="text-xs font-medium group-hover:underline" style={{ color: 'var(--color-text-2)' }}>
                        {item.contractor.name}
                      </span>
                    </Link>
                  ) : <span />}
                  {item.city && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-4)' }}>
                      <MapPin className="w-2.5 h-2.5" /> {item.city}
                    </span>
                  )}
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
            <Link href="/jobs/new" className="btn btn-primary btn-sm">
              Get it fixed <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
