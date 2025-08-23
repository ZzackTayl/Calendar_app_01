/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Disable type checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Enable image optimization for better performance
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable compression for better loading times
  compress: true,
  // Enable SWC minification for faster builds
  swcMinify: true,
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Enable tree shaking for better bundle size
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    

    
    // Suppress MaxListenersExceededWarning in webpack
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: 'error', // Only show errors, suppress warnings
    };
    
    // Add custom webpack plugin to suppress specific warnings
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.done.tap('SuppressWarnings', (stats) => {
          // Filter out MaxListenersExceededWarning from compilation warnings
          if (stats.compilation && stats.compilation.warnings) {
            stats.compilation.warnings = stats.compilation.warnings.filter(
              warning => !warning.message.includes('MaxListenersExceededWarning')
            );
          }
        });
      }
    });
    
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);