'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  CheckCircle, Zap, Star, Crown, Shield, BarChart2, MessageSquare,
  ArrowRight, DollarSign, TrendingUp, Sparkles, Brain, Loader2,
  Clock, FlameIcon, BadgeCheck, X,
} from "lucide-react";

/* ── Pricing data ─────────────────────────────────────────────────────────── */

const TIERS = [
  {
    id:          "starter",
    name:        "Starter",
    monthlyPrice: 0,
    annualPrice:  0,
    period:       "forever",
    description: "Get started and win your first jobs",
    icon:        <Shield className="w-5 h-5" />,
    badge:       undefined as string | undefined,
    badgeColor:  undefined as string | undefined,
    highlight:   false,
    features: [
      { text: "5 job invites per month",            included: true  },
      { text: "Basic contractor profile",            included: true  },
      { text: "Standard matching priority",          included: true  },
      { text: "Work feed & social posts",            included: true  },
      { text: "AI Bid Writer",                       included: false },
      { text: "Instant Book priority",               included: false },
      { text: "Analytics dashboard",                 included: false },
      { text: "AI Business Advisor",                 included: false },
      { text: "Social bio page (/pro/username)",     included: false },
      { text: "Featured placement",                  included: false },
    ],
  },
  {
    id:          "pro",
    name:        "Pro",
    monthlyPrice: 79,
    annualPrice:  63,
    period:       "per month",
    description: "AI-powered tools to win more and earn more",
    icon:        <Star className="w-5 h-5" />,
    badge:       "Most Popular",
    badgeColor:  "#6366f1",
    highlight:   true,
    guarantee:   true,
    features: [
      { text: "Unlimited job invites",                           included: true },
      { text: "✨ AI Bid Writer — drafts winning bids in 3 sec", included: true },
      { text: "⚡ Instant Book — first in queue for fast jobs",  included: true },
      { text: "📊 Analytics dashboard — views, followers, ROI", included: true },
      { text: "🤖 AI Business Advisor in Studio",               included: true },
      { text: "📱 Social bio page (/pro/username)",             included: true },
      { text: "🎁 Contractor Wrapped annual card",              included: true },
      { text: "Verified Pro badge + priority matching",          included: true },
      { text: "SMS + push notifications",                        included: true },
      { text: "Featured placement",                              included: false },
    ],
  },
  {
    id:          "elite",
    name:        "Elite",
    monthlyPrice: 149,
    annualPrice:  119,
    period:       "per month",
    description: "Dominate your market and maximize earnings",
    icon:        <Crown className="w-5 h-5" />,
    badge:       "Best Value",
    badgeColor:  "#f59e0b",
    highlight:   false,
    features: [
      { text: "Everything in Pro",                               included: true },
      { text: "Featured contractor — top of all searches",       included: true },
      { text: "0% platform fee on first 5 jobs/month",          included: true },
      { text: "Early access to emergency jobs (30 min early)",  included: true },
      { text: "Dedicated account manager",                       included: true },
      { text: "Custom /pro/handle URL",                         included: true },
      { text: "Priority dispute resolution",                     included: true },
      { text: "Quarterly strategy call",                         included: true },
      { text: "Beta access to new features",                     included: true },
      { text: "White-label invoice templates",                   included: true },
    ],
  },
] as const;

