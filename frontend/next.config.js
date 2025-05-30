/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  // Enable experimental features for better performance
  experimental: {
    serverActions: {},
  },
}

module.exports = nextConfig 