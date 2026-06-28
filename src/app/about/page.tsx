import { Metadata } from 'next';
import Link from 'next/link';
import { Users, Zap, Target, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About us',
  description: 'Learn how RepairAI Pro is changing the home repair industry with AI and verified contractors.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden py-20" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            We're fixing home repair
          </h1>
          <p className="text-lg" style={{ color: 'var(--color-text-3)' }}>
            RepairAI Pro uses AI to diagnose your repair, estimate cost from real local job data, and match you with quality-scored contractors in seconds.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Our mission</h2>
          <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--color-text-3)' }}>
            Home repair is broken. Homeowners spend hours vetting contractors, comparing quotes, and hoping they don't get ripped off. Contractors compete on price in a fragmented market with no way to build reputation or predictable income.
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'var(--color-text-3)' }}>
            We built RepairAI Pro to fix that: one tap to diagnose, one tap to find a contractor, one tap to pay. Fair pricing. Verified work. Speed.
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--color-text)' }}>Our values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Speed',
                desc: 'Get a diagnosis and a quote in minutes, not days. Contractors claim jobs in seconds, not weeks of back-and-forth.',
              },
              {
                icon: <Target className="w-6 h-6" />,
                title: 'Accuracy',
                desc: 'AI diagnoses the actual problem. Real job data — not guesses — sets pricing. No surprises, no overcharges.',
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: 'Fairness',
                desc: 'Contractors earn what they deserve based on real skills and reputation. Homeowners pay what work is actually worth.',
              },
              {
                icon: <Heart className="w-6 h-6" />,
                title: 'Trust',
                desc: 'Photo-verified work. Milestone payments. Transparent reviews. No mystery, no risk.',
              },
            ].map(v => (
              <div key={v.title} className="rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                  {v.icon}
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--color-text)' }}>{v.title}</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-4)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="rounded-2xl p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Our story</h2>
          <div className="space-y-4 text-base leading-relaxed" style={{ color: 'var(--color-text-3)' }}>
            <p>
              RepairAI Pro started when our founder got a $2,000 quote to fix a leaky faucet. A week later, a contractor told them it was a $50 part. No one had diagnosed the problem — just guessed, and quoted high to be safe.
            </p>
            <p>
              That same founder spent years in the construction industry and knew the pain cut both ways: contractors were losing jobs to low-ballers, and homeowners had no way to tell the difference between someone skilled and someone who just owned a van.
            </p>
            <p>
              We set out to build a platform where the diagnosis is accurate (AI), the price is fair (data-driven), and the contractor is vetted (reputation-scored). We're obsessed with making the whole transaction fast, transparent, and trustworthy.
            </p>
            <p>
              Today, RepairAI Pro is helping contractors build sustainable businesses and homeowners fix their homes confidently.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Ready to get started?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard" className="btn btn-primary">
              Post a repair job
            </Link>
            <Link href="/contractor" className="btn btn-secondary">
              Join as a contractor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
