import type { Metadata } from 'next';
import Link from 'next/link';
import { SERVICE_TRADES, SERVICE_CITIES } from '@/lib/seoServices';

export const metadata: Metadata = {
  title: 'Home Repair Services & Pricing by City',
  description:
    'Transparent repair pricing for plumbing, electrical, HVAC, roofing, and more across the Houston metro. Free AI diagnosis and fair price estimates — no sign-up.',
  alternates: { canonical: '/services' },
};

export default function ServicesHubPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        <header className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Repair Services &amp; Pricing
          </h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--color-text-4)' }}>
            Transparent, data-driven pricing for every trade we serve in the Houston metro.
            Pick your service and city — or skip straight to a free AI diagnosis.
          </p>
          <Link href="/diagnose" className="btn btn-primary btn-sm mt-4 inline-flex">
            Diagnose It Free →
          </Link>
        </header>

        <div className="space-y-6">
          {SERVICE_TRADES.map((t) => (
            <section
              key={t.slug}
              className="rounded-2xl p-5"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
                  {t.emoji} {t.name}
                </h2>
                <span className="text-xs font-semibold" style={{ color: '#34d399' }}>
                  typically ${t.typicalLow}–${t.typicalHigh}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CITIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/services/${t.slug}/${c.slug}`}
                    className="text-xs px-2.5 py-1 rounded-full hover:underline"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-3)', border: '1px solid var(--color-border)' }}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
