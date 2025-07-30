'use client'

import dynamic from 'next/dynamic'
import { NOAABuoyData } from '@/types/buoy'
import { useMemo } from 'react'

interface MapProps {
  buoys: NOAABuoyData[]
  selectedBuoy: NOAABuoyData | null
  onBuoySelect: (buoy: NOAABuoyData) => void
  tsunamiDetector: (buoy: NOAABuoyData) => { isTsunami: boolean; severity: 'normal' | 'medium' | 'high' | 'critical' }
}

export default function Map(props: MapProps) {
  // Dynamically import the Leaflet map to avoid SSR issues and memoize it
  const LeafletMap = useMemo(() => 
    dynamic(() => import('./LeafletMap'), {
      ssr: false,
      loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-800">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-300">Loading interactive map...</p>
          </div>
        </div>
      )
    }), []
  )
  
  return <LeafletMap {...props} />
}
