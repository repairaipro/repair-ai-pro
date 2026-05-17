'use client';

import Link from 'next/link';
import { Zap, Brain, Star, MessageSquare, MapPin, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { AnimatedStats } from '@/components/AnimatedStats';
import { AnimatedHeadline, AnimatedSubheadline } from '@/components/AnimatedHeadline';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/ScrollReveal';
import { AnimatedPricingCard } from '@/components/AnimatedPricingCard';

const STEPS = [
  {
    icon: <Brain className="w-7 h-7" style={{ color: '#818cf8' }} />,
    title: "Describe What You Need",
    desc: "Type the problem or upload a photo. Our AI identifies the service type, severity, and estimates a cost range — before you talk to anyone.",
  },
  {
    icon: <Zap className="w-7 h-7" style={{ color: '#fbbf24' }} />,
    title: "Pros Are Notified Instantly",
    desc: "Top-rated local service professionals get invited automatically, ranked by proximity, rating, and availability. No waiting, no cold calls.",
  },
  {
    icon: <CheckCircle className="w-7 h-7" style={{ color: '#34d399' }} />,
    title: "Job Gets Done",
    desc: "Chat in-app, schedule a time, track progress, and confirm completion. Your pro builds their reputation. You get the job done.",
  },
];

const FEATURES = [
  {
    icon: <Brain className="w-5 h-5" />,
    color: '#818cf8',
    bg: 'rgba(99,102,241,0.1)',
    border: 'rgba(99,102,241,0.2)',
    title: "AI Diagnosis",
    desc: "Describe the issue in plain English. AI detects the service type and gives you a realistic cost range before you post.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    color: '#34d399',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.2)',
    title: "Trust Scores",
    desc: "Every professional has a transparent trust score based on ratings, completed jobs, and acceptance rate. No black boxes.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.2)',
    title: "Automatic Dispatch",
    desc: "Like Uber for any service — pros are invited in waves, ranked by fit. The best available one claims your job.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.1)',
    border: 'rgba(96,165,250,0.2)',
    title: "Built-in Chat",
    desc: "Message your pro, propose appointment times, and track job status — all in one place. No phone tag, no back-and-forth texts.",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.1)',
    border: 'rgba(244,114,182,0.2)',
    title: "Local Matching",
    desc: "Pros are matched by city, ZIP, and service radius. You always get someone nearby who knows your area.",
  },
  {
    icon: <Star className="w-5 h-5" />,
    color: '#fb923c',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.2)',
    title: "Verified Reviews",
    desc: "Reviews are tied to real completed jobs — no fake ratings. Professionals earn reputation one job at a time.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I posted my leak at 9am and had a plumber accepted by 9:45. The AI even told me what the problem probably was before anyone showed up.",
    name: "Sarah M.",
    role: "Houston, TX",
    stars: 5,
    avatar: "SM",
  },
  {
    quote: "My car wouldn't start and I had no idea who to call. Posted it here, had a mobile mechanic at my door in two hours. The AI nailed the diagnosis.",
    name: "DeShawn T.",
    role: "The Woodlands, TX",
    stars: 5,
    avatar: "DT",
  },
  {
    quote: "As an electrician, I used to spend hours chasing leads. Now the right jobs come to me ranked by how well they match my trade and location.",
    name: "Carlos R.",
    role: "Licensed Electrician",
    stars: 5,
    avatar: "CR",
  },
];

