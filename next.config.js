/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel optimizations
  experimental: {
    // Note: Some experimental features may change in future versions
  },
  
  // Server external packages for Vercel
  serverExternalPackages: ['leaflet'],
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdnjs.cloudflare.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Environment variables
  env: {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/buoys',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache, 10min stale
          },
        ],
      },
      {
        source: '/api/cache',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120', // 1min cache, 2min stale
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