const NEW_FEATURES = [
  { icon: "✨", title: "AI Bid Writer", desc: "Drafts a price, ETA, and personalized message in 3 seconds based on your past wins and market data. Stop losing jobs to slow responses." },
  { icon: "⚡", title: "Instant Book", desc: "For jobs under $500, you get a 15-minute countdown offer before anyone else sees it. Accept in one tap — job is yours, no bidding." },
  { icon: "📊", title: "Analytics Dashboard", desc: "See your profile views, follower growth, top-performing posts, hire clicks, and revenue trends. Know what's working." },
  { icon: "🤖", title: "AI Business Advisor", desc: "Ask anything in Studio — \"how do I price this job?\", \"write a message for this delay\", \"estimate my taxes this quarter\". Answers in seconds." },
  { icon: "📱", title: "Social Bio Page", desc: "Your own /pro/username page — put it in your Instagram and TikTok bio. Shows your work, reviews, and a Book button. Zero setup." },
  { icon: "🎁", title: "Contractor Wrapped", desc: "Shareable year-in-review card: total earned, jobs done, top post, milestones. Post it on Instagram. Your followers will love it." },
];

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function ContractorProPage() {
  const { user }              = useAuth();
  const router                = useRouter();
  const [annual, setAnnual]   = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    if (!user) { router.push('/auth/signin'); return; }
    setLoading(planId);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('/api/stripe/contractor-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ plan: planId, billing: annual ? 'annual' : 'monthly' }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.error ?? 'Could not start checkout. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    }
    setLoading(null);
  }

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-14 space-y-20">

        {/* ── Hero ── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Zap className="w-3 h-3" /> Contractor Plans
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: 'var(--color-text)' }}>
            The AI operating system{' '}
            <span style={{ background: 'linear-gradient(90deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              for your trade business
            </span>
          </h1>
          <p className="text-lg max-w-xl mx-auto mb-6" style={{ color: 'var(--color-text-3)' }}>
            AI Bid Writer. Instant Book. Analytics. Business Advisor. Everything you need to earn more — in one dashboard.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(34,197,94,0.09)', border: '1px solid rgba(34,197,94,0.22)', color: '#34d399' }}>
            <DollarSign className="w-4 h-4" /> Pro contractors earn 3.2× more than Starter
          </div>
        </div>

        {/* ── Annual toggle ── */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3 rounded-2xl p-1.5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <button onClick={() => setAnnual(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={!annual ? { background: 'var(--color-brand)', color: '#fff' } : { color: 'var(--color-text-3)' }}>
              Monthly
            </button>
            <button onClick={() => setAnnual(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              style={annual ? { background: 'var(--color-brand)', color: '#fff' } : { color: 'var(--color-text-3)' }}>
              Annual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        {/* ── Pricing grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {TIERS.map((tier) => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            const isFree = price === 0;
            return (
              <div key={tier.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: tier.highlight ? 'linear-gradient(160deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))' : 'var(--color-surface)',
                  border: tier.highlight ? '1.5px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                  boxShadow: tier.highlight ? '0 24px 60px -16px rgba(99,102,241,0.25)' : 'none',
                }}>

                {/* Badge */}
                {tier.badge && (
                  <div className="text-center py-1.5 text-[11px] font-bold tracking-widest uppercase"
                    style={{ background: tier.badgeColor, color: '#fff' }}>
                    {tier.badge}
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1" style={{ color: tier.highlight ? '#818cf8' : 'var(--color-text-3)' }}>
                    {tier.icon}
                    <span className="text-sm font-bold uppercase tracking-wider">{tier.name}</span>
                  </div>
                  <p className="text-xs mb-4" style={{ color: 'var(--color-text-4)' }}>{tier.description}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    {isFree
                      ? <span className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>Free</span>
                      : <>
                          <span className="text-4xl font-black" style={{ color: 'var(--color-text)' }}>${price}</span>
                          <span className="text-sm" style={{ color: 'var(--color-text-4)' }}>/mo</span>
                        </>
                    }
                  </div>
                  {annual && !isFree && (
                    <p className="text-xs mb-4" style={{ color: '#4ade80' }}>
                      Billed ${price * 12}/year — saves ${(tier.monthlyPrice - price) * 12}/year
                    </p>
                  )}
                  {!annual && !isFree && <div className="mb-4" />}

                  {/* Features */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-2.5 text-xs">
                        {f.included
                          ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                          : <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-text-4)', opacity: 0.4 }} />}
                        <span style={{ color: f.included ? 'var(--color-text-2)' : 'var(--color-text-4)', opacity: f.included ? 1 : 0.5 }}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {tier.id === 'starter'
                    ? <Link href="/auth/signin" className="btn btn-secondary btn-full" style={{ textAlign: 'center' }}>Get Started Free</Link>
                    : <button onClick={() => handleSubscribe(tier.id)} disabled={loading === tier.id}
                        className={`btn btn-full ${tier.highlight ? 'btn-primary' : 'btn-secondary'}`}>
                        {loading === tier.id
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</>
                          : isFree ? 'Get Started Free' : `Subscribe — $${price}/mo`}
                      </button>
                  }

                  {/* Guarantee pill */}
                  {'guarantee' in tier && tier.guarantee && (
                    <p className="text-[10px] text-center mt-2.5 flex items-center justify-center gap-1" style={{ color: '#4ade80' }}>
                      <BadgeCheck className="w-3 h-3" /> 30-day money-back guarantee
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Lead guarantee box ── */}
        <div className="rounded-2xl p-6 flex items-start gap-5"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.15)', fontSize: 20 }}>
            🛡
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#4ade80' }}>30-Day Job Guarantee</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3)' }}>
              If you go Pro and don't win a single job in your first 30 days, we'll refund your first month — no questions asked.
              We're confident in the product. Your risk is zero.
            </p>
          </div>
        </div>

        {/* ── What's new in Pro ── */}
        <div>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
              <Sparkles className="w-3 h-3" /> Just added to Pro
            </div>
            <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--color-text)' }}>
              6 new AI tools — all included
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--color-text-4)' }}>
              These didn't exist 30 days ago. They're live now and exclusive to Pro.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NEW_FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl p-5"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 28 }}>{f.icon}</span>
                <h3 className="font-bold text-sm mt-2 mb-1" style={{ color: 'var(--color-text)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROI calculator ── */}
        <div className="rounded-2xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--color-text)' }}>
            Pro pays for itself in one job
          </h2>
          <p className="text-center text-sm mb-10" style={{ color: 'var(--color-text-4)' }}>
            Here's the math at average job values.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Avg job value",           value: "$350",  sub: "per completed job",                     color: '#818cf8', bg: 'rgba(99,102,241,0.08)' },
              { label: "Time saved by AI Bid Writer", value: "2 hrs", sub: "per week — stop writing bids manually", color: '#34d399', bg: 'rgba(34,197,94,0.08)' },
              { label: "Break-even",              value: "1 job", sub: "extra per month covers Pro at $79",     color: '#fbbf24', bg: 'rgba(245,158,11,0.08)' },
              { label: "ROI at 5 jobs/month",     value: "22×",   sub: "Pro earns $1,750+, costs $79",          color: '#fb923c', bg: 'rgba(249,115,22,0.08)' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-5 text-center" style={{ background: s.bg, border: `1px solid ${s.color}33` }}>
                <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-2)' }}>{s.label}</div>
                <div className="text-[11px] leading-snug" style={{ color: 'var(--color-text-4)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl px-6 py-4 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.07))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-sm font-semibold" style={{ color: '#a5b4fc' }}>
              "At $79/month, you need exactly 1 extra job to break even. Pro contractors average 4 extra jobs."
            </p>
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="rounded-2xl p-10 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1.5px solid rgba(99,102,241,0.3)' }}>
          <Star className="w-8 h-8 mx-auto mb-3" style={{ color: '#818cf8' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Ready to run your business smarter?
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-3)' }}>
            AI Bid Writer, Instant Book, Analytics, Business Advisor — all for less than one job's worth.
          </p>
          <button onClick={() => handleSubscribe('pro')} disabled={loading === 'pro'}
            className="btn btn-primary btn-lg inline-flex" style={{ justifyContent: 'center' }}>
            {loading === 'pro'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</>
              : <>Start Pro — ${annual ? 63 : 79}/mo <ArrowRight className="w-4 h-4 ml-1" /></>}
          </button>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-4)' }}>
            30-day money-back guarantee · Cancel anytime · No contracts
          </p>
        </div>

      </div>
    </div>
  );
}
