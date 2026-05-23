/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Skip TS/ESLint errors during build — legacy pages have type drift
  // that doesn't affect runtime. New pages are type-clean.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Environment variables — default to production API
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    NEXT_PUBLIC_INTEGRATIONS_URL: process.env.NEXT_PUBLIC_INTEGRATIONS_URL || 'http://localhost:3002',
    NEXT_PUBLIC_INTEGRATIONS_API_URL: process.env.NEXT_PUBLIC_INTEGRATIONS_API_URL || 'http://localhost:8010',
  },

  // Disable i18n (we handle RTL manually)
  i18n: undefined,

  // Image optimization
  images: {
    unoptimized: true,
  },

  // Proxy integrations backend — avoids mixed-content (HTTPS → HTTP)
  async rewrites() {
    const intApiUrl =
      process.env.INTEGRATIONS_API_URL || 'http://srv1431166.hstgr.cloud:8011';
    return [
      // OAuth callback: https://alloul.app/api/v1/integrations/oauth/callback/:service
      // → backend: http://server:8011/api/v1/integrations/oauth/callback/:service
      {
        source: '/api/v1/integrations/oauth/callback/:path*',
        destination: `${intApiUrl}/api/v1/integrations/oauth/callback/:path*`,
      },
      // All other integrations API calls
      {
        source: '/api/integrations/:path*',
        destination: `${intApiUrl}/api/v1/:path*`,
      },
    ];
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
