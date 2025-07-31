import { NextResponse } from 'next/server'
import { buoyCacheManager } from '@/utils/buoy-cache'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        const summary = await buoyCacheManager.getStatusSummary()
        const cacheInfo = buoyCacheManager.getCacheInfo()
        
        return NextResponse.json({
          ...summary,
          cache: {
            memoryCacheAge: cacheInfo.memoryCacheAge,
            statusCacheAge: cacheInfo.statusCacheAge,
            hasMemoryCache: cacheInfo.hasMemoryCache,
            hasStatusCache: cacheInfo.hasStatusCache,
            memoryCacheAgeHuman: cacheInfo.memoryCacheAge > 0 ? 
              `${Math.round(cacheInfo.memoryCacheAge / 1000)}s ago` : 'No cache',
            statusCacheAgeHuman: cacheInfo.statusCacheAge > 0 ? 
              `${Math.round(cacheInfo.statusCacheAge / 1000)}s ago` : 'No cache'
          },
          environment: {
            isVercel: !!process.env.VERCEL,
            vercelEnv: process.env.VERCEL_ENV,
            serverless: true
          }
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'X-Environment': process.env.VERCEL ? 'vercel' : 'local'
          }
        })

      case 'clear':
        await buoyCacheManager.clearCache()
        return NextResponse.json({ 
          message: 'Cache cleared successfully',
          environment: process.env.VERCEL ? 'vercel-serverless' : 'local'
        }, {
          headers: {
            'X-Cache-Action': 'cleared'
          }
        })

      case 'buoy-status':
        const buoyStatus = await buoyCacheManager.getBuoyStatus()
        return NextResponse.json(buoyStatus || {}, {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240'
          }
        })

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use ?action=status, ?action=clear, or ?action=buoy-status' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Cache API error:', error)
    return NextResponse.json(
      { error: 'Failed to process cache request' },
      { status: 500 }
    )
  }
}
