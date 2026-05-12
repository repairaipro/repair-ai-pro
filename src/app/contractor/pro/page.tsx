'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  CheckCircle,
  Zap,
  Star,
  Crown,
  Shield,
  BarChart2,
  Bell,
  MessageSquare,
  Clock,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Award,
  Loader2,
} from "lucide-react";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingTier {
  id: "starter" | "pro" | "elite";
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  features: PlanFeature[];
  cta: string;
  ctaHref: string;
  highlight: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "Get started and win your first jobs",
    icon: <Shield className="w-5 h-5" />,
    features: [
      { text: "3 job invites per month", included: true },
      { text: "Basic contractor profile", included: true },
      { text: "Standard matching priority", included: true },
      { text: "Verified Pro badge", included: false },
      { text: "Priority matching (shown first)", included: false },
      { text: "AI job scoring", included: false },
      { text: "SMS + push notifications", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Featured placement", included: false },
      { text: "Dedicated account manager", included: false },
    ],
    cta: "Get Started Free",
    ctaHref: "/auth/signin",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "Everything you need to grow your business",
    icon: <Star className="w-5 h-5" />,
    badge: "Most Popular",
    badgeColor: "#6366f1",
    features: [
      { text: "Unlimited job invites", included: true },
      { text: "Verified Pro badge on profile", included: true },
      { text: "Priority matching (shown first)", included: true },
      { text: "AI job scoring — see your fit score", included: true },
      { text: "SMS + push notifications for new jobs", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Featured placement in all searches", included: false },
      { text: "Dedicated account manager", included: false },
      { text: "Custom profile URL", included: false },
      { text: "Early access to emergency jobs", included: false },
    ],
    cta: "Subscribe — $29/mo",
    ctaHref: "/api/stripe/contractor-subscribe?plan=pro",
    highlight: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: "$79",
    period: "per month",
    description: "Dominate your market and maximize earnings",
    icon: <Crown className="w-5 h-5" />,
    badge: "Best Value",
    badgeColor: "#f59e0b",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Featured contractor (top of all searches)", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom profile URL", included: true },
      { text: "Early access to emergency jobs (30 min early)", included: true },
      { text: "0% platform fee on first 3 jobs/month", included: true },
      { text: "Verified Pro badge on profile", included: true },
      { text: "Priority matching (shown first)", included: true },
      { text: "AI job scoring", included: true },
      { text: "SMS + push notifications", included: true },
    ],
    cta: "Subscribe — $79/mo",
    ctaHref: "/api/stripe/contractor-subscribe?plan=elite",
    highlight: false,
  },
];

