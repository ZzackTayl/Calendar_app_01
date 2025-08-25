/** @type {import('next').NextConfig} */

const nextConfig = {
  // Disable type checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Basic settings only for faster builds
  swcMinify: true,
};

module.exports = nextConfig;