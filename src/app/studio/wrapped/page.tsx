'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, Download, Share2, Loader2, Check } from 'lucide-react';

type WrappedData = {
  year: number; isMidYear: boolean; name: string; trade: string; city: string | null;
  photoUrl: string | null;
  stats: {
    jobCount: number; totalEarned: number; avgJobValue: number; jobsPerMonth: string;
    topTrade: string; busiestMonth: string | null;
    followerCount: number; postCount: number; totalLikes: number; totalComments: number;
    rating: number | null; reviewCount: number;
  };
  topPost: { id: string; photo: string | null; likeCount: number; caption: string } | null;
  milestones: string[];
};

const TRADE_EMOJI: Record<string, string> = {
  Plumbing:'🔧', Electrical:'⚡', HVAC:'❄️', Carpentry:'🪚',
  Painting:'🎨', Roofing:'🏠', Landscaping:'🌿', Cleaning:'✨',
};

export default function WrappedPage() {
  const { user } = useAuth();
  const [data, setData]       = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shared, setShared]   = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(async (token: string) => {
      const res = await fetch('/api/contractors/wrapped', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setData(d);
    }).finally(() => setLoading(false));
  }, [user]);

  function shareCard() {
    const url = window.location.href;
    const text = data
      ? `I completed ${data.stats.jobCount} jobs and earned $${data.stats.totalEarned.toLocaleString()} in ${data.year} on RepairAI Pro! 🔥`
      : 'Check out my RepairAI Pro year in review!';
    if (navigator.share) {
      navigator.share({ title: 'My RepairAI Wrapped', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="card p-8 text-center max-w-sm w-full">
          <p className="text-2xl mb-3">🎁</p>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Your Wrapped</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-3)' }}>Sign in to see your year in review.</p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-md mx-auto px-4 py-6">

        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/studio" className="p-2 rounded-xl" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
          </Link>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {data ? `${data.year} ${data.isMidYear ? 'Mid-Year' : 'Year-End'} Wrapped` : 'Your Wrapped'}
          </h1>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} />
          </div>
        )}

        {data && (
          <>
            {/* ── The Card ── */}
            <div
              ref={cardRef}
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                background: 'linear-gradient(160deg, #0f0c29, #302b63, #24243e)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 32px 80px -16px rgba(99,102,241,0.4)',
              }}
            >
              {/* Header */}
              <div style={{ padding: '28px 24px 0', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 20, marginBottom: 16,
                  background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    RepairAI Pro · {data.year} {data.isMidYear ? 'Mid-Year' : 'Wrapped'}
                  </span>
                </div>

                {/* Avatar */}
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
                  background: data.photoUrl ? 'transparent' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  border: '3px solid rgba(99,102,241,0.6)',
                  boxShadow: '0 0 32px rgba(99,102,241,0.5)',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28,
                }}>
                  {data.photoUrl
                    ? <img src={data.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (TRADE_EMOJI[data.trade] ?? '🔨')}
                </div>

                <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: 0 }}>{data.name}</h2>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
                  {data.trade}{data.city ? ` · ${data.city}` : ''}
                </p>
              </div>

              {/* Big number hero */}
              <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Total earned in {data.year}
                </p>
                <p style={{ color: '#4ade80', fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>
                  ${data.stats.totalEarned.toLocaleString()}
                </p>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                  across {data.stats.jobCount} completed job{data.stats.jobCount !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '20px 24px' }}>
                <StatChip label="Avg job" value={`$${data.stats.avgJobValue.toLocaleString()}`} color="#fbbf24" />
                <StatChip label="Per month" value={`${data.stats.jobsPerMonth}`} color="#818cf8" />
                <StatChip label="Followers" value={data.stats.followerCount.toLocaleString()} color="#34d399" />
                <StatChip label="Posts" value={data.stats.postCount.toString()} color="#f472b6" />
                <StatChip label="Likes" value={data.stats.totalLikes.toLocaleString()} color="#f97316" />
                {data.stats.rating && (
                  <StatChip label="Rating" value={`${data.stats.rating.toFixed(1)} ★`} color="#fbbf24" />
                )}
              </div>

              {/* Highlights */}
              <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.stats.busiestMonth && (
                  <HighlightRow icon="📅" label="Busiest month" value={data.stats.busiestMonth} />
                )}
                <HighlightRow icon="🔧" label="Most common trade" value={data.stats.topTrade} />
                {data.stats.reviewCount > 0 && (
                  <HighlightRow icon="⭐" label="Reviews earned" value={`${data.stats.reviewCount} review${data.stats.reviewCount !== 1 ? 's' : ''}`} />
                )}
              </div>

              {/* Milestones */}
              {data.milestones.length > 0 && (
                <div style={{ margin: '0 24px 20px', padding: '12px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Milestones</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.milestones.map((m, i) => (
                      <p key={i} style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{m}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Top post */}
              {data.topPost && data.topPost.photo && (
                <div style={{ margin: '0 24px 24px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
                    🔥 Your top post
                  </p>
                  <Link href={`/work/${data.topPost.id}`} style={{ display: 'block', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', position: 'relative' }}>
                    <img src={data.topPost.photo} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)' }} />
                    <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                      <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, margin: 0 }}>{data.topPost.caption || 'View post'}</p>
                      <p style={{ color: '#fbbf24', fontSize: 11, margin: '2px 0 0' }}>❤ {data.topPost.likeCount} likes</p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                <p style={{ color: '#334155', fontSize: 11 }}>
                  repairai.pro · Powered by AI
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={shareCard}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 8px 24px -8px rgba(99,102,241,0.6)',
                }}
              >
                {shared
                  ? <><Check className="w-4 h-4" /> Copied link!</>
                  : <><Share2 className="w-4 h-4" /> Share your Wrapped</>}
              </button>
              <Link
                href={`/studio`}
                style={{
                  padding: '13px 16px', borderRadius: 14,
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-3)', fontWeight: 600, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
                }}
              >
                Studio
              </Link>
            </div>

            {/* Social copy hint */}
            <p style={{ textAlign: 'center', fontSize: 12, marginTop: 10, color: 'var(--color-text-4)' }}>
              Screenshot this card and post it to Instagram or TikTok — your followers will love it.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 14, background: 'rgba(255,255,255,0.05)' }}>
      <p style={{ fontSize: 18, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

function HighlightRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>{label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}
