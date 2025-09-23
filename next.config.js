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
    ignoreBuildErrors: false,
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
  // Advanced webpack optimization for large codebases
  webpack: (config, { isServer, dev }) => {
    // Ensure a Node-safe global object during server builds to avoid `self` reference errors
    config.output = config.output || {};
    config.output.globalObject = 'globalThis';

    // Aggressive memory and performance optimizations
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        cacheDirectory: require('path').resolve(__dirname, '.next/cache/webpack'),
        maxMemoryGenerations: 1,
        compression: 'gzip',
      };

      // Client-only chunk splitting to avoid SSR runtime issues
      if (!isServer) {
        // Reduce memory pressure during builds
        config.optimization.realContentHash = false;
        config.optimization.removeAvailableModules = false;
        config.optimization.removeEmptyChunks = false;
        config.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 200000,
          cacheGroups: {
            googleapis: {
              test: /[\\/]node_modules[\\/]googleapis[\\/]/,
              name: 'googleapis',
              priority: 30,
              chunks: 'all',
              enforce: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
              maxSize: 100000,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        };
      }

      // Minimize memory usage during compilation
      config.stats = {
        preset: 'errors-only',
        colors: true,
        timings: true,
        builtAt: true,
        errorDetails: true,
        warnings: false,
        children: false,
        modules: false,
        chunks: false,
        chunkModules: false,
        assets: false,
      };

      // Configure module resolution to reduce memory pressure
      config.resolve.symlinks = false;
      config.resolve.cacheWithContext = false;
    }

    // Client-side optimizations
    if (!isServer) {
      // Ignore native modules to prevent build errors on Vercel
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@node-rs/argon2': false,
        'fs': false,
        'path': false,
        'crypto': false,
        'stream': false,
        'util': false,
        'buffer': false,
        'events': false,
        'string_decoder': false,
        'querystring': false,
        'url': false,
        'http': false,
        'https': false,
        'os': false,
        'assert': false,
        'constants': false,
        'timers': false,
        'tty': false,
        'vm': false,
        'zlib': false,
        'child_process': false,
        'net': false,
        'tls': false,
        'dns': false,
        'dgram': false,
        'cluster': false,
        'module': false,
        'process': false,
        'readline': false,
        'repl': false,
      };
    }

    // Server-side optimizations
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@node-rs/argon2');

      // Externalize googleapis on server to reduce bundle size
      config.externals.push({
        'googleapis': 'commonjs googleapis',
      });

      // Externalize axios to prevent bundling issues
      config.externals.push({
        'axios': 'commonjs axios',
      });
    }

    // Reduce parallel processing to prevent memory exhaustion
    config.parallelism = Math.min(4, require('os').cpus().length);


    return config;
  },

  // Experimental features for better performance
  experimental: {
    // Enable server components
    serverComponentsExternalPackages: ['bcrypt', 'googleapis', '@aws-sdk/client-ses', 'nodemailer', '@node-rs/argon2'],
    // Optimize bundling
    optimizeCss: true,
    // Enable optimized compiler - DISABLED to fix build issues
    // esmExternals: 'loose',
    // Faster builds with reduced memory pressure
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Reduce memory usage during builds
    webpackBuildWorker: false,
    // Optimize turbo mode for large codebases - DISABLED to fix build issues
    // turbo: {
    //   rules: {
    //     '*.svg': ['@svgr/webpack'],
    //   },
    // },
  },
  // Docker deployment configuration
  output: 'standalone',
};

module.exports = withBundleAnalyzer(nextConfig);
