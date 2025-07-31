'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import L from 'leaflet'
import { NOAABuoyData } from '@/types/buoy'
import { tsunamiPlaybackManager, TsunamiPlaybackState } from '../utils/tsunami-playback'

// Fix Leaflet default icon issue for Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
}

interface LeafletMapProps {
  buoys: NOAABuoyData[]
  selectedBuoy: NOAABuoyData | null
  onBuoySelect: (buoy: NOAABuoyData) => void
  tsunamiDetector: (buoy: NOAABuoyData, simulationTime?: Date) => { isTsunami: boolean; severity: 'normal' | 'medium' | 'high' | 'critical' }
  showOnlyOceanic?: boolean
}

export default function LeafletMap({ buoys, selectedBuoy, onBuoySelect, tsunamiDetector, showOnlyOceanic = true }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const dangerZonesRef = useRef<L.LayerGroup | null>(null)
  const waveAnimationRef = useRef<L.LayerGroup | null>(null)
  const epicenterRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [playbackState, setPlaybackState] = useState<TsunamiPlaybackState>(tsunamiPlaybackManager.getState())

  useEffect(() => {
    setIsClient(true)
    
    // Subscribe to playback state changes
    const unsubscribe = tsunamiPlaybackManager.subscribe(setPlaybackState)
    
    return unsubscribe
  }, [])

  // Filter buoys based on oceanic criteria
  const filteredBuoys = buoys.filter(buoy => {
    if (!showOnlyOceanic) return true
    
    // Filter to oceanic buoys only - exclude Great Lakes, coastal, and inland stations
    const lat = buoy.location?.latitude || 0
    const lon = buoy.location?.longitude || 0
    
    // Exclude Great Lakes (rough boundaries)
    if (lat >= 41 && lat <= 49 && lon >= -95 && lon <= -75) {
      return false
    }
    
    // Exclude very close coastal stations (within ~50km of shore approximation)
    // Keep only deep ocean and offshore buoys
    const isDeepOcean = Math.abs(lat) > 5 || Math.abs(lon) > 10
    const isPacific = (lat >= -60 && lat <= 60 && (lon >= 100 || lon <= -120))
    const isAtlantic = (lat >= -60 && lat <= 60 && lon >= -80 && lon <= -10)
    const isIndian = (lat >= -60 && lat <= 30 && lon >= 20 && lon <= 120)
    
    return isDeepOcean && (isPacific || isAtlantic || isIndian)
  })

  const createDangerZone = useCallback((buoy: NOAABuoyData, severity: string) => {
    if (severity === 'normal') return null
    
    const colors = {
      medium: '#fef3c7',
      high: '#fed7aa', 
      critical: '#fecaca'
    }
    
    const radii = {
      medium: 50000,  // 50km radius
      high: 100000,   // 100km radius
      critical: 200000 // 200km radius
    }
    
    const color = colors[severity as keyof typeof colors]
    const radius = radii[severity as keyof typeof radii]
    
    if (!color || !radius) return null
    
    return L.circle([buoy.location.latitude, buoy.location.longitude], {
      radius,
      fillColor: color,
      fillOpacity: 0.2,
      stroke: true,
      color: color.replace('c7', '00').replace('aa', '00').replace('ca', '00'), // Darker border
      weight: 2,
      opacity: 0.6
    })
  }, [])

  // Get earthquake epicenter for current event
  const getEpicenter = useCallback(() => {
    const epicenters = {
      tohoku_2011: { lat: 38.297, lon: 142.372, magnitude: 9.1, name: 'Tōhoku' },
      alaska_2020: { lat: 55.205, lon: -158.526, magnitude: 7.8, name: 'Alaska Peninsula' },
      chile_2015: { lat: -31.573, lon: -71.674, magnitude: 8.3, name: 'Illapel' }
    }
    return epicenters[playbackState.currentEvent as keyof typeof epicenters] || epicenters.tohoku_2011
  }, [playbackState.currentEvent])

  // Create wave propagation circles
  const createWavePropagation = useCallback(() => {
    if (!mapRef.current || !waveAnimationRef.current) return

    const epicenter = getEpicenter()
    const currentTime = playbackState.currentTime // in minutes
    
    // Tsunami wave speed approximately 200 m/s in deep ocean
    const waveSpeedKmPerMin = (200 * 60) / 1000 // ~12 km/min
    const waveRadius = currentTime * waveSpeedKmPerMin * 1000 // Convert to meters for Leaflet

    // Clear existing wave circles
    waveAnimationRef.current.clearLayers()

    if (currentTime > 0 && waveRadius > 0) {
      // Main wave front
      const waveCircle = L.circle([epicenter.lat, epicenter.lon], {
        radius: waveRadius,
        fillColor: 'transparent',
        stroke: true,
        color: '#ef4444',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 5'
      })

      // Secondary wave (slower, smaller)
      const secondaryWave = L.circle([epicenter.lat, epicenter.lon], {
        radius: waveRadius * 0.7,
        fillColor: 'transparent',
        stroke: true,
        color: '#f97316',
        weight: 2,
        opacity: 0.5,
        dashArray: '3, 3'
      })

      waveAnimationRef.current.addLayer(waveCircle)
      waveAnimationRef.current.addLayer(secondaryWave)
    }
  }, [playbackState.currentTime, getEpicenter])

  // Create epicenter marker
  const createEpicenterMarker = useCallback(() => {
    if (!mapRef.current) return

    const epicenter = getEpicenter()
    
    // Remove existing epicenter
    if (epicenterRef.current) {
      mapRef.current.removeLayer(epicenterRef.current)
    }

    // Create epicenter icon
    const epicenterIcon = L.divIcon({
      html: `
        <div style="
          width: 24px; 
          height: 24px; 
          background: radial-gradient(circle, #dc2626 30%, #fca5a5 70%);
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.8);
          animation: pulse 2s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `,
      className: 'epicenter-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })

    epicenterRef.current = L.marker([epicenter.lat, epicenter.lon], { 
      icon: epicenterIcon,
      zIndexOffset: 1000 
    })
    .bindPopup(`
      <div class="p-3 min-w-[200px]">
        <h3 class="font-bold text-lg text-red-600 mb-2">🔴 Earthquake Epicenter</h3>
        <div class="space-y-1 text-sm">
          <div><span class="font-medium">Event:</span> ${epicenter.name}</div>
          <div><span class="font-medium">Magnitude:</span> M${epicenter.magnitude}</div>
          <div><span class="font-medium">Location:</span> ${epicenter.lat.toFixed(3)}°, ${epicenter.lon.toFixed(3)}°</div>
          <div><span class="font-medium">Time:</span> +${playbackState.currentTime.toFixed(1)} minutes</div>
        </div>
      </div>
    `)
    .addTo(mapRef.current)
  }, [getEpicenter, playbackState.currentTime])

  const createBuoyIcon = useCallback((severity: string, isSelected: boolean = false) => {
    const colors = {
      normal: '#22c55e',
      medium: '#eab308', 
      high: '#f59e0b',
      critical: '#dc2626'
    }
    
    const color = colors[severity as keyof typeof colors] || colors.normal
    const size = isSelected ? 20 : 16
    
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-buoy-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    })
  }, [])

  const formatDate = useCallback((timestamp: string | Date) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !isClient) return

    try {
      // Create map
      const map = L.map(containerRef.current, {
        center: [20.0, -140.0], // Center on Pacific Ocean instead of Bermuda
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        worldCopyJump: false, // Prevent map from jumping to other world copies
        maxBounds: [[-85, -180], [85, 180]], // Limit map bounds to prevent infinite scrolling
        maxBoundsViscosity: 1.0 // Make bounds rigid
      })

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        noWrap: true // Prevent tile wrapping to show only one globe
      }).addTo(map)

      // Create layer groups in order (bottom to top)
      const waveAnimationGroup = L.layerGroup().addTo(map)
      const dangerZonesGroup = L.layerGroup().addTo(map)
      const markersGroup = L.layerGroup().addTo(map)

      mapRef.current = map
      waveAnimationRef.current = waveAnimationGroup
      dangerZonesRef.current = dangerZonesGroup
      markersRef.current = markersGroup

      // Create initial epicenter
      createEpicenterMarker()
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = null
        dangerZonesRef.current = null
        waveAnimationRef.current = null
        epicenterRef.current = null
      }
    }
  }, [isClient, createEpicenterMarker])

  // Update wave propagation when playback state changes
  useEffect(() => {
    if (!isClient) return
    createWavePropagation()
    createEpicenterMarker()
  }, [playbackState.currentTime, playbackState.currentEvent, isClient, createWavePropagation, createEpicenterMarker])

  // Update markers when buoys change or simulation time changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !dangerZonesRef.current || !isClient) return

    try {
      // Clear existing markers and danger zones
      markersRef.current.clearLayers()
      dangerZonesRef.current.clearLayers()

      // Get current simulation timestamp
      const simulationTime = tsunamiPlaybackManager.getCurrentTimestamp()

      // Add new markers and danger zones
      filteredBuoys.forEach((buoy) => {
        if (!buoy.location?.latitude || !buoy.location?.longitude) return

        const tsunamiStatus = tsunamiDetector(buoy, simulationTime)
        const isSelected = selectedBuoy?.id === buoy.id
        
        // Calculate wave arrival time for this buoy
        const epicenter = getEpicenter()
        const arrivalTime = tsunamiPlaybackManager.calculateWaveArrival(
          buoy.location.latitude, 
          buoy.location.longitude,
          epicenter.lat,
          epicenter.lon
        )
        
        const hasWaveArrived = playbackState.currentTime >= arrivalTime
        const timeToArrival = arrivalTime - playbackState.currentTime

        // Add danger zone first (so it appears under markers)
        const dangerZone = createDangerZone(buoy, tsunamiStatus.severity)
        if (dangerZone && hasWaveArrived) {
          dangerZonesRef.current?.addLayer(dangerZone)
        }
        
        // Add marker with enhanced simulation info
        const icon = createBuoyIcon(hasWaveArrived ? tsunamiStatus.severity : 'normal', isSelected)
        const latestReading = buoy.readings.length > 0 ? buoy.readings[buoy.readings.length - 1] : null
        const waveHeight = latestReading?.waveHeight || 0
        
        const marker = L.marker([buoy.location.latitude, buoy.location.longitude], { icon })
          .bindPopup(`
            <div class="p-2 min-w-[200px]">
              <h3 class="font-bold text-lg mb-2">${buoy.name}</h3>
              <div class="space-y-1 text-sm">
                <div><span class="font-medium">Station:</span> ${buoy.id}</div>
                <div><span class="font-medium">Location:</span> ${buoy.location.latitude.toFixed(2)}°, ${buoy.location.longitude.toFixed(2)}°</div>
                <div><span class="font-medium">Owner:</span> ${buoy.owner}</div>
                <div><span class="font-medium">Status:</span> ${buoy.status}</div>
                ${latestReading ? `
                  <div><span class="font-medium">Wave Height:</span> ${waveHeight.toFixed(1)}m</div>
                  <div><span class="font-medium">Water Temp:</span> ${latestReading.waterTemperature?.toFixed(1) || 'N/A'}°C</div>
                  <div><span class="font-medium">Wind Speed:</span> ${latestReading.windSpeed?.toFixed(1) || 'N/A'} m/s</div>
                  <div><span class="font-medium">Pressure:</span> ${latestReading.atmosphericPressure?.toFixed(1) || 'N/A'} hPa</div>
                  <div><span class="font-medium">Last Update:</span> ${formatDate(latestReading.timestamp)}</div>
                ` : '<div>No recent data</div>'}
                <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
                  <div class="font-medium">🌊 Tsunami Simulation</div>
                  <div><span class="font-medium">Wave Arrival:</span> +${arrivalTime.toFixed(1)} min</div>
                  ${hasWaveArrived ? 
                    '<div class="text-green-600">✅ Wave has arrived</div>' : 
                    `<div class="text-orange-600">⏰ ETA: ${timeToArrival.toFixed(1)} min</div>`
                  }
                  <div><span class="font-medium">Distance:</span> ${(arrivalTime * 12).toFixed(0)} km</div>
                </div>
                ${tsunamiStatus.isTsunami && hasWaveArrived ? `
                  <div class="mt-2 p-2 ${
                    tsunamiStatus.severity === 'critical' ? 'bg-red-100 border border-red-300 text-red-800' :
                    tsunamiStatus.severity === 'high' ? 'bg-orange-100 border border-orange-300 text-orange-800' :
                    'bg-yellow-100 border border-yellow-300 text-yellow-800'
                  } rounded font-medium">
                    ⚠️ TSUNAMI ALERT: ${tsunamiStatus.severity.toUpperCase()}
                    ${dangerZone ? `<br>🔴 Danger Zone: ${tsunamiStatus.severity === 'critical' ? '200km' : tsunamiStatus.severity === 'high' ? '100km' : '50km'} radius` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          `)

        marker.on('click', () => onBuoySelect(buoy))
        markersRef.current?.addLayer(marker)
      })
    } catch (error) {
      console.error('Error updating markers:', error)
    }
  }, [filteredBuoys, createBuoyIcon, createDangerZone, formatDate, onBuoySelect, tsunamiDetector, selectedBuoy, isClient, playbackState.currentTime, playbackState.currentEvent, getEpicenter])

  // Handle selected buoy centering - prevent auto-centering that moves map back to Bermuda
  useEffect(() => {
    if (selectedBuoy && mapRef.current && isClient) {
      try {
        // Only center if this is a user-initiated selection, not automatic
        // Remove automatic centering to prevent map jumping back to Bermuda
      } catch (error) {
        console.error('Error centering map on selected buoy:', error)
      }
    }
  }, [selectedBuoy, isClient])

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-300">Loading interactive map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg overflow-hidden border border-gray-700"
        style={{ minHeight: '400px' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg z-10 max-w-xs">
        <h4 className="font-semibold text-sm mb-2 text-gray-800">Station Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
            <span className="text-gray-700">Normal / Pre-wave</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow"></div>
            <span className="text-gray-700">Medium Alert (50km zone)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow"></div>
            <span className="text-gray-700">High Alert (100km zone)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
            <span className="text-gray-700">Critical Alert (200km zone)</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-200 border border-red-400 opacity-60"></div>
            <span>Tsunami danger zones</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse"></div>
            <span>Earthquake epicenter</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-1 bg-red-500 border border-red-600" style={{borderStyle: 'dashed'}}></div>
            <span>Tsunami wave front</span>
          </div>
          <div className="mt-1 text-gray-500">
            Showing oceanic buoys only
          </div>
          {playbackState.isPlaying && (
            <div className="mt-1 text-blue-600 font-medium">
              🌊 Simulation Active
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
