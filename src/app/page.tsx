'use client';

import Link from 'next/link';
import { Zap, Brain, Star, MessageSquare, MapPin, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import TrustBar from '@/components/TrustBar';
import HeroShowcase from '@/components/HeroShowcase';

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
    desc: "Like Uber for home repair — pros are invited in waves, ranked by fit. The best available one claims your job.",
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

const SERVICE_TAGS = ["🔧 Plumbing", "⚡ Electrical", "❄️ HVAC", "🏠 Handyman", "🧰 Appliance Repair", "🎨 Painting", "🌿 Landscaping", "🔒 Locksmith"];

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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full mb-8"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#818cf8',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Home Repair · Houston, TX
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold leading-[1.05] mb-6 tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Snap it. Price it.{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa, #60a5fa)' }}
            >
              Fixed today.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-3)' }}
          >
            Plumbing, electrical, HVAC, handyman — snap a photo and AI diagnoses
            the problem, prices it from real local jobs, and matches you with a
            verified pro nearby. Like Uber, for home repair.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <Link href="/diagnose" className="btn btn-primary btn-lg px-8 w-full sm:w-auto">
              Diagnose It Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contractor/pro"
              className="btn btn-secondary btn-lg px-8 w-full sm:w-auto"
            >
              I'm a Service Pro
            </Link>
          </motion.div>

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
              + more home trades
            </span>
          </div>

          <p className="text-xs mb-12" style={{ color: 'var(--color-text-4)' }}>
            No credit card required &nbsp;·&nbsp; Free to post &nbsp;·&nbsp; Service pros join free
          </p>

          {/* Product-story showcase */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <HeroShowcase />
          </motion.div>
        </div>
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <section style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "10 sec", label: "AI Diagnosis" },
              { value: "$0",     label: "To Post a Job" },
              { value: "15 min", label: "Instant Book Window" },
              { value: "100%",   label: "Payment Protected" },
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

          {/* Trust band */}
          <div className="max-w-3xl mx-auto mt-10">
            <TrustBar />
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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                className="relative">
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
              </motion.div>
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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true, margin: "-50px" }}
                className="card p-5 transition-all duration-300"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = f.border;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
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
              </motion.div>
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

      {/* ══════════════ PRICING ══════════════ */}
      <section className="py-24 px-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full mb-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-4)' }}
            >
              Transparent pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
              Free to start. Upgrade when you're ready.
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--color-text-3)' }}>
              Homeowners post jobs free. Contractors receive jobs free. Premium plans unlock priority matching, AI tools, and advanced analytics.
            </p>
          </div>

          {/* Tab: Homeowners / Contractors */}
          <div className="grid lg:grid-cols-2 gap-12">

            {/* Homeowner plans */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--color-text-4)' }}>
                For Homeowners
              </p>
              <div className="space-y-4">
                {/* Free */}
                <div className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Free</h3>
                      <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Post jobs, get matched, pay when done</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>$0</span>
                      <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>forever</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {["Post unlimited jobs", "AI-powered diagnosis", "Contractor bidding", "In-app chat + scheduling", "Escrow payment protection"].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/signup" className="btn btn-secondary w-full text-center">Get Started Free</Link>
                </div>

                {/* Pro */}
                <div
                  className="card p-6 relative overflow-hidden"
                  style={{ border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.04)' }}
                >
                  <div
                    className="absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl"
                    style={{ background: 'var(--color-brand)', color: '#fff' }}
                  >
                    MOST POPULAR
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Homeowner Pro</h3>
                      <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>For the serious home manager</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>$19</span>
                      <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>/month</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {[
                      "Everything in Free",
                      "AI Insurance Report ($49 value) included",
                      "Home Health Score dashboard",
                      "Priority contractor matching",
                      "Spending analytics + trends",
                      "14-day free trial",
                    ].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#818cf8' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/auth/signup?plan=homeowner_pro"
                    className="btn btn-primary w-full text-center"
                  >
                    Start 14-Day Free Trial
                  </Link>
                </div>
              </div>
            </div>

            {/* Contractor plans */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--color-text-4)' }}>
                For Service Professionals
              </p>
              <div className="space-y-4">
                {/* Free */}
                <div className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Free</h3>
                      <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Build your reputation</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>$0</span>
                      <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>+ 12% per job</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {["Receive job invitations", "Submit competitive bids", "In-app messaging", "Star rating & review system", "Direct bank payouts via Stripe"].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contractor-profile" className="btn btn-secondary w-full text-center">Join as a Pro</Link>
                </div>

                {/* Pro */}
                <div
                  className="card p-6"
                  style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.03)' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Pro</h3>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 9999,
                            background: 'rgba(99,102,241,0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99,102,241,0.3)',
                          }}
                        >
                          ✓ VERIFIED
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>Win more jobs</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-extrabold" style={{ color: 'var(--color-text)' }}>$49</span>
                      <p className="text-xs" style={{ color: 'var(--color-text-4)' }}>/month · 7-day trial</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {[
                      "Everything in Free",
                      "Verified badge on profile",
                      "Priority ranking in job matches",
                      "Reduced platform fee (10%)",
                      "Earnings analytics dashboard",
                      "7-day free trial",
                    ].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-3)' }}>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#818cf8' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/contractor/pro" className="btn btn-primary w-full text-center">
                    Start 7-Day Free Trial
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Platform fee note */}
          <p className="text-center text-xs mt-8" style={{ color: 'var(--color-text-4)' }}>
            Platform fee of 12% applies per completed job. Fee reduces to 10% on Pro plan.
            No monthly fee for homeowners on the free plan. &nbsp;·&nbsp;
            <Link href="/pricing" style={{ color: '#818cf8', textDecoration: 'underline' }}>Full pricing details →</Link>
          </p>
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
