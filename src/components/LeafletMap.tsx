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
}

export default function LeafletMap({ buoys, selectedBuoy, onBuoySelect, tsunamiDetector }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
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

      mapRef.current = map
      markersRef.current = markersGroup
    } catch (error) {
      console.error('Error initializing map:', error)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = null
      }
    }
  }, [isClient])

  // Update markers when buoys change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !isClient) return

    try {
      // Clear existing markers
      markersRef.current.clearLayers()

      // Add new markers
      buoys.forEach((buoy) => {
        if (!buoy.location?.latitude || !buoy.location?.longitude) return

        const tsunamiStatus = tsunamiDetector(buoy)
        const isSelected = selectedBuoy?.id === buoy.id
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
  }, [buoys, createBuoyIcon, formatDate, onBuoySelect, tsunamiDetector, selectedBuoy, isClient])

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
            <span className="text-gray-700">Medium Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow"></div>
            <span className="text-gray-700">High Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
            <span className="text-gray-700">Critical Alert</span>
          </div>
        </div>
      </div>
    </div>
  )
}
