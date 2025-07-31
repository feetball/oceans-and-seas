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
    domains: ['cdnjs.cloudflare.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack configuration for client-side libraries
  webpack: (config, { isServer }) => {
    // Exclude server-side packages from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }
    
    return config
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
