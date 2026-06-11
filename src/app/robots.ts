import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://repairaipro.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/chat/',
          '/pay/',
          '/contractor-inbox',
          '/my-jobs',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
