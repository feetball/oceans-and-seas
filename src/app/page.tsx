'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import BuoyDataPanel from '@/components/BuoyDataPanel'
import TsunamiAlert from '@/components/TsunamiAlert'
import TsunamiControlPanel from '@/components/TsunamiControlPanel'
import TsunamiPlaybackControls from '@/components/TsunamiPlaybackControls'
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

  // Enhanced tsunami detection logic with simulation support
  const detectTsunami = useCallback((buoy: NOAABuoyData, simulationTime?: Date) => {
    if (buoy.readings.length < 2) return { isTsunami: false, severity: 'normal' as const }
    
    const latestReading = buoy.readings[buoy.readings.length - 1]
    const previousReading = buoy.readings[buoy.readings.length - 2]
    
    // Use wave height as primary indicator
    const currentHeight = latestReading.waveHeight || latestReading.waterColumnHeight || 0
    const previousHeight = previousReading.waveHeight || previousReading.waterColumnHeight || 0
    
    const heightChange = currentHeight - previousHeight
    const heightChangePercent = (heightChange / (previousHeight || 1)) * 100
    
    // In simulation mode, generate realistic tsunami data based on simulation time
    if (simulationTime) {
      // Generate tsunami effects based on distance from epicenter and time
      const lat = buoy.location?.latitude || 0
      const lon = buoy.location?.longitude || 0
      
      // Simplified tsunami simulation based on distance and time
      // This would normally use complex wave propagation models
      const distanceToEvent = Math.sqrt(Math.pow(lat - 38.3, 2) + Math.pow(lon - 142.4, 2)) // Distance from Tōhoku epicenter
      const waveArrivalTime = distanceToEvent * 0.5 // Simplified timing in hours
      const currentSimHours = (Date.now() - simulationTime.getTime()) / (1000 * 60 * 60)
      
      if (currentSimHours >= waveArrivalTime) {
        // Wave has arrived - simulate magnitude based on distance
        const intensity = Math.max(0, 8 - distanceToEvent * 0.1) // Decrease with distance
        if (intensity > 6) return { isTsunami: true, severity: 'critical' as const }
        if (intensity > 4) return { isTsunami: true, severity: 'high' as const }
        if (intensity > 2) return { isTsunami: true, severity: 'medium' as const }
      }
    }
    
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
      {/* Emergency Header */}
      <header className="bg-gradient-to-r from-red-900 to-red-700 border-b-2 border-red-500 shadow-2xl">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-2xl">🚨</span>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-wide">
                  TSUNAMI WARNING SYSTEM
                </h1>
                <p className="text-red-200 text-sm font-medium">
                  Pacific Ocean Early Detection Network
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {tsunamiAlerts.length > 0 && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold animate-pulse border-2 border-red-300">
                  🔴 {tsunamiAlerts.length} ACTIVE ALERT{tsunamiAlerts.length > 1 ? 'S' : ''}
                </div>
              )}
              {lastUpdate && (
                <div className="text-right">
                  <div className="text-red-200 text-xs">LAST UPDATE</div>
                  <div className="text-white font-mono text-sm">
                    {lastUpdate.toLocaleTimeString()}
                  </div>
                </div>
              )}
              <button
                onClick={fetchBuoyData}
                disabled={isLoading}
                className="bg-white text-red-900 hover:bg-red-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold px-6 py-3 rounded-lg text-sm border-2 border-white shadow-lg transition-all"
              >
                {isLoading ? '🔄 UPDATING...' : '🔄 REFRESH DATA'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Critical Alerts Banner */}
      {tsunamiAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 border-b-4 border-red-400">
          <div className="max-w-7xl mx-auto">
            <TsunamiAlert alerts={tsunamiAlerts} />
          </div>
        </div>
      )}

      {/* Main Interface */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Map Section with Dark Theme */}
        <div className="flex-1 relative bg-slate-900 border-r-4 border-red-600">
          {isLoading && buoyData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-red-300 text-xl font-bold">INITIALIZING DETECTION NETWORK...</p>
                <p className="text-slate-400 text-sm mt-2">Connecting to NOAA Ocean Buoys</p>
              </div>
            </div>
          ) : (
            <div className="relative h-full">
              <LeafletMap
                buoys={buoyData}
                selectedBuoy={selectedBuoy}
                onBuoySelect={setSelectedBuoy}
                tsunamiDetector={detectTsunami}
                showOnlyOceanic={true}
              />
              {/* Map Overlay Info */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-80 rounded-lg p-4 border border-red-500">
                <h3 className="text-red-400 font-bold text-lg mb-2">🌊 DETECTION STATUS</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Active Stations:</span>
                    <span className="text-white font-mono">{buoyData.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Alert Level:</span>
                    <span className={`font-bold ${
                      tsunamiAlerts.some(a => a.severity === 'critical') ? 'text-red-500' :
                      tsunamiAlerts.some(a => a.severity === 'high') ? 'text-orange-500' :
                      tsunamiAlerts.some(a => a.severity === 'medium') ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {tsunamiAlerts.some(a => a.severity === 'critical') ? '🔴 CRITICAL' :
                       tsunamiAlerts.some(a => a.severity === 'high') ? '🟠 HIGH' :
                       tsunamiAlerts.some(a => a.severity === 'medium') ? '🟡 MEDIUM' :
                       '🟢 NORMAL'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Network Status:</span>
                    <span className="text-green-400 font-bold">🟢 ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Control Panel */}
        <div className="w-96 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Emergency Controls */}
            <div className="bg-gradient-to-r from-red-900 to-red-800 rounded-lg p-4 border border-red-500">
              <h3 className="text-red-300 font-bold text-lg mb-3 flex items-center">
                🚨 EMERGENCY CONTROLS
              </h3>
              <div className="space-y-3">
                <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg border-2 border-red-400 transition-all">
                  📢 BROADCAST ALERT
                </button>
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg border-2 border-orange-400 transition-all">
                  📞 NOTIFY AUTHORITIES
                </button>
                <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg border-2 border-yellow-400 transition-all">
                  📋 GENERATE REPORT
                </button>
              </div>
            </div>

            <CacheStatusPanel />
            <TsunamiPlaybackControls />
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

      {/* Emergency Status Bar */}
      <footer className="bg-gradient-to-r from-slate-900 to-slate-800 border-t-4 border-red-600 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6 text-sm">
            <span className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">SYSTEM OPERATIONAL</span>
            </span>
            <span className="text-slate-400">
              {buoyData.length} stations • {tsunamiAlerts.length} alerts
            </span>
            {isSimulationActive && (
              <span className="text-red-400 font-bold animate-pulse">
                🔴 SIMULATION MODE: {selectedSimulationEvent === 'mock' ? 'LIVE EVENT' : selectedSimulationEvent.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <span>DATA: NOAA NDBC {isSimulationActive ? '+ SIMULATION' : '(LIVE)'}</span>
            <span>•</span>
            <span>LAST SYNC: {lastUpdate?.toLocaleTimeString() || 'N/A'}</span>
            <span>•</span>
            <span className="text-green-400">SECURE CONNECTION</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
