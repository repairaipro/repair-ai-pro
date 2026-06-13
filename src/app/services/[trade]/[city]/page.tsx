import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SERVICE_TRADES, SERVICE_CITIES, getTrade, getCity } from '@/lib/seoServices';
import { getPricingTrends } from '@/lib/pricingEstimate';

export const revalidate = 86400; // refresh daily (pulls live pricing data)
export const dynamicParams = false;

type Params = { trade: string; city: string };

export function generateStaticParams(): Params[] {
  return SERVICE_TRADES.flatMap((t) =>
    SERVICE_CITIES.map((c) => ({ trade: t.slug, city: c.slug }))
  );
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const trade = getTrade(params.trade);
  const city  = getCity(params.city);
  if (!trade || !city) return {};
  const title = `${trade.name} Cost in ${city.name}, ${city.state} (${new Date().getFullYear()})`;
  const description = `${trade.name} in ${city.name} typically costs $${trade.typicalLow}–$${trade.typicalHigh}. Get a free AI diagnosis and fair price estimate in 10 seconds — no sign-up. Verified local pros, pay only when the job is done.`;
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/services/${trade.slug}/${city.slug}` },
  };
}

export default async function ServiceCityPage({ params }: { params: Params }) {
  const trade = getTrade(params.trade);
  const city  = getCity(params.city);
  if (!trade || !city) notFound();

  // Overlay live platform pricing when we have real completed-job data
  let liveAvg: number | null = null;
  let liveCount = 0;
  try {
    const trends = await getPricingTrends(trade.pricingKey, '');
    if (trends.jobsCount >= 5 && trends.avgPrice > 0) {
      liveAvg = trends.avgPrice;
      liveCount = trends.jobsCount;
    }
  } catch { /* static ranges are the fallback */ }

  const year = new Date().getFullYear();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: trade.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${trade.name} in ${city.name}, ${city.state}`,
    areaServed: { '@type': 'City', name: `${city.name}, ${city.state}` },
    provider: { '@type': 'Organization', name: 'RepairAI Pro' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: trade.typicalLow,
      highPrice: trade.typicalHigh,
    },
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Breadcrumb */}
        <nav className="text-xs" style={{ color: 'var(--color-text-4)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          {' / '}
          <Link href="/services" className="hover:underline">Services</Link>
          {' / '}
          <span style={{ color: 'var(--color-text-2)' }}>{trade.short} in {city.name}</span>
        </nav>

        {/* Hero */}
        <header>
          <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: 'var(--color-text)' }}>
            {trade.emoji} {trade.name} Cost in {city.name}, {city.state} ({year})
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-3)' }}>
            {trade.name.toLowerCase().includes('cost') ? trade.name : `${trade.name}`} in {city.name} typically
            runs <strong style={{ color: 'var(--color-text)' }}>${trade.typicalLow}–${trade.typicalHigh}</strong> for
            common repairs, depending on the problem, parts, and urgency.
            {liveAvg && (
              <> Based on <strong style={{ color: 'var(--color-text)' }}>{liveCount} completed jobs</strong> on
              RepairAI Pro, the local average is <strong style={{ color: '#34d399' }}>${liveAvg}</strong>.</>
            )}
          </p>
        </header>

        {/* Primary CTA */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))', border: '1px solid rgba(99,102,241,0.25)' }}
        >
          <h2 className="font-bold mb-1" style={{ color: 'var(--color-text)' }}>
            Not sure what&apos;s wrong — or what it should cost?
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-4)' }}>
            Describe the problem (or snap a photo). AI diagnoses it and shows a fair {city.name} price in 10 seconds. Free, no sign-up.
          </p>
          <Link href="/diagnose" className="btn btn-primary">
            Diagnose It Free →
          </Link>
        </div>

        {/* Common jobs price table */}
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            Common {trade.short.toLowerCase()} jobs &amp; typical prices
          </h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            {trade.commonJobs.map((j, i) => (
              <div
                key={j.job}
                className="flex items-center justify-between px-4 py-3 text-sm"
                style={{
                  background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)',
                }}
              >
                <span style={{ color: 'var(--color-text-2)' }}>{j.job}</span>
                <span className="font-semibold whitespace-nowrap ml-4" style={{ color: '#34d399' }}>{j.range}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-4)' }}>
            Ranges reflect typical {city.name}-area pricing. Your exact cost depends on access, parts, and urgency —
            run a <Link href="/diagnose" className="underline">free AI estimate</Link> for your specific problem.
          </p>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            How RepairAI Pro works in {city.name}
          </h2>
          <ol className="space-y-3">
            {[
              ['Describe the problem', 'Type it or upload a photo. AI identifies the issue, severity, and a fair price range before you talk to anyone.'],
              ['Local pros are invited automatically', `Verified ${trade.short.toLowerCase()} pros near ${city.name} get notified instantly, ranked by rating, response speed, and proximity.`],
              ['Compare bids against the AI fair price', 'Every bid is shown against the data-driven price band — you instantly see what’s fair, what’s a deal, and what’s high.'],
              ['Pay only when the work is confirmed', 'Your payment is held securely and released after you confirm the job is done — with photo documentation.'],
            ].map(([title, body], i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-4)' }}>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            {trade.short} FAQs
          </h2>
          <div className="space-y-3">
            {trade.faqs.map((f) => (
              <details
                key={f.q}
                className="rounded-xl px-4 py-3 group"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <summary className="text-sm font-semibold cursor-pointer list-none" style={{ color: 'var(--color-text)' }}>
                  {f.q}
                </summary>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-text-3)' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center pb-6">
          <Link href="/diagnose" className="btn btn-primary">
            Get a free {trade.short.toLowerCase()} diagnosis →
          </Link>
          <p className="text-[11px] mt-3" style={{ color: 'var(--color-text-4)' }}>
            Free to use · verified local pros · payment protected
          </p>
        </div>

        {/* Nearby cities (internal linking) */}
        <footer style={{ borderTop: '1px solid var(--color-border)' }} className="pt-5">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-3)' }}>
            {trade.short} in nearby cities
          </p>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/services/${trade.slug}/${c.slug}`}
                className="text-xs px-2.5 py-1 rounded-full hover:underline"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-4)', border: '1px solid var(--color-border)' }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
