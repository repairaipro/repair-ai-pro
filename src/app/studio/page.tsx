'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import {
  DollarSign, Clock, TrendingUp, Star, ShieldCheck, Zap, Inbox,
  Briefcase, CheckCircle2, Users, Heart, Eye, Share2, Check, Copy,
  ArrowRight, ArrowUpRight, Loader2, Settings, Camera, BarChart2,
  Sparkles, Wallet, ChevronRight,
} from 'lucide-react';

type Summary = {
  profile: { name: string | null; photoUrl: string | null; trade: string | null; availability: string; verificationStatus: string; stripeConnectVerified: boolean };
  money: { weekEarnings: number; monthEarnings: number; lifetimeEarnings: number; pendingPayout: number };
  reputation: { rating: number; reviewCount: number; qualityScore: number; responseScore: number; verifiedSpecialties: number; jobsCompleted: number };
  pipeline: { newLeads: number; active: number; awaitingConfirm: number; completedThisMonth: number };
  audience: { followerCount: number; postCount: number; postLikes: number; postComments: number };
  actionItems: { jobId: string; label: string; status: string; description: string }[];
};

const usd = (n: number) => '$' + (n ?? 0).toLocaleString('en-US');

export default function ContractorStudio() {
  const { user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/contractors/os-summary', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) { setData(d); setAvailable(d.profile.availability === 'available'); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function toggleAvailability() {
    if (!user || savingAvail) return;
    const next = !available;
    setAvailable(next);
    setSavingAvail(true);
    try {
      await updateDoc(doc(db, 'contractors', user.uid), {
        availability: next ? 'available' : 'offline',
        lastActiveAt: new Date(),
      });
    } catch { setAvailable(!next); }
    finally { setSavingAvail(false); }
  }

  const profileUrl = user ? `${origin}/contractor/${user.uid}` : '';

  function copyLink() {
    navigator.clipboard.writeText(profileUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function shareTo(network: 'facebook' | 'twitter' | 'whatsapp') {
    const text = encodeURIComponent(`Check out my work on RepairAI Pro`);
    const u = encodeURIComponent(profileUrl);
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      twitter: `https://twitter.com/intent/tweet?url=${u}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${u}`,
    };
    window.open(urls[network], '_blank', 'noopener,noreferrer,width=600,height=540');
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="card p-8 text-center max-w-sm w-full">
          <Briefcase className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-brand)' }} />
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>Contractor Studio</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-3)' }}>Sign in to run your business from one command center.</p>
          <Link href="/auth/signin" className="btn btn-primary btn-full">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Command header ── */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
            {data?.profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.profile.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (data?.profile.name?.[0]?.toUpperCase() ?? 'C')}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight truncate" style={{ color: 'var(--color-text)' }}>
              {data?.profile.name ? `Hi, ${data.profile.name.split(' ')[0]}` : 'Contractor Studio'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
              {data?.profile.trade ?? 'Your business command center'}
            </p>
          </div>

          {/* Availability toggle */}
          <button
            onClick={toggleAvailability}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
            style={available
              ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)' }
              : { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <span className="relative flex w-2.5 h-2.5">
              {available && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: '#22c55e' }} />}
              <span className="relative inline-flex rounded-full w-2.5 h-2.5" style={{ background: available ? '#22c55e' : '#6b7280' }} />
            </span>
            <span className="text-xs font-bold" style={{ color: available ? '#22c55e' : 'var(--color-text-4)' }}>
              {savingAvail ? '…' : available ? 'Available' : 'Offline'}
            </span>
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand)' }} /></div>
        )}

        {data && !loading && (
          <>
            {/* ── Money row ── */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile icon={<TrendingUp className="w-4 h-4" />} label="This week" value={usd(data.money.weekEarnings)} accent="#22c55e" />
              <StatTile icon={<Wallet className="w-4 h-4" />} label="Pending payout" value={usd(data.money.pendingPayout)} accent="#fb923c" />
              <StatTile icon={<DollarSign className="w-4 h-4" />} label="Lifetime" value={usd(data.money.lifetimeEarnings)} accent="#818cf8" />
            </div>

            {/* ── Needs attention ── */}
            {(data.pipeline.newLeads > 0 || data.actionItems.length > 0) && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: '#fbbf24' }} />
                  <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-3)' }}>Needs your attention</h2>
                </div>

                {data.pipeline.newLeads > 0 && (
                  <Link href="/contractor-inbox" className="flex items-center gap-3 rounded-xl p-3 transition-colors" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                      <Inbox className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{data.pipeline.newLeads} new lead{data.pipeline.newLeads === 1 ? '' : 's'} waiting</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Respond fast — speed wins jobs</p>
                    </div>
                    <ArrowRight className="w-4 h-4" style={{ color: '#818cf8' }} />
                  </Link>
                )}

                {data.actionItems.map((a) => (
                  <Link key={a.jobId} href={`/jobs/${a.jobId}`} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface-2)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.12)' }}>
                      <Briefcase className="w-4 h-4" style={{ color: '#34d399' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{a.label}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-4)' }}>{a.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--color-text-4)' }} />
                  </Link>
                ))}
              </div>
            )}

            {/* ── Pipeline ── */}
            <div className="grid grid-cols-4 gap-3">
              <PipeTile label="New leads" value={data.pipeline.newLeads} color="#818cf8" href="/contractor-inbox" />
              <PipeTile label="Active" value={data.pipeline.active} color="#34d399" href="/dashboard/contractor/jobs" />
              <PipeTile label="Awaiting" value={data.pipeline.awaitingConfirm} color="#fb923c" href="/dashboard/contractor/jobs" />
              <PipeTile label="Done (mo)" value={data.pipeline.completedThisMonth} color="#22c55e" href="/dashboard/contractor/earnings" />
            </div>

            {/* ── GROW: the social-distribution engine ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
              <div className="p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" style={{ color: '#818cf8' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Grow your business</h2>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
                  Share your work where customers already scroll. Every share is a billboard with a booking button.
                </p>

                {/* Audience stats */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <MiniStat icon={<Users className="w-3.5 h-3.5" />} label="Followers" value={data.audience.followerCount} />
                  <MiniStat icon={<Camera className="w-3.5 h-3.5" />} label="Posts" value={data.audience.postCount} />
                  <MiniStat icon={<Heart className="w-3.5 h-3.5" />} label="Likes" value={data.audience.postLikes} />
                </div>
              </div>

              {/* Storefront link + share */}
              <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-4)' }}>Your storefront link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs truncate" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }}>
                      {profileUrl.replace(/^https?:\/\//, '')}
                    </div>
                    <button onClick={copyLink} className="btn btn-secondary btn-sm flex-shrink-0">
                      {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-4)' }}>
                    Put it in your truck wrap, Instagram bio, and Facebook page — it unfurls into a branded card.
                  </p>
                </div>

                {/* Share buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <ShareBtn onClick={() => shareTo('facebook')} label="Facebook" color="#1877f2" />
                  <ShareBtn onClick={() => shareTo('twitter')} label="X / Twitter" color="#0f172a" />
                  <ShareBtn onClick={() => shareTo('whatsapp')} label="WhatsApp" color="#25d366" />
                </div>

                {/* Post work CTA */}
                <Link href="/work/post" className="btn btn-primary btn-full">
                  <Camera className="w-4 h-4" /> Post a before/after
                </Link>
                {data.audience.postCount === 0 && (
                  <p className="text-[11px] text-center" style={{ color: 'var(--color-text-4)' }}>
                    Pros who post weekly get 3× more profile visits. Start with one job you&apos;re proud of.
                  </p>
                )}
              </div>
            </div>

            {/* ── Reputation ── */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-3)' }}>Reputation</h2>
                <Link href={user ? `/contractor/${user.uid}` : '#'} className="text-xs flex items-center gap-0.5" style={{ color: '#818cf8' }}>
                  View public profile <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <RepStat icon={<Star className="w-4 h-4" style={{ fill: '#fbbf24', color: '#fbbf24' }} />} value={data.reputation.rating > 0 ? data.reputation.rating.toFixed(1) : '—'} label={`${data.reputation.reviewCount} reviews`} />
                <RepStat icon={<ShieldCheck className="w-4 h-4" style={{ color: '#22c55e' }} />} value={data.reputation.qualityScore > 0 ? String(data.reputation.qualityScore) : '—'} label="Quality" />
                <RepStat icon={<Zap className="w-4 h-4" style={{ color: '#22d3ee' }} />} value={data.reputation.responseScore >= 75 ? 'Fast' : data.reputation.responseScore > 0 ? 'OK' : '—'} label="Response" />
                <RepStat icon={<CheckCircle2 className="w-4 h-4" style={{ color: '#818cf8' }} />} value={String(data.reputation.jobsCompleted)} label="Jobs done" />
              </div>
            </div>

            {/* ── Quick links ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickLink href="/dashboard/contractor/earnings" icon={<BarChart2 className="w-4 h-4" />} label="Earnings" />
              <QuickLink href="/dashboard/contractor/jobs" icon={<Briefcase className="w-4 h-4" />} label="My jobs" />
              <QuickLink href="/contractor-profile" icon={<Settings className="w-4 h-4" />} label="Profile" />
              <QuickLink href="/dashboard/contractor/settings" icon={<Wallet className="w-4 h-4" />} label="Payouts" />
            </div>

            {/* Stripe nudge */}
            {!data.profile.stripeConnectVerified && (
              <Link href="/dashboard/contractor/settings" className="flex items-center gap-3 rounded-2xl p-4" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
                <DollarSign className="w-5 h-5 flex-shrink-0" style={{ color: '#fb923c' }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Connect your bank to get paid</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>Verify with Stripe so payouts land automatically.</p>
                </div>
                <ArrowRight className="w-4 h-4" style={{ color: '#fb923c' }} />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Pieces ── */
function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${accent}1a`, color: accent }}>{icon}</div>
      <p className="text-lg font-extrabold leading-tight" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-[10px]" style={{ color: 'var(--color-text-4)' }}>{label}</p>
    </div>
  );
}

function PipeTile({ label, value, color, href }: { label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl p-3 text-center transition-transform hover:-translate-y-0.5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-xl font-extrabold" style={{ color: value > 0 ? color : 'var(--color-text-4)' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-4)' }}>{label}</p>
    </Link>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl p-2.5 flex flex-col items-center text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <span style={{ color: '#a5b4fc' }}>{icon}</span>
      <p className="text-sm font-bold mt-1" style={{ color: 'var(--color-text)' }}>{value.toLocaleString()}</p>
      <p className="text-[9px]" style={{ color: 'var(--color-text-4)' }}>{label}</p>
    </div>
  );
}

function RepStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-1">{icon}</div>
      <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-[9px]" style={{ color: 'var(--color-text-4)' }}>{label}</p>
    </div>
  );
}

function ShareBtn({ onClick, label, color }: { onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-transform active:scale-95" style={{ background: color, color: '#fff' }}>
      <Share2 className="w-3 h-3" /> {label}
    </button>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-xl p-3 transition-colors" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-2)' }}>
      <span style={{ color: 'var(--color-text-4)' }}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
