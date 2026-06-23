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
  Sparkles, Wallet, ChevronRight, Link2, Instagram, AtSign, Globe,
  Youtube, Unlink, ExternalLink, Edit3, Save, X,
} from 'lucide-react';
import StudioAssistant from '@/components/StudioAssistant';

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
  const [bioCopied, setBioCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  // Social media connections
  const [socialHandles, setSocialHandles] = useState<Record<string, string>>({});
  const [socialConnections, setSocialConnections] = useState<Record<string, { connected: boolean; username?: string }>>({});
  const [editingHandles, setEditingHandles] = useState(false);
  const [handleDraft, setHandleDraft] = useState<Record<string, string>>({});
  const [savingHandles, setSavingHandles] = useState(false);
  const [socialToast, setSocialToast] = useState<string | null>(null);

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

  // Load social handles + check OAuth callback result
  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(async (token: string) => {
      const res = await fetch(`/api/contractors/${user.uid}/social-handles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.handles) { setSocialHandles(d.handles); setHandleDraft(d.handles); }
    }).catch(() => {});

    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const social = params.get('social');
    const status = params.get('status');
    const username = params.get('username');
    if (social && status) {
      if (status === 'connected') {
        setSocialToast(`✓ ${social.charAt(0).toUpperCase() + social.slice(1)} connected${username ? ` as @${username}` : ''}!`);
        if (social === 'instagram' && username) setSocialConnections(p => ({ ...p, instagram: { connected: true, username } }));
        if (social === 'tiktok' && username) setSocialConnections(p => ({ ...p, tiktok: { connected: true, username } }));
      } else if (status === 'error') {
        setSocialToast(`⚠ Could not connect ${social}. Try again.`);
      }
      // Clean URL
      window.history.replaceState({}, '', '/studio');
      setTimeout(() => setSocialToast(null), 5000);
    }
  }, [user]);

  async function saveHandles() {
    if (!user) return;
    setSavingHandles(true);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/contractors/${user.uid}/social-handles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(handleDraft),
      });
      setSocialHandles({ ...handleDraft });
      setEditingHandles(false);
    } catch { /* ignore */ }
    finally { setSavingHandles(false); }
  }

  async function connectInstagram() {
    if (!user) return;
    const token = await user.getIdToken();
    window.location.href = `/api/social/instagram/connect?token=${token}`;
  }

  async function connectTikTok() {
    if (!user) return;
    const token = await user.getIdToken();
    window.location.href = `/api/social/tiktok/connect?token=${token}`;
  }

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
  const bioLinkUrl = user ? `${origin}/pro/${user.uid}` : '';

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

              {/* Bio link (for Instagram/TikTok bio) */}
              <div className="p-4 space-y-3" style={{ background: 'var(--color-surface)' }}>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Link2 className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-4)' }}>Your social bio link</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs truncate" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }}>
                      {bioLinkUrl.replace(/^https?:\/\//, '')}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(bioLinkUrl); setBioCopied(true); setTimeout(() => setBioCopied(false), 2000); }} className="btn btn-secondary btn-sm flex-shrink-0">
                      {bioCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-4)' }}>
                    Paste this in your Instagram and TikTok bio — it opens a beautiful booking page with your work, reviews, and hire button.
                  </p>
                  <a href={bioLinkUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1 mt-1" style={{ color: '#818cf8', textDecoration: 'none' }}>
                    Preview your page <ExternalLink className="w-3 h-3" />
                  </a>
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

            {/* ── Social media connections ── */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between p-4" style={{ background: 'var(--color-surface)' }}>
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4" style={{ color: '#818cf8' }} />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Social Media Accounts</h2>
                </div>
                {!editingHandles
                  ? <button onClick={() => { setHandleDraft({ ...socialHandles }); setEditingHandles(true); }} className="text-xs flex items-center gap-1" style={{ color: '#818cf8' }}><Edit3 className="w-3 h-3" /> Edit handles</button>
                  : <div className="flex gap-2">
                      <button onClick={() => setEditingHandles(false)} className="text-xs" style={{ color: 'var(--color-text-4)' }}><X className="w-3.5 h-3.5" /></button>
                      <button onClick={saveHandles} disabled={savingHandles} className="text-xs flex items-center gap-1 font-semibold" style={{ color: '#22c55e' }}>
                        {savingHandles ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                      </button>
                    </div>
                }
              </div>

              <div className="p-4 space-y-3" style={{ background: 'var(--color-bg-2)' }}>
                {socialToast && (
                  <div className="rounded-xl px-3 py-2 text-xs font-medium" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                    {socialToast}
                  </div>
                )}

                {/* Instagram */}
                <SocialRow
                  icon={<IgIcon />}
                  label="Instagram"
                  handle={socialConnections.instagram?.username ?? socialHandles.instagram}
                  connected={socialConnections.instagram?.connected}
                  editing={editingHandles}
                  draftValue={handleDraft.instagram ?? ''}
                  placeholder="your_username"
                  onDraft={v => setHandleDraft(p => ({ ...p, instagram: v }))}
                  onConnect={connectInstagram}
                  profileUrl={socialHandles.instagram ? `https://instagram.com/${socialHandles.instagram}` : undefined}
                />

                {/* TikTok */}
                <SocialRow
                  icon={<TtIcon />}
                  label="TikTok"
                  handle={socialConnections.tiktok?.username ?? socialHandles.tiktok}
                  connected={socialConnections.tiktok?.connected}
                  editing={editingHandles}
                  draftValue={handleDraft.tiktok ?? ''}
                  placeholder="your_username"
                  onDraft={v => setHandleDraft(p => ({ ...p, tiktok: v }))}
                  onConnect={connectTikTok}
                  profileUrl={socialHandles.tiktok ? `https://tiktok.com/@${socialHandles.tiktok}` : undefined}
                />

                {/* Facebook */}
                <SocialRow
                  icon={<span style={{ fontSize: 18 }}>📘</span>}
                  label="Facebook"
                  handle={socialHandles.facebook}
                  editing={editingHandles}
                  draftValue={handleDraft.facebook ?? ''}
                  placeholder="facebook.com/yourpage"
                  onDraft={v => setHandleDraft(p => ({ ...p, facebook: v }))}
                />

                {/* YouTube */}
                <SocialRow
                  icon={<span style={{ fontSize: 18 }}>▶️</span>}
                  label="YouTube"
                  handle={socialHandles.youtube}
                  editing={editingHandles}
                  draftValue={handleDraft.youtube ?? ''}
                  placeholder="@yourchannel"
                  onDraft={v => setHandleDraft(p => ({ ...p, youtube: v }))}
                />

                {/* Website */}
                <SocialRow
                  icon={<Globe className="w-[18px] h-[18px]" style={{ color: '#94a3b8' }} />}
                  label="Website"
                  handle={socialHandles.website}
                  editing={editingHandles}
                  draftValue={handleDraft.website ?? ''}
                  placeholder="yourwebsite.com"
                  onDraft={v => setHandleDraft(p => ({ ...p, website: v }))}
                />

                <p className="text-[10px] pt-1" style={{ color: 'var(--color-text-4)' }}>
                  These links appear on your social bio page and contractor profile so customers can find you everywhere.
                </p>
              </div>
            </div>

            {/* ── Wrapped promo ── */}
            <Link href="/studio/wrapped" style={{ textDecoration: 'none', display: 'block' }}>
              <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63)', border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer' }}>
                <div style={{ fontSize: 32, flexShrink: 0 }}>🎁</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                    Your {new Date().getFullYear()} {new Date().getMonth() < 11 ? 'Mid-Year' : 'Year-End'} Wrapped is ready
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#818cf8' }}>
                    See your jobs, earnings, top post, and milestones — shareable card included.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#818cf8' }} />
              </div>
            </Link>

            {/* ── AI Business Advisor ── */}
            <StudioAssistant />

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
              <QuickLink href="/studio/analytics" icon={<BarChart2 className="w-4 h-4" />} label="Analytics" />
              <QuickLink href="/studio/wrapped" icon={<Sparkles className="w-4 h-4" />} label="My Wrapped" />
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

function SocialRow({
  icon, label, handle, connected, editing, draftValue, placeholder, onDraft, onConnect, profileUrl,
}: {
  icon: React.ReactNode; label: string; handle?: string; connected?: boolean;
  editing: boolean; draftValue: string; placeholder: string;
  onDraft: (v: string) => void; onConnect?: () => void; profileUrl?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-4)' }}>{label}</p>
        {editing ? (
          <input
            value={draftValue}
            onChange={e => onDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full mt-0.5 px-2 py-1 rounded-lg text-xs outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        ) : handle ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            {connected && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', flexShrink: 0 }} />}
            {profileUrl
              ? <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#818cf8', textDecoration: 'none' }}>@{handle}</a>
              : <span className="text-xs" style={{ color: 'var(--color-text-3)' }}>@{handle}</span>
            }
            {connected && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>Auto-post ON</span>}
          </div>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-4)' }}>Not connected</p>
        )}
      </div>
      {!editing && onConnect && (
        connected
          ? <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>✓ Connected</span>
          : <button onClick={onConnect} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
              Connect
            </button>
      )}
    </div>
  );
}

function IgIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig2)" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" stroke="url(#ig2)" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1" fill="url(#ig2)"/>
    </svg>
  );
}

function TtIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34v-6.9a8.18 8.18 0 0 0 4.78 1.52V6.49a4.85 4.85 0 0 1-1.02-.2z"/>
    </svg>
  );
}
