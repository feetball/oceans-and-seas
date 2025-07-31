import { NOAABuoyData } from '@/types/buoy'

export interface BuoyCache {
  data: NOAABuoyData[]
  lastUpdated: string
  version: number
  metadata: {
    totalStations: number
    activeStations: number
    tsunamiAlerts: number
    lastFetchDuration: number
  }
}

export interface BuoyStatusCache {
  [buoyId: string]: {
    status: 'normal' | 'medium' | 'high' | 'critical'
    isTsunami: boolean
    lastStatusChange: string
    consecutiveAlertsCount: number
    lastReading: {
      waveHeight: number
      timestamp: string
      location: { latitude: number; longitude: number }
    }
  }
}

// Vercel-compatible caching (memory-only in serverless environment)
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const STATUS_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for status updates
const IS_VERCEL = process.env.VERCEL === '1'
const IS_SERVERLESS = typeof process.env.AWS_LAMBDA_FUNCTION_NAME !== 'undefined' || IS_VERCEL

class BuoyCacheManager {
  private static instance: BuoyCacheManager
  private memoryCache: BuoyCache | null = null
  private statusCache: BuoyStatusCache | null = null
  private lastMemoryCacheUpdate = 0
  private lastStatusCacheUpdate = 0

  static getInstance(): BuoyCacheManager {
    if (!BuoyCacheManager.instance) {
      BuoyCacheManager.instance = new BuoyCacheManager()
    }
    return BuoyCacheManager.instance
  }

  async getBuoyData(): Promise<BuoyCache | null> {
    // Check memory cache first
    const now = Date.now()
    if (this.memoryCache && (now - this.lastMemoryCacheUpdate) < CACHE_DURATION) {
      console.log('🚀 Serving buoy data from memory cache')
      return this.memoryCache
    }

    // In serverless environment, only use memory cache
    if (IS_SERVERLESS) {
      console.log('� No valid cache found in serverless environment')
      return null
    }

    // For local development, try Redis or external cache if available
    console.log('💾 No valid cache found, will fetch fresh data')
    return null
  }

  async setBuoyData(data: NOAABuoyData[], fetchDuration: number): Promise<void> {
    const now = new Date()
    const cache: BuoyCache = {
      data,
      lastUpdated: now.toISOString(),
      version: 1,
      metadata: {
        totalStations: data.length,
        activeStations: data.filter(b => b.status === 'active').length,
        tsunamiAlerts: 0, // Will be calculated by the caller
        lastFetchDuration: fetchDuration
      }
    }

    // Update memory cache
    this.memoryCache = cache
    this.lastMemoryCacheUpdate = Date.now()

    // In serverless environment, only use memory cache
    if (IS_SERVERLESS) {
      console.log(`💾 Cached ${data.length} buoy records in memory (serverless)`)
      return
    }

    console.log(`💾 Cached ${data.length} buoy records in memory`)
  }

  async getBuoyStatus(): Promise<BuoyStatusCache | null> {
    const now = Date.now()
    
    // Check memory cache first
    if (this.statusCache && (now - this.lastStatusCacheUpdate) < STATUS_CACHE_DURATION) {
      console.log('🚀 Serving status data from memory cache')
      return this.statusCache
    }

    // In serverless environment, only use memory cache
    if (IS_SERVERLESS) {
      console.log('� No buoy status cache found in serverless environment')
      return null
    }

    console.log('💾 No buoy status cache found, starting fresh')
    return null
  }

  async setBuoyStatus(statusCache: BuoyStatusCache): Promise<void> {
    // Update memory cache
    this.statusCache = statusCache
    this.lastStatusCacheUpdate = Date.now()

    // In serverless environment, only use memory cache
    console.log(`💾 Cached status for ${Object.keys(statusCache).length} buoys in memory`)
  }

  async updateBuoyStatus(
    buoyId: string, 
    status: 'normal' | 'medium' | 'high' | 'critical',
    isTsunami: boolean,
    waveHeight: number,
    location: { latitude: number; longitude: number }
  ): Promise<void> {
    const currentCache = await this.getBuoyStatus() || {}
    const now = new Date().toISOString()
    
    const previousStatus = currentCache[buoyId]
    const statusChanged = !previousStatus || previousStatus.status !== status
    
    currentCache[buoyId] = {
      status,
      isTsunami,
      lastStatusChange: statusChanged ? now : (previousStatus?.lastStatusChange || now),
      consecutiveAlertsCount: isTsunami ? 
        (previousStatus?.isTsunami ? (previousStatus.consecutiveAlertsCount + 1) : 1) : 0,
      lastReading: {
        waveHeight,
        timestamp: now,
        location
      }
    }

    await this.setBuoyStatus(currentCache)
  }

  async getStatusSummary(): Promise<{
    totalBuoys: number
    normalCount: number
    mediumCount: number
    highCount: number
    criticalCount: number
    tsunamiAlerts: number
    persistentAlerts: number
    lastUpdate: string | null
  }> {
    const statusCache = await this.getBuoyStatus()
    if (!statusCache) {
      return {
        totalBuoys: 0,
        normalCount: 0,
        mediumCount: 0,
        highCount: 0,
        criticalCount: 0,
        tsunamiAlerts: 0,
        persistentAlerts: 0,
        lastUpdate: null
      }
    }

    const statuses = Object.values(statusCache)
    return {
      totalBuoys: statuses.length,
      normalCount: statuses.filter(s => s.status === 'normal').length,
      mediumCount: statuses.filter(s => s.status === 'medium').length,
      highCount: statuses.filter(s => s.status === 'high').length,
      criticalCount: statuses.filter(s => s.status === 'critical').length,
      tsunamiAlerts: statuses.filter(s => s.isTsunami).length,
      persistentAlerts: statuses.filter(s => s.consecutiveAlertsCount >= 3).length,
      lastUpdate: statuses.length > 0 ? 
        Math.max(...statuses.map(s => new Date(s.lastReading.timestamp).getTime())).toString() : null
    }
  }

  async clearCache(): Promise<void> {
    this.memoryCache = null
    this.statusCache = null
    this.lastMemoryCacheUpdate = 0
    this.lastStatusCacheUpdate = 0

    console.log('🗑️ Memory cache cleared (serverless environment)')
  }

  getCacheInfo(): {
    memoryCacheAge: number
    statusCacheAge: number
    hasMemoryCache: boolean
    hasStatusCache: boolean
  } {
    const now = Date.now()
    return {
      memoryCacheAge: this.memoryCache ? now - this.lastMemoryCacheUpdate : -1,
      statusCacheAge: this.statusCache ? now - this.lastStatusCacheUpdate : -1,
      hasMemoryCache: !!this.memoryCache,
      hasStatusCache: !!this.statusCache
    }
  }
}

export const buoyCacheManager = BuoyCacheManager.getInstance()
