/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Enable standalone output for production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // Ensure proper API URL resolution
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
