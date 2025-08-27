/** @type {import('next').NextConfig} */

const nextConfig = {
  // Build safety configuration
  typescript: {
    // Enable type checking in production, but allow development to be faster
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    // Enable linting in production, but allow development to be faster
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  // Basic settings for optimized builds
  swcMinify: true,
  // Additional security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
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
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  // Experimental features for better performance
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: ['bcrypt'],
  },
};

module.exports = nextConfig;