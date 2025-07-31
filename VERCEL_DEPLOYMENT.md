# 🚀 Vercel Deployment Guide

## Overview
This guide covers deploying the Pacific Tsunami Detection System to Vercel, with optimizations for their serverless platform.

## Pre-Deployment Setup

### 1. Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### 2. Prepare Your Repository
Ensure your code is pushed to GitHub, GitLab, or Bitbucket.

## Vercel Configuration

### Project Settings
The project includes a `vercel.json` configuration file with:

- **Function Timeout**: 300 seconds (5 minutes) for NOAA data fetching
- **Region**: `iad1` (US East) for optimal NOAA API performance
- **Framework**: Next.js with automatic optimization

### Environment Variables
No additional environment variables are required. The application automatically detects Vercel deployment via `process.env.VERCEL`.

## Deployment Methods

### Method 1: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Select the project root directory
5. Click "Deploy"

### Method 2: Vercel CLI
```bash
cd /path/to/oceans-and-seas
vercel
```

Follow the CLI prompts to configure your deployment.

### Method 3: Git Integration
Once connected, automatic deployments trigger on:
- Push to main/master branch (production)
- Pull requests (preview deployments)

## Vercel-Specific Optimizations

### 1. **Serverless Caching**
- Memory-only caching (no file system writes)
- Automatic cache invalidation on cold starts
- Edge caching with `s-maxage` headers

### 2. **Performance Optimizations**
- Limited to 50 buoy stations for faster initial load
- Reduced request delays (50ms vs 100ms)
- 5-second timeouts on NOAA API calls
- Graceful fallback to mock data

### 3. **Error Handling**
- Stale cache serving on API failures
- Individual station error isolation
- Detailed error headers for debugging

### 4. **Response Caching**
- Buoy data: 5-minute cache, 10-minute stale-while-revalidate
- Cache status: 1-minute cache, 2-minute stale-while-revalidate
- Headers include cache status indicators

## Build Process

The application includes optimized build settings:

```javascript
// next.config.js optimizations for Vercel
{
  experimental: {
    serverComponentsExternalPackages: ['leaflet']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
      }
    }
    return config
  }
}
```

## Performance Expectations

### Cold Start Performance
- Initial load: ~5-10 seconds (NOAA API fetch)
- Subsequent loads: ~500ms (cached)
- Map rendering: ~1-2 seconds

### Memory Usage
- Serverless function: ~128MB baseline
- With cache: ~256MB peak
- Client bundle: ~2MB gzipped

## Monitoring & Debugging

### Vercel Analytics
- Function duration tracking
- Error rate monitoring
- Cache hit/miss ratios

### Custom Headers
- `X-Cache-Status`: HIT/MISS/STALE
- `X-Fetch-Duration`: API response time
- `X-Environment`: vercel/local

### Logs
View function logs in the Vercel dashboard:
1. Go to your project
2. Click "Functions"
3. Select API route to view logs

## Scaling Considerations

### Limits
- **Function Timeout**: 300 seconds (configurable)
- **Memory**: 1008MB max on Pro plan
- **Bandwidth**: Unlimited on Pro plan
- **Requests**: 100GB included, then usage-based

### Optimization Tips
1. **Enable Pro Plan** for better performance and no cold starts
2. **Use Edge Caching** via CDN for static assets
3. **Implement Redis** for persistent caching (requires external service)
4. **Add Database** for historical tsunami data storage

## Custom Domain Setup

### Using Vercel Domains
1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed

### SSL Certificate
- Automatically provisioned by Vercel
- Supports custom SSL certificates on Pro plan

## Troubleshooting

### Common Issues

#### 1. Function Timeout
**Problem**: NOAA API calls timing out
**Solution**: 
- Increase timeout in `vercel.json`
- Reduce number of concurrent requests
- Implement request queuing

#### 2. Memory Limits
**Problem**: Out of memory errors
**Solution**:
- Upgrade to Pro plan (1008MB limit)
- Optimize data structures
- Implement data pagination

#### 3. Cold Starts
**Problem**: Slow initial loads
**Solution**:
- Upgrade to Pro plan (no cold starts)
- Implement warming functions
- Use edge caching

#### 4. CORS Issues
**Problem**: Client-side API calls failing
**Solution**:
- Use relative URLs for API calls
- Add proper CORS headers if needed

### Debug Commands
```bash
# Local development
npm run dev

# Build test
npm run build

# Preview deployment
vercel --prod=false
```

## Cost Optimization

### Free Tier Limits
- 100GB bandwidth/month
- Serverless function invocations: included
- Build minutes: 6,000/month

### Pro Plan Benefits ($20/month)
- No cold starts
- Advanced analytics
- More build minutes
- Priority support

## Security

### Built-in Security
- HTTPS by default
- DDoS protection
- Edge network security

### Best Practices
- No API keys stored in client code
- Server-side data validation
- Rate limiting on API routes

## Maintenance

### Automatic Updates
- Dependency updates via Renovate/Dependabot
- Security patches applied automatically
- Framework updates through Vercel

### Manual Tasks
- Monitor function performance
- Review error logs weekly
- Update NOAA station data monthly

Your Pacific Tsunami Detection System is now optimized for Vercel deployment with enterprise-grade performance and reliability!
