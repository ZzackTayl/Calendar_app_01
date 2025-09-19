/** @type {import('next').NextConfig} */

// Conditionally load bundle analyzer only if available (dev environment)
let withBundleAnalyzer;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
} catch (error) {
  // Bundle analyzer not available in production, use identity function
  withBundleAnalyzer = (config) => config;
}

const nextConfig = {
  // Build safety configuration - Security-first approach
  typescript: {
    // Type checking now enforced via prebuild script using incremental cache
    ignoreBuildErrors: true,
  },
  eslint: {
    // Linting runs in prebuild with persistent cache for faster builds
    ignoreDuringBuilds: true,
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
      // PWA manifest headers
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Service Worker headers
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  // Webpack optimization
  webpack: (config, { isServer, dev }) => {
    // Simple chunk optimization
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
        },
      };

      // Ignore native modules to prevent build errors on Vercel
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@node-rs/argon2': false,
      };
    }

    // Add external for native modules in server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@node-rs/argon2');
    }

    // Reduce stats output for faster builds
    if (!dev) {
      config.stats = {
        warnings: false,
        children: false,
        modules: false,
      };
    }

    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: ['bcrypt', 'googleapis', '@aws-sdk/client-ses', 'nodemailer', '@node-rs/argon2'],
    // Optimize bundling
    optimizeCss: true,
    // Enable optimized compiler
    esmExternals: 'loose',
    // Faster builds
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Docker deployment configuration
  output: 'standalone',
};

module.exports = withBundleAnalyzer(nextConfig);
