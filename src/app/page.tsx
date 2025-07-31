'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import BuoyDataPanel from '@/components/BuoyDataPanel'
import TsunamiAlert from '@/components/TsunamiAlert'
import TsunamiControlPanel from '@/components/TsunamiControlPanel'
import CacheStatusPanel from '@/components/CacheStatusPanel'
import { NOAABuoyData } from '@/types/buoy'

// Dynamically import the map component to avoid SSR issues
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-800">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-300">Loading interactive map...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const [buoyData, setBuoyData] = useState<NOAABuoyData[]>([])
  const [selectedBuoy, setSelectedBuoy] = useState<NOAABuoyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isSimulationActive, setIsSimulationActive] = useState(true) // Default to simulation active
  const [selectedSimulationEvent, setSelectedSimulationEvent] = useState('mock')

  // Enhanced tsunami detection logic
  const detectTsunami = useCallback((buoy: NOAABuoyData) => {
    if (buoy.readings.length < 2) return { isTsunami: false, severity: 'normal' as const }
    
    const latestReading = buoy.readings[buoy.readings.length - 1]
    const previousReading = buoy.readings[buoy.readings.length - 2]
    
    // Use wave height as primary indicator
    const currentHeight = latestReading.waveHeight || latestReading.waterColumnHeight || 0
    const previousHeight = previousReading.waveHeight || previousReading.waterColumnHeight || 0
    
    const heightChange = currentHeight - previousHeight
    const heightChangePercent = (heightChange / (previousHeight || 1)) * 100
    
    // Check for multiple warning indicators
    const hasSignificantWaveHeight = currentHeight > 2.5 // Lowered threshold for better detection
    const hasRapidIncrease = heightChangePercent > 30 // 30% increase
    const hasLargeMagnitude = currentHeight > 4.0 // Very large waves
    const hasCriticalMagnitude = currentHeight > 6.0 // Critical level waves
    
    // Calculate trend over last few readings for better detection
    if (buoy.readings.length >= 3) {
      const recent = buoy.readings.slice(-4) // Look at last 4 readings
      const heights = recent.map(r => r.waveHeight || r.waterColumnHeight || 0)
      const isIncreasing = heights.every((val, i) => i === 0 || val >= heights[i - 1] * 0.9) // Allow for slight variance
      const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length
      
      // Enhanced detection logic
      if (hasCriticalMagnitude || currentHeight > 7.0) {
        return { isTsunami: true, severity: 'critical' as const }
      } else if (hasLargeMagnitude || (hasSignificantWaveHeight && hasRapidIncrease)) {
        return { isTsunami: true, severity: 'high' as const }
      } else if (hasSignificantWaveHeight || heightChangePercent > 20 || (avgHeight > 2.0 && isIncreasing)) {
        return { isTsunami: true, severity: 'medium' as const }
      } else if (currentHeight > 2.0 || heightChangePercent > 15) {
        return { isTsunami: true, severity: 'medium' as const }
      }
    }
    
    // Fallback for initial detection
    if (hasCriticalMagnitude) {
      return { isTsunami: true, severity: 'critical' as const }
    } else if (hasLargeMagnitude) {
      return { isTsunami: true, severity: 'high' as const }
    } else if (hasSignificantWaveHeight) {
      return { isTsunami: true, severity: 'medium' as const }
    }
    
    return { isTsunami: false, severity: 'normal' as const }
  }, [])

  const fetchBuoyData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/buoys', {
        cache: 'no-store', // Ensure fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch buoy data: ${response.status}`)
      }
      
      const data: NOAABuoyData[] = await response.json()
      setBuoyData(data)
      setLastUpdate(new Date())
      
      // Auto-select first buoy if none selected and data exists
      setSelectedBuoy(prev => {
        if (!prev && data.length > 0) {
          return data[0]
        }
        // Update selected buoy data if it exists
        const updatedSelectedBuoy = data.find(buoy => buoy.id === prev?.id)
        return updatedSelectedBuoy || prev
      })
    } catch (error) {
      console.error('Error fetching buoy data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch buoy data')
    } finally {
      setIsLoading(false)
    }
  }, []) // Remove dependencies to prevent infinite loop

  useEffect(() => {
    fetchBuoyData()
    
    // Set up polling for real-time updates every 10 minutes (reasonable for ocean data)
    const interval = setInterval(fetchBuoyData, 10 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [fetchBuoyData])

  // Check for any tsunami alerts
  const tsunamiAlerts = buoyData
    .map(buoy => ({ buoy, ...detectTsunami(buoy) }))
    .filter(alert => alert.isTsunami)
    .sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, normal: 0 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-4">Error Loading Data</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchBuoyData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-400">
            🌊 Pacific Tsunami Detection System
          </h1>
          <div className="flex items-center space-x-4">
            {lastUpdate && (
              <span className="text-sm text-slate-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchBuoyData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm"
            >
              {isLoading ? 'Updating...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Map Section */}
        <div className="flex-1 relative">
          {isLoading && buoyData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-300">Loading NOAA buoy data...</p>
              </div>
            </div>
          ) : (
            <LeafletMap
              buoys={buoyData}
              selectedBuoy={selectedBuoy}
              onBuoySelect={setSelectedBuoy}
              tsunamiDetector={detectTsunami}
              showOnlyOceanic={true}
            />
          )}
        </div>

        {/* Side Panel */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            <CacheStatusPanel />
            <TsunamiControlPanel
              onSimulationToggle={setIsSimulationActive}
              onEventSelect={setSelectedSimulationEvent}
              isSimulationActive={isSimulationActive}
            />
          </div>
          <BuoyDataPanel
            buoys={buoyData}
            selectedBuoy={selectedBuoy}
            onBuoySelect={setSelectedBuoy}
            tsunamiDetector={detectTsunami}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-2">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm text-slate-400">
          <span>
            {buoyData.length} oceanic stations • {tsunamiAlerts.length} tsunami alerts
            {isSimulationActive && (
              <span className="ml-2 text-red-400">
                • Simulation: {selectedSimulationEvent === 'mock' ? 'Live Pacific Event' : selectedSimulationEvent.replace('_', ' ')}
              </span>
            )}
          </span>
          <span>
            Data source: NOAA NDBC {isSimulationActive ? '+ Tsunami Simulation' : '(Live Data)'}
          </span>
        </div>
      </footer>
    </div>
  )
}
