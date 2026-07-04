/** @type {import('next').NextConfig} */
const nextConfig = {
  // node-ical's dependency chain (rrule-temporal -> @js-temporal/polyfill)
  // breaks when webpack bundles it into the RSC/route runtime — keep it
  // as a real Node require instead.
  experimental: {
    serverComponentsExternalPackages: ['node-ical', 'rrule-temporal', '@js-temporal/polyfill'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};
export default nextConfig;
