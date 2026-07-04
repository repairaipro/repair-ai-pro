/**
 * Schema.org JSON-LD structured data components for SEO.
 * Each page can use these to help search engines understand content.
 */

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'RepairAI Pro',
    description: 'AI-powered home repair marketplace connecting homeowners with verified contractors',
    url: 'https://repairaipro.com',
    logo: 'https://repairaipro.com/favicon.svg',
    areaServed: 'US',
    sameAs: [
      'https://instagram.com/repairaipro',
      'https://tiktok.com/@repairaipro',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@repairaipro.com',
      url: 'https://repairaipro.com/contact',
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export function ServiceSchema({ name, description, areaServed = 'US' }: { name: string; description: string; areaServed?: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    provider: {
      '@type': 'LocalBusiness',
      name: 'RepairAI Pro',
      url: 'https://repairaipro.com',
    },
    areaServed,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export function FAQSchema({ items }: { items: Array<{ q: string; a: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}

export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}