function TierCard({ tier, onSubscribe, loading }: { tier: PricingTier; onSubscribe: (id: string) => void; loading: string | null }) {
  return (
    <div
      className="relative flex flex-col rounded-2xl p-6 h-full transition-all duration-300"
      style={{
        background: tier.highlight
          ? 'linear-gradient(160deg, rgba(99,102,241,0.13) 0%, rgba(139,92,246,0.08) 100%)'
          : 'var(--color-surface)',
        border: tier.highlight
          ? '2px solid rgba(99,102,241,0.55)'
          : '1px solid var(--color-border)',
        boxShadow: tier.highlight
          ? '0 0 40px rgba(99,102,241,0.18), 0 8px 32px rgba(0,0,0,0.35)'
          : '0 4px 20px rgba(0,0,0,0.2)',
        transform: tier.highlight ? 'translateY(-8px)' : 'none',
      }}
    >
      {/* Badge */}
      {tier.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
          style={{
            background: tier.badgeColor ?? '#6366f1',
            color: '#fff',
            boxShadow: `0 2px 12px ${tier.badgeColor ?? '#6366f1'}55`,
          }}
        >
          {tier.badge}
        </div>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: tier.highlight
              ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
              : tier.id === 'elite'
              ? 'linear-gradient(135deg,#f59e0b,#d97706)'
              : 'var(--color-surface-2)',
            color: tier.highlight || tier.id === 'elite' ? '#fff' : 'var(--color-text-3)',
          }}
        >
          {tier.icon}
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{tier.name}</h3>
          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{tier.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span
            className="text-4xl font-black"
            style={{ color: tier.highlight ? '#a5b4fc' : 'var(--color-text)' }}
          >
            {tier.price}
          </span>
          {tier.period !== "forever" && (
            <span className="text-sm" style={{ color: 'var(--color-text-4)' }}>/{tier.period.replace("per ", "")}</span>
          )}
        </div>
        {tier.id === "starter" && (
          <span className="text-xs" style={{ color: 'var(--color-text-4)' }}>No credit card required</span>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2.5 flex-1 mb-6">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <CheckCircle
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{
                color: f.included
                  ? tier.highlight ? '#818cf8' : '#22c55e'
                  : 'var(--color-border)',
              }}
            />
            <span
              style={{
                color: f.included ? 'var(--color-text-2)' : 'var(--color-text-4)',
                textDecoration: f.included ? 'none' : 'line-through',
                opacity: f.included ? 1 : 0.45,
              }}
            >
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {tier.id === "starter" ? (
        <Link href={tier.ctaHref} className="btn btn-secondary btn-full text-center font-semibold">
          {tier.cta}
        </Link>
      ) : tier.highlight ? (
        <button
          onClick={() => onSubscribe(tier.id)}
          disabled={loading === tier.id}
          className="btn btn-primary btn-full text-center font-semibold"
          style={{ justifyContent: 'center' }}
        >
          {loading === tier.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</> : <>{tier.cta} <ArrowRight className="w-4 h-4 ml-1" /></>}
        </button>
      ) : (
        <button
          onClick={() => onSubscribe(tier.id)}
          disabled={loading === tier.id}
          className="btn btn-full font-semibold text-center"
          style={{
            background: 'linear-gradient(135deg,#f59e0b,#d97706)',
            color: '#fff',
            border: 'none',
            justifyContent: 'center',
          }}
        >
          {loading === tier.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</> : <>{tier.cta} <ArrowRight className="w-4 h-4 ml-1" /></>}
        </button>
      )}
    </div>
  );
}

const EARN_MORE_ITEMS = [
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: "AI Job Scoring",
    desc: "See your fit score for every job before you apply — focus only on jobs you'll win.",
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.1)',
  },
  {
    icon: <Bell className="w-5 h-5" />,
    title: "Instant Notifications",
    desc: "SMS + push alerts the second a matching job is posted — beat other contractors to the bid.",
    color: '#34d399',
    bg: 'rgba(34,197,94,0.1)',
  },
  {
    icon: <Award className="w-5 h-5" />,
    title: "Verified Pro Badge",
    desc: "Homeowners trust verified contractors 3× more. Close more jobs at higher rates.",
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Priority Placement",
    desc: "Appear first in search results and job matches — maximum visibility with zero extra effort.",
    color: '#fb923c',
    bg: 'rgba(249,115,22,0.1)',
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Early Emergency Access (Elite)",
    desc: "Get emergency jobs 30 minutes before regular contractors — highest-value work, guaranteed.",
    color: '#f87171',
    bg: 'rgba(239,68,68,0.1)',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Analytics Dashboard",
    desc: "Track bids, win rates, and revenue trends. Know exactly what's working and double down.",
    color: '#a78bfa',
    bg: 'rgba(139,92,246,0.1)',
  },
];

