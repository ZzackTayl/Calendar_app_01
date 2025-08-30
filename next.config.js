/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Build safety configuration - Security-first approach
  typescript: {
    // Enable type checking for security and stability
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable linting during builds for security compliance
    ignoreDuringBuilds: false,
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
  // Webpack optimization
  webpack: (config, { isServer }) => {
    // Simple chunk optimization
    if (!isServer) {
      config.optimization.splitChunks.chunks = 'all';
    }
    
    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: ['bcrypt', 'googleapis', '@aws-sdk/client-ses', 'nodemailer'],
    // Optimize bundling
    optimizeCss: true,
  },
  // Docker deployment configuration
  output: 'standalone',
};

module.exports = withBundleAnalyzer(nextConfig);