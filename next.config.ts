import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.123.47', 'linkedinpost.atanusroy.com'],

  // Allow external images from LinkedIn CDN
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.licdn.com' },
      { protocol: 'https', hostname: '*.licdn.com' },
    ],
  },

  // Increase body size limit for file uploads (processed in-memory)
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },

  // External packages that need full Node.js
  serverExternalPackages: [
    'mongoose',
    'bcryptjs',
    'nodemailer',
    'bullmq',
    'ioredis',
  ],

  // Packages that need to be transpiled by Next.js (ESM-only packages)
  transpilePackages: ['react-hot-toast'],
}

export default nextConfig
