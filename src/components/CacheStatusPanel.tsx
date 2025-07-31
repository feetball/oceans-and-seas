'use client'

import { useState, useEffect } from 'react'

interface CacheStatus {
  totalBuoys: number
  normalCount: number
  mediumCount: number
  highCount: number
  criticalCount: number
  tsunamiAlerts: number
  persistentAlerts: number
  lastUpdate: string | null
  cache: {
    memoryCacheAge: number
    statusCacheAge: number
    hasMemoryCache: boolean
    hasStatusCache: boolean
    memoryCacheAgeHuman: string
    statusCacheAgeHuman: string
  }
}

export default function CacheStatusPanel() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCacheStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/cache?action=status')
      if (!response.ok) throw new Error('Failed to fetch cache status')
      const data = await response.json()
      setCacheStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/cache?action=clear')
      if (!response.ok) throw new Error('Failed to clear cache')
      await fetchCacheStatus() // Refresh status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCacheStatus()
    const interval = setInterval(fetchCacheStatus, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
        <h3 className="text-red-400 font-semibold mb-2">Cache Status Error</h3>
        <p className="text-red-300 text-sm">{error}</p>
        <button
          onClick={fetchCacheStatus}
          className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-slate-200 font-semibold">Cache Status</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchCacheStatus}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs rounded"
          >
            {isLoading ? '⟳' : '↻'}
          </button>
          <button
            onClick={clearCache}
            disabled={isLoading}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-xs rounded"
          >
            Clear
          </button>
        </div>
      </div>

      {cacheStatus ? (
        <div className="space-y-3">
          {/* Buoy Status Summary */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Buoys:</span>
              <span className="text-slate-200">{cacheStatus.totalBuoys}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tsunami Alerts:</span>
              <span className={`font-medium ${cacheStatus.tsunamiAlerts > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {cacheStatus.tsunamiAlerts}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">Normal:</span>
              <span className="text-slate-200">{cacheStatus.normalCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">Medium:</span>
              <span className="text-slate-200">{cacheStatus.mediumCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">High:</span>
              <span className="text-slate-200">{cacheStatus.highCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">Critical:</span>
              <span className="text-slate-200">{cacheStatus.criticalCount}</span>
            </div>
          </div>

          {/* Persistent Alerts */}
          {cacheStatus.persistentAlerts > 0 && (
            <div className="bg-red-900/20 border border-red-500 rounded p-2">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-lg">⚠️</span>
                <span className="text-red-300 text-sm">
                  {cacheStatus.persistentAlerts} persistent alert{cacheStatus.persistentAlerts !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Cache Information */}
          <div className="border-t border-slate-700 pt-3">
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Data Cache:</span>
                <span className={cacheStatus.cache.hasMemoryCache ? 'text-green-400' : 'text-slate-400'}>
                  {cacheStatus.cache.memoryCacheAgeHuman}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status Cache:</span>
                <span className={cacheStatus.cache.hasStatusCache ? 'text-green-400' : 'text-slate-400'}>
                  {cacheStatus.cache.statusCacheAgeHuman}
                </span>
              </div>
              {cacheStatus.lastUpdate && (
                <div className="flex justify-between">
                  <span>Last Update:</span>
                  <span className="text-slate-300">
                    {new Date(parseInt(cacheStatus.lastUpdate)).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cache Performance Indicators */}
          <div className="flex gap-2 text-xs">
            <div className={`px-2 py-1 rounded ${
              cacheStatus.cache.hasMemoryCache ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400'
            }`}>
              Memory {cacheStatus.cache.hasMemoryCache ? '✓' : '✗'}
            </div>
            <div className={`px-2 py-1 rounded ${
              cacheStatus.cache.hasStatusCache ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400'
            }`}>
              Status {cacheStatus.cache.hasStatusCache ? '✓' : '✗'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-slate-400 text-sm">Loading cache status...</p>
        </div>
      )}
    </div>
  )
}