const SERVICE_TAGS = ["🔧 Plumbing", "⚡ Electrical", "🚗 Auto Mechanic", "❄️ HVAC", "🏠 Handyman", "💻 IT Support", "🌿 Landscaping", "🔒 Locksmith"];

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--color-bg)' }}>

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative overflow-hidden" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {/* Gradient orbs */}
        <div className="absolute -top-60 -left-60 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />

        <div className="relative max-w-5xl mx-auto px-6 py-28 md:py-36 text-center">

          {/* Pill badge */}
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#818cf8',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Service Marketplace · Houston, TX
          </div>

          <AnimatedHeadline
            className="text-5xl md:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight"
            style={{ color: 'var(--color-text)' }}
            as="h1"
          >
            Any job. Any trade. Done fast.
          </AnimatedHeadline>

          <AnimatedSubheadline
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-3)' }}
            delay={0.2}
          >
            Post your project in seconds. Top-rated local professionals get invited automatically. Chat in-app, track progress, and confirm when it's done.
          </AnimatedSubheadline>

          {/* CTA Buttons */}
          <ScrollReveal direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/jobs/new" className="btn btn-primary">
                Post a Job <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/contractor" className="btn btn-secondary">
                Browse Contractors
              </Link>
            </div>
          </ScrollReveal>

          {/* Service tags */}
          <ScrollReveal direction="up" delay={0.4}>
            <div className="flex flex-wrap gap-2 justify-center mt-10">
              {SERVICE_TAGS.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'var(--color-surface)', color: 'var(--color-text-3)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════ STATS ══════════════ */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <AnimatedStats stats={[
          { label: 'Jobs Posted', value: 5000, suffix: '+' },
          { label: 'Contractors', value: 800, suffix: '+' },
          { label: 'Completed', value: 12000, suffix: '+' },
          { label: 'Avg Rating', value: 4.8, suffix: '★' },
        ]} />
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold mb-16 text-center" style={{ color: 'var(--color-text)' }}>
          How it works
        </h2>
        <StaggerContainer staggerDelay={0.1}>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <StaggerItem key={i}>
                <div className="card p-6">
                  <div className="text-4xl mb-4">{step.icon}</div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--color-text)' }}>{step.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold mb-16 text-center" style={{ color: 'var(--color-text)' }}>
          Why repair-ai works
        </h2>
        <StaggerContainer staggerDelay={0.05}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <StaggerItem key={i}>
                <div className="card p-6" style={{ borderColor: f.border, background: f.bg }}>
                  <div className="text-2xl mb-3" style={{ color: f.color }}>{f.icon}</div>
                  <h3 className="font-bold mb-2" style={{ color: 'var(--color-text)' }}>{f.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>{f.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold mb-16 text-center" style={{ color: 'var(--color-text)' }}>
          What users say
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={i} direction="up" delay={0.1 * i}>
              <div className="card p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(t.stars)].map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400" style={{ color: '#fbbf24' }} />)}
                </div>
                <p className="text-sm mb-4 italic" style={{ color: 'var(--color-text-3)' }}>"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{t.role}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ══════════════ PRICING ══════════════ */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Simple, transparent pricing
          </h2>
          <p className="text-lg" style={{ color: 'var(--color-text-3)' }}>
            No hidden fees. You only pay when a job is completed.
          </p>
        </div>
        <StaggerContainer staggerDelay={0.1}>
          <div className="grid md:grid-cols-2 gap-8">
            <StaggerItem>
              <AnimatedPricingCard
                title="For Homeowners"
                price="Free"
                features={[
                  "Unlimited job posts",
                  "AI job diagnosis",
                  "Message contractors in-app",
                  "Job tracking & updates",
                  "Secure payments"
                ]}
                cta={{ label: "Post a Job", href: "/jobs/new" }}
              />
            </StaggerItem>
            <StaggerItem>
              <AnimatedPricingCard
                title="For Contractors"
                price="12%"
                subtitle="After completion"
                features={[
                  "Automatic job matching",
                  "One-click acceptance",
                  "Built-in messaging",
                  "Fast payouts (next day)",
                  "Performance dashboard"
                ]}
                cta={{ label: "Join Now", href: "/auth/signup" }}
                highlight
              />
            </StaggerItem>
          </div>
        </StaggerContainer>
      </section>

      {/* ══════════════ BOTTOM CTA ══════════════ */}
      <section className="px-6 py-20 max-w-5xl mx-auto text-center">
        <ScrollReveal direction="up">
          <h2 className="text-4xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
            Ready to get started?
          </h2>
          <p className="text-lg mb-8" style={{ color: 'var(--color-text-3)' }}>
            Join thousands of homeowners and contractors using repair-ai to build trust and get jobs done.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth/signup" className="btn btn-primary">
              Sign Up Now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/signin" className="btn btn-secondary">
              Sign In
            </Link>
          </div>
          <p className="mt-6 text-xs" style={{ color: 'var(--color-text-4)' }}>
            Already have an account?{" "}
            <Link href="/auth/signin" className="underline transition-opacity hover:opacity-70" style={{ color: '#818cf8' }}>
              Sign in
            </Link>
          </p>
        </ScrollReveal>
      </section>

    </div>
  );
}