export default function ContractorProPage() {
  const { user }               = useAuth();
  const router                 = useRouter();
  const [loading, setLoading]  = useState<string | null>(null);
  const [error,   setError]    = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    if (!user) { router.push('/auth/signin'); return; }
    setLoading(planId);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res   = await fetch('/api/stripe/contractor-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ plan: planId }),
      });
      const data  = await res.json();
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
      <div className="max-w-6xl mx-auto px-4 py-14">

        {/* Hero */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#818cf8',
            }}
          >
            <Zap className="w-3 h-3" />
            Contractor Plans
          </div>
          <h1
            className="text-4xl md:text-5xl font-black mb-4 leading-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Grow faster with{" "}
            <span
              style={{
                background: 'linear-gradient(90deg,#6366f1,#a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Pro tools
            </span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--color-text-3)' }}>
            Win more jobs, earn more per job, and build a 5-star reputation — all on autopilot.
          </p>

          {/* Revenue stat */}
          <div
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: 'rgba(34,197,94,0.09)',
              border: '1px solid rgba(34,197,94,0.22)',
              color: '#34d399',
            }}
          >
            <DollarSign className="w-4 h-4" />
            Our top contractors earn $8,000–$22,000/month
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center mb-6"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)' }}
          >
            {error}
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 mb-20 items-end">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} onSubscribe={handleSubscribe} loading={loading} />
          ))}
        </div>

        {/* Math breakdown */}
        <div
          className="rounded-2xl p-8 mb-16"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--color-text)' }}>
            How contractors earn more with Pro
          </h2>
          <p className="text-center text-sm mb-10" style={{ color: 'var(--color-text-4)' }}>
            The math is simple — Pro pays for itself in a single job.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              {
                label: "Average job value",
                value: "$350",
                sub: "per completed job",
                color: '#818cf8',
                bg: 'rgba(99,102,241,0.08)',
              },
              {
                label: "Platform fee saved",
                value: "~$42",
                sub: "per job (Pro vs. unverified)",
                color: '#34d399',
                bg: 'rgba(34,197,94,0.08)',
              },
              {
                label: "Break-even point",
                value: "1 job",
                sub: "extra per month covers Pro",
                color: '#fbbf24',
                bg: 'rgba(245,158,11,0.08)',
              },
              {
                label: "ROI at 4 jobs/month",
                value: "4×",
                sub: "Pro pays for itself four times over",
                color: '#fb923c',
                bg: 'rgba(249,115,22,0.08)',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-5 text-center"
                style={{ background: stat.bg, border: `1px solid ${stat.color}33` }}
              >
                <div className="text-3xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--color-text-2)' }}>{stat.label}</div>
                <div className="text-[11px] leading-snug" style={{ color: 'var(--color-text-4)' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl px-6 py-4 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.07))',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <p className="text-base font-semibold" style={{ color: '#a5b4fc' }}>
              "At 4 jobs/month, Pro pays for itself 4× over."
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-4)' }}>
              Based on average platform fee difference between verified Pro contractors and standard accounts.
            </p>
          </div>
        </div>

        {/* How you earn more */}
        <div className="mb-14">
          <h2
            className="text-2xl font-bold text-center mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            Why Pro contractors win more jobs
          </h2>
          <p className="text-sm text-center mb-10" style={{ color: 'var(--color-text-4)' }}>
            Six unfair advantages your competitors don't have.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EARN_MORE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl p-5"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: item.bg, color: item.color }}
                >
                  {item.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-4)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
            border: '1.5px solid rgba(99,102,241,0.3)',
          }}
        >
          <Star className="w-8 h-8 mx-auto mb-3" style={{ color: '#818cf8' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Ready to level up?
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--color-text-3)' }}>
            Join thousands of top contractors already using Pro to win more jobs and earn more per job.
          </p>
          <button
            onClick={() => handleSubscribe('pro')}
            disabled={loading === 'pro'}
            className="btn btn-primary btn-lg inline-flex"
            style={{ justifyContent: 'center' }}
          >
            {loading === 'pro'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</>
              : <>Start Pro — $29/mo <ArrowRight className="w-4 h-4 ml-1" /></>}
          </button>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-4)' }}>
            Cancel anytime. No contracts. No setup fees.
          </p>
        </div>

      </div>
    </div>
  );
}
