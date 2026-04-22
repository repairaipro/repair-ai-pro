'use client';

import Link from 'next/link';

/* ── How It Works steps ─────────────────────────────────────────────────── */
const STEPS = [
  {
    icon: "📸",
    title: "Describe What You Need",
    desc: "Type the problem or upload a photo. Our AI identifies the service type, severity, and estimates a cost range — before you talk to anyone.",
  },
  {
    icon: "⚡",
    title: "Pros Are Notified Instantly",
    desc: "Top-rated local service professionals get invited automatically, ranked by proximity, rating, and availability. No waiting, no cold calls.",
  },
  {
    icon: "✅",
    title: "Job Gets Done",
    desc: "Chat in-app, schedule a time, track progress, and confirm completion. Your pro builds their reputation. You get the job done.",
  },
];

/* ── Feature cards ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "🤖",
    title: "AI Diagnosis",
    desc: "Describe the issue in plain English — plumbing, car trouble, tech support, anything. AI detects the service type and gives you a realistic cost range before you post.",
  },
  {
    icon: "🏆",
    title: "Trust Scores",
    desc: "Every professional has a transparent trust score based on ratings, completed jobs, and acceptance rate. No black boxes.",
  },
  {
    icon: "📬",
    title: "Automatic Dispatch",
    desc: "Like Uber for any service — pros are invited in waves, ranked by fit. The best available one claims your job.",
  },
  {
    icon: "💬",
    title: "Built-in Chat",
    desc: "Message your pro, propose appointment times, and track job status — all in one place. No phone tag, no back-and-forth texts.",
  },
  {
    icon: "📍",
    title: "Local Matching",
    desc: "Pros are matched by city, ZIP, and service radius. You always get someone nearby who knows your area.",
  },
  {
    icon: "⭐",
    title: "Verified Reviews",
    desc: "Reviews are tied to real completed jobs — no fake ratings. Professionals earn reputation one job at a time.",
  },
];

/* ── Testimonials (placeholder) ─────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "I posted my leak at 9am and had a plumber accepted by 9:45. The AI even told me what the problem probably was before anyone showed up.",
    name: "Sarah M.",
    role: "Austin, TX",
    stars: 5,
  },
  {
    quote: "My car wouldn't start and I had no idea who to call. Posted it here, had a mobile mechanic at my door in two hours. The AI nailed the diagnosis.",
    name: "DeShawn T.",
    role: "Dallas, TX",
    stars: 5,
  },
  {
    quote: "As an electrician, I used to spend hours chasing leads. Now the right jobs come to me ranked by how well they match my trade and location.",
    name: "Carlos R.",
    role: "Licensed Electrician",
    stars: 5,
  },
];

/* ── Component ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    /* Escape the layout's p-6 for full-width sections */
    <div className="-mx-6 -mt-6">

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative overflow-hidden bg-gray-950 border-b border-gray-800">
        {/* Background gradient orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-800/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Service Marketplace
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Any job. Any trade.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">
              Done fast.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Plumber, mechanic, electrician, handyman — describe the problem and AI
            dispatches the best local pro to your door automatically.
            Like Uber, for any skilled service.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/jobs/new"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl text-base transition shadow-lg shadow-indigo-900/40"
            >
              Describe Your Problem →
            </Link>
            <Link
              href="/contractor-profile"
              className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-medium px-8 py-4 rounded-2xl text-base transition"
            >
              I'm a Service Pro
            </Link>
          </div>

          {/* Service categories pill row */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["🔧 Plumbing", "⚡ Electrical", "🚗 Auto Mechanic", "❄️ HVAC", "🏠 Handyman", "💻 IT Support", "🌿 Landscaping", "🔒 Locksmith"].map((s) => (
              <span key={s} className="text-xs text-gray-500 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-full">
                {s}
              </span>
            ))}
            <span className="text-xs text-indigo-500 bg-indigo-950 border border-indigo-900 px-2.5 py-1 rounded-full">+ 25 more</span>
          </div>

          {/* Trust line */}
          <p className="mt-5 text-xs text-gray-600">
            No credit card required &nbsp;·&nbsp; Free to post &nbsp;·&nbsp; Service pros join free
          </p>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section className="bg-gray-900 border-b border-gray-800 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">How it works</h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              From problem to fixed in three steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                {/* connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%_-_1rem)] w-8 h-0.5 bg-gray-700 z-10" />
                )}
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 h-full hover:border-indigo-800 transition">
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-indigo-500 bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded-full">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section className="bg-gray-950 border-b border-gray-800 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">
              Everything you need, nothing you don't
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Built for people who value their time and pros who want quality jobs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 hover:border-indigo-800 rounded-2xl p-5 transition"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section className="bg-gray-900 border-b border-gray-800 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">What people are saying</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-gray-950 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <span key={j} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-1">
                  "{t.quote}"
                </p>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-gray-600 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FOR CONTRACTORS ══════════════ */}
      <section className="bg-gray-950 border-b border-gray-800 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-950 to-gray-900 border border-indigo-800 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-indigo-400 text-sm font-semibold uppercase tracking-wider mb-3">
                For Service Professionals
              </p>
              <h2 className="text-3xl font-bold text-white mb-4">
                Stop chasing leads. Let jobs come to you.
              </h2>
              <ul className="space-y-2 text-sm text-gray-400 mb-8">
                {[
                  "Works for any trade — plumbers, mechanics, electricians, IT, movers and more",
                  "Get matched to jobs that fit your exact service and location",
                  "Import your Google Business profile in one click",
                  "Build a trust score that gets you ranked higher over time",
                  "In-app chat, scheduling, and review management",
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/contractor-profile"
                className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 py-3.5 rounded-xl text-sm transition"
              >
                Set Up Your Profile →
              </Link>
            </div>

            <div className="flex-shrink-0 text-8xl hidden md:block">
              👷
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ BOTTOM CTA ══════════════ */}
      <section className="bg-gray-900 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Need something fixed?
          </h2>
          <p className="text-gray-400 text-base mb-8">
            Any service, any trade. Describe it in plain English — AI handles the rest.
          </p>
          <Link
            href="/jobs/new"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-4 rounded-2xl text-base transition shadow-lg shadow-indigo-900/40"
          >
            Post a Job — It's Free →
          </Link>
          <p className="mt-6 text-xs text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-indigo-400 hover:text-indigo-300 underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}
