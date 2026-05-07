'use client';

import Link from 'next/link';
import { Zap, Brain, Star, MessageSquare, MapPin, Shield, ArrowRight, CheckCircle } from 'lucide-react';

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
    <div className="-mx-6 -mt-6" style={{ background: 'var(--color-bg)' }}>

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

          <h1
            className="text-5xl md:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Any job. Any trade.{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa, #60a5fa)' }}
            >
              Done fast.
            </span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-3)' }}
          >
            Plumber, mechanic, electrician, handyman — describe the problem and AI
            dispatches the best local pro to your door automatically.
            Like Uber, for any skilled service.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Link href="/jobs/new" className="btn btn-primary btn-lg px-8 w-full sm:w-auto">
              Describe Your Problem
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contractor-profile"
              className="btn btn-secondary btn-lg px-8 w-full sm:w-auto"
            >
              I'm a Service Pro
            </Link>
          </div>

          {/* Service tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {SERVICE_TAGS.map((s) => (
              <span
                key={s}
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-4)',
                }}
              >
                {s}
              </span>
            ))}
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#818cf8',
              }}
            >
              + 25 more
            </span>
          </div>

          <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>
            No credit card required &nbsp;·&nbsp; Free to post &nbsp;·&nbsp; Service pros join free
          </p>
        </div>
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <section style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "1,200+", label: "Jobs Posted" },
              { value: "340+",   label: "Verified Pros" },
              { value: "4.9★",   label: "Avg Rating" },
              { value: "<45m",   label: "Avg Match Time" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div
                  className="text-2xl font-bold mb-1"
                  style={{ background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  {value}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-4)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section className="py-24 px-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full mb-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-4)' }}
            >
              Simple process
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              How it works
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--color-text-3)' }}>
              From problem to fixed in three steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-8 z-10"
                    style={{
                      left: 'calc(100% - 12px)',
                      width: '24px',
                      height: '1px',
                      background: 'var(--color-border)',
                    }}
                  />
                )}
                <div
                  className="card p-6 h-full group transition-all duration-300"
                  style={{ position: 'relative' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    {s.icon}
                  </div>
                  <div
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3"
                    style={{
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      color: '#818cf8',
                    }}
                  >
                    Step {i + 1}
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section
        className="py-24 px-6"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              Everything you need, nothing you don't
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--color-text-3)' }}>
              Built for people who value their time and pros who want quality jobs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="card p-5 transition-all duration-300"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = f.border;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-1.5 text-sm" style={{ color: 'var(--color-text)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section className="py-24 px-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              What people are saying
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>
              Real reviews from real customers in Houston and surrounding areas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="card p-6 flex flex-col gap-4 transition-all duration-300"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-current" style={{ color: '#fbbf24' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--color-text-2)' }}>
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      color: '#fff',
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FOR CONTRACTORS ══════════════ */}
      <section
        className="py-24 px-6"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-10"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <div className="flex-1">
              <div
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider"
                style={{ color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                For Service Professionals
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                Stop chasing leads. Let jobs come to you.
              </h2>
              <ul className="space-y-2.5 mb-8">
                {[
                  "Works for any trade — plumbers, mechanics, electricians, IT, movers and more",
                  "Get matched to jobs that fit your exact service and location",
                  "Import your Google Business profile in one click",
                  "Build a trust score that gets you ranked higher over time",
                  "In-app chat, scheduling, and review management",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-sm" style={{ color: 'var(--color-text-3)' }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/contractor-profile" className="btn btn-primary">
                Set Up Your Profile <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0 hidden md:flex"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              👷
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ BOTTOM CTA ══════════════ */}
      <section className="py-24 px-6 text-center mesh-bg">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Need something fixed?
          </h2>
          <p className="text-base mb-10" style={{ color: 'var(--color-text-3)' }}>
            Any service, any trade. Describe it in plain English — AI handles the rest.
          </p>
          <Link href="/jobs/new" className="btn btn-primary btn-lg px-10">
            Post a Job — It's Free <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-xs" style={{ color: 'var(--color-text-4)' }}>
            Already have an account?{" "}
            <Link href="/auth/signin" className="underline transition-opacity hover:opacity-70" style={{ color: '#818cf8' }}>
              Sign in
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}
