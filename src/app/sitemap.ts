import type { MetadataRoute } from 'next';
import { SERVICE_TRADES, SERVICE_CITIES } from '@/lib/seoServices';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://repairaipro.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,            lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/diagnose`,    lastModified: now, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}/services`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/guarantee`,   lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/jobs`,        lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE_URL}/jobs/new`,    lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/work`,        lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/contractor`,  lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/maintenance`, lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/auth/signin`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/financing`,   lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/contractor/pro`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/about`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE_URL}/contact`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${BASE_URL}/terms`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE_URL}/privacy`,     lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ];

  // Trade-by-city SEO landing pages
  const services: MetadataRoute.Sitemap = SERVICE_TRADES.flatMap((t) =>
    SERVICE_CITIES.map((c) => ({
      url: `${BASE_URL}/services/${t.slug}/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  return [...core, ...services];
}
