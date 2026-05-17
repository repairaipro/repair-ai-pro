'use client';

import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedHeadline, AnimatedSubheadline } from '@/components/AnimatedHeadline';
import { AnimatedStats } from '@/components/AnimatedStats';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/ScrollReveal';
import { AnimatedPricingCard } from '@/components/AnimatedPricingCard';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import { PageLayout, PageHeader } from '@/components/PageLayout';
import { useState } from 'react';
import { Plus, Zap, Shield, Brain } from 'lucide-react';

export default function ShowcasePage() {
  const [tabValue, setTabValue] = useState('buttons');

  return (
    <PageLayout maxWidth="5xl">
      <PageHeader
        title="Component Showcase"
        description="Explore all premium animated components used throughout the platform"
      />

      <AnimatedTabs
        defaultValue="buttons"
        onChange={setTabValue}
        tabs={[
          {
            label: 'Buttons',
            value: 'buttons',
            icon: <Zap className="w-4 h-4" />,
            content: (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                    Button Variants
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnimatedButton variant="primary" size="md">
                      Primary Button
                    </AnimatedButton>
                    <AnimatedButton variant="secondary" size="md">
                      Secondary Button
                    </AnimatedButton>
                    <AnimatedButton variant="ghost" size="md">
                      Ghost Button
                    </AnimatedButton>
                    <AnimatedButton variant="primary" size="sm">
                      Small Button
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: 'Stats',
            value: 'stats',
            icon: <Shield className="w-4 h-4" />,
            content: (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Animated Statistics
                </h3>
                <AnimatedStats
                  stats={[
                    { value: 1200, label: 'Jobs Posted', suffix: '+' },
                    { value: 340, label: 'Verified Pros', suffix: '+' },
                    { value: 4.9, label: 'Avg Rating', suffix: '★' },
                    { value: 45, label: 'Avg Match Time', suffix: 'm' },
                  ]}
                />
              </div>
            ),
          },
          {
            label: 'Pricing',
            value: 'pricing',
            icon: <Brain className="w-4 h-4" />,
            content: (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  Animated Pricing Cards
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <AnimatedPricingCard
                    title="Starter"
                    subtitle="Perfect for beginners"
                    price="9"
                    period="/month"
                    features={['Feature 1', 'Feature 2', 'Feature 3']}
                    cta={{ label: 'Get Started', href: '#' }}
                    index={0}
                  />
                  <AnimatedPricingCard
                    title="Professional"
                    subtitle="For serious users"
                    price="29"
                    period="/month"
                    features={[
                      'Everything in Starter',
                      'Advanced features',
                      'Priority support',
                    ]}
                    cta={{ label: 'Start Free Trial', href: '#' }}
                    highlight={true}
                    badge="POPULAR"
                    index={1}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* Section: Headlines */}
      <section className="mt-16 space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
            Staggered Headlines
          </h2>
          <AnimatedHeadline
            className="text-4xl font-bold mb-4"
            style={{ color: 'var(--color-text)' }}
            as="h2"
          >
            This headline reveals word by word
          </AnimatedHeadline>
          <AnimatedSubheadline
            className="text-lg"
            style={{ color: 'var(--color-text-3)' }}
            delay={0.3}
          >
            Subheadings animate in smoothly with spring physics
          </AnimatedSubheadline>
        </div>
      </section>

      {/* Section: Scroll Reveals */}
      <section className="mt-16 space-y-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Scroll-Triggered Reveals
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div
                className="card p-6 space-y-3"
                style={{ borderTop: '2px solid rgba(99,102,241,0.3)' }}
              >
                <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  Card {i + 1}
                </h3>
                <p style={{ color: 'var(--color-text-4)' }} className="text-sm">
                  Scrolls into view with spring physics animation. Scroll down to see more!
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Section: Stagger Container */}
      <section className="mt-16 space-y-8">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Staggered List Items
        </h2>
        <StaggerContainer staggerDelay={0.08}>
          <ul className="space-y-3">
            {[
              'Smooth entrance animations with staggered delays',
              'Spring physics for natural motion',
              'Responsive to scroll and viewport',
              'Perfect for job listings, contractor cards, and more',
            ].map((item, i) => (
              <StaggerItem key={i}>
                <li
                  className="card p-4 flex items-start gap-3"
                  style={{ borderLeft: '3px solid rgba(99,102,241,0.3)' }}
                >
                  <span style={{ color: 'var(--color-brand)' }} className="font-bold">
                    {i + 1}.
                  </span>
                  <span style={{ color: 'var(--color-text)' }}>{item}</span>
                </li>
              </StaggerItem>
            ))}
          </ul>
        </StaggerContainer>
      </section>

      {/* Section: Info Box */}
      <section className="mt-16 p-6 rounded-2xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <h3 className="font-semibold text-lg mb-2" style={{ color: '#818cf8' }}>
          ✨ Premium Component Library
        </h3>
        <p style={{ color: 'var(--color-text-3)' }} className="text-sm">
          These components use Framer Motion for smooth, natural animations with spring physics.
          They're fully responsive, accessible, and match the design system. Build world-class
          experiences by combining these components throughout your app.
        </p>
      </section>
    </PageLayout>
  );
}
