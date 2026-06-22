import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { sanitizeContractor } from '@/lib/publicContractor';

const TRADE_EMOJI: Record<string, string> = {
  Plumbing: '🔧', Electrical: '⚡', HVAC: '❄️', Carpentry: '🪚',
  Painting: '🎨', Roofing: '🏠', Landscaping: '🌿', Cleaning: '✨',
  'Appliance Repair': '🔌', Locksmith: '🔑', 'IT Support': '💻',
  'Auto Mechanic': '🚗', Security: '🛡️', 'Phone Repair': '📱',
};

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const snap = await adminDb.collection('contractors').doc(params.id).get();
  if (!snap.exists) return { title: 'Contractor | RepairAI Pro' };
  const d = snap.data()!;
  return {
    title: `${d.name ?? 'Contractor'} — ${d.trade ?? 'Repair Pro'} | RepairAI Pro`,
    description: d.bio ?? `Book ${d.name} on RepairAI Pro — verified local ${d.trade?.toLowerCase() ?? 'repair'} professional in ${d.city ?? 'your area'}.`,
  };
}

export default async function ProLinkPage({ params }: { params: { id: string } }) {
  const snap = await adminDb.collection('contractors').doc(params.id).get();
  if (!snap.exists) notFound();

  const contractor = sanitizeContractor(snap.id, snap.data()!);
  const raw = snap.data()!;
  const handles: Record<string, string> = raw.socialHandles ?? {};

  // Recent posts
  const postsSnap = await adminDb.collection('posts')
    .where('contractorId', '==', params.id)
    .orderBy('createdAt', 'desc')
    .limit(6)
    .get();
  const posts = postsSnap.docs.map(d => ({
    id: d.id,
    photo: d.data().photos?.[0] ?? d.data().poster ?? null,
    video: d.data().hasVideo ?? false,
  }));

  const emoji = TRADE_EMOJI[contractor.trade ?? ''] ?? '🔨';
  const rating = contractor.avgRating ?? contractor.rating;
  const stars = rating ? '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating)) : null;

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #0a0c14 0%, #0f1220 50%, #0a0c14 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 16px 48px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}>

        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: contractor.photoUrl ? 'transparent' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: '3px solid rgba(99,102,241,0.6)',
            boxShadow: '0 0 32px rgba(99,102,241,0.4)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
          }}>
            {contractor.photoUrl
              ? <img src={contractor.photoUrl} alt={contractor.name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : emoji}
          </div>
          {(contractor.verificationStatus === 'verified' || contractor.licenseVerified) && (
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 24, height: 24, borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #0a0c14',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12,
            }}>✓</div>
          )}
        </div>

        {/* Name + trade */}
        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, textAlign: 'center', margin: 0 }}>
          {contractor.name ?? 'RepairAI Pro'}
        </h1>
        <p style={{ color: '#818cf8', fontSize: 15, fontWeight: 600, margin: '4px 0 0', textAlign: 'center' }}>
          {emoji} {contractor.trade}{contractor.city ? ` · ${contractor.city}` : ''}
        </p>

        {/* Stars + stats */}
        {stars && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ color: '#fbbf24', fontSize: 14, letterSpacing: 1 }}>{stars}</span>
            <span style={{ color: '#64748b', fontSize: 13 }}>
              {rating?.toFixed(1)} · {contractor.jobsCompleted ?? 0} jobs
            </span>
          </div>
        )}

        {/* Bio */}
        {contractor.bio && (
          <p style={{
            color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 12,
            lineHeight: 1.6, maxWidth: 360,
          }}>
            {contractor.bio}
          </p>
        )}

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {contractor.licenseVerified && (
            <span style={badgePill('#22c55e')}>✓ Licensed</span>
          )}
          {contractor.insuranceVerified && (
            <span style={badgePill('#6366f1')}>🛡 Insured</span>
          )}
          {contractor.stripeConnectVerified && (
            <span style={badgePill('#f59e0b')}>💳 Payments Verified</span>
          )}
          {contractor.subscriptionPlan === 'elite' && (
            <span style={badgePill('#8b5cf6')}>👑 Elite Pro</span>
          )}
          {contractor.subscriptionPlan === 'pro' && (
            <span style={badgePill('#6366f1')}>⭐ Pro</span>
          )}
        </div>

        {/* Social handles */}
        {Object.keys(handles).some(k => handles[k]) && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            {handles.instagram && (
              <a href={`https://instagram.com/${handles.instagram.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer" style={socialIcon}>
                <InstagramIcon />
              </a>
            )}
            {handles.tiktok && (
              <a href={`https://tiktok.com/@${handles.tiktok.replace('@', '')}`}
                target="_blank" rel="noopener noreferrer" style={socialIcon}>
                <TikTokIcon />
              </a>
            )}
            {handles.facebook && (
              <a href={handles.facebook.startsWith('http') ? handles.facebook : `https://facebook.com/${handles.facebook}`}
                target="_blank" rel="noopener noreferrer" style={socialIcon}>
                <FacebookIcon />
              </a>
            )}
            {handles.youtube && (
              <a href={handles.youtube.startsWith('http') ? handles.youtube : `https://youtube.com/@${handles.youtube}`}
                target="_blank" rel="noopener noreferrer" style={socialIcon}>
                <YouTubeIcon />
              </a>
            )}
            {handles.website && (
              <a href={handles.website.startsWith('http') ? handles.website : `https://${handles.website}`}
                target="_blank" rel="noopener noreferrer" style={socialIcon}>
                🌐
              </a>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 24 }}>
          <Link href={`/jobs/new?contractor=${params.id}`} style={{
            display: 'block', width: '100%', padding: '15px 0', textAlign: 'center',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontWeight: 700, fontSize: 16, borderRadius: 14,
            textDecoration: 'none',
            boxShadow: '0 8px 32px -8px rgba(99,102,241,0.6)',
          }}>
            📋 Book a Job
          </Link>
          <Link href={`/diagnose`} style={{
            display: 'block', width: '100%', padding: '14px 0', textAlign: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#e2e8f0', fontWeight: 600, fontSize: 15, borderRadius: 14,
            textDecoration: 'none',
          }}>
            🤖 Get a Free AI Estimate
          </Link>
          <Link href={`/contractor/${params.id}`} style={{
            display: 'block', width: '100%', padding: '14px 0', textAlign: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8', fontWeight: 600, fontSize: 14, borderRadius: 14,
            textDecoration: 'none',
          }}>
            View Full Profile &amp; Reviews →
          </Link>
        </div>

        {/* Recent work */}
        {posts.length > 0 && (
          <div style={{ width: '100%', marginTop: 32 }}>
            <p style={{ color: '#64748b', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Recent Work
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {posts.map(p => (
                <Link key={p.id} href={`/work/${p.id}`} style={{ position: 'relative', display: 'block', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#1a1d27', textDecoration: 'none' }}>
                  {p.photo
                    ? <img src={p.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{emoji}</div>}
                  {p.video && (
                    <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 5px', fontSize: 10, color: '#fff' }}>▶</div>
                  )}
                </Link>
              ))}
            </div>
            <Link href={`/contractor/${params.id}`} style={{ display: 'block', textAlign: 'center', marginTop: 12, color: '#6366f1', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              See all work →
            </Link>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <p style={{ color: '#334155', fontSize: 12 }}>Powered by</p>
          <Link href="/" style={{ color: '#6366f1', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
            RepairAI Pro ⚡
          </Link>
          <Link href="/diagnose" style={{ color: '#475569', fontSize: 11, textDecoration: 'none', marginTop: 4 }}>
            Free AI diagnosis for your home →
          </Link>
        </div>

      </div>
    </div>
  );
}

/* ── Helpers ── */
const badgePill = (color: string) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', borderRadius: 20,
  background: `${color}22`, border: `1px solid ${color}55`,
  color, fontSize: 12, fontWeight: 600,
} as React.CSSProperties);

const socialIcon: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  textDecoration: 'none', fontSize: 20, color: '#e2e8f0',
  transition: 'background 0.2s',
};

function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1" fill="url(#ig)"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34v-6.9a8.18 8.18 0 0 0 4.78 1.52V6.49a4.85 4.85 0 0 1-1.02-.2z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877f2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ff0000">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}
