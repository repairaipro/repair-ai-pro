import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://repairaipro.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`,            lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/jobs`,        lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE_URL}/jobs/new`,    lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/contractor`,  lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/maintenance`, lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/auth/signin`, lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];
}
