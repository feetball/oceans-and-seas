'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import L from 'leaflet'
import { NOAABuoyData } from '@/types/buoy'

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
  tsunamiDetector: (buoy: NOAABuoyData) => { isTsunami: boolean; severity: 'normal' | 'medium' | 'high' | 'critical' }
  showOnlyOceanic?: boolean
}

export default function LeafletMapNew({ buoys, selectedBuoy, onBuoySelect, tsunamiDetector, showOnlyOceanic = true }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const dangerZonesRef = useRef<L.LayerGroup | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
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
        center: [35.0, -75.0],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true
      })

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(map)

      // Create markers layer group
      const markersGroup = L.layerGroup().addTo(map)
      const dangerZonesGroup = L.layerGroup().addTo(map)

      mapRef.current = map
      markersRef.current = markersGroup
      dangerZonesRef.current = dangerZonesGroup
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = null
        dangerZonesRef.current = null
      }
    }
  }, [isClient])

  // Update markers when buoys change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !dangerZonesRef.current || !isClient) return

    try {
      // Clear existing markers and danger zones
      markersRef.current.clearLayers()
      dangerZonesRef.current.clearLayers()

      // Add new markers and danger zones
      filteredBuoys.forEach((buoy) => {
        if (!buoy.location?.latitude || !buoy.location?.longitude) return

        const tsunamiStatus = tsunamiDetector(buoy)
        const isSelected = selectedBuoy?.id === buoy.id
        
        // Add danger zone first (so it appears under markers)
        const dangerZone = createDangerZone(buoy, tsunamiStatus.severity)
        if (dangerZone) {
          dangerZonesRef.current?.addLayer(dangerZone)
        }
        
        // Add marker
        const icon = createBuoyIcon(tsunamiStatus.severity, isSelected)
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
                ${tsunamiStatus.isTsunami ? `
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
  }, [filteredBuoys, createBuoyIcon, createDangerZone, formatDate, onBuoySelect, tsunamiDetector, selectedBuoy, isClient])

  // Handle selected buoy centering
  useEffect(() => {
    if (selectedBuoy && mapRef.current && isClient) {
      try {
        mapRef.current.setView([selectedBuoy.location.latitude, selectedBuoy.location.longitude], 8)
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
            <span className="text-gray-700">Normal</span>
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
          <div className="mt-1 text-gray-500">
            Showing oceanic buoys only
          </div>
        </div>
      </div>
    </div>
  )
}
