'use client'

import dynamic from 'next/dynamic'
import { NOAABuoyData } from '@/types/buoy'

interface MapProps {
  buoys: NOAABuoyData[]
  selectedBuoy: NOAABuoyData | null
  onBuoySelect: (buoy: NOAABuoyData) => void
  tsunamiDetector: (buoy: NOAABuoyData) => { isTsunami: boolean; severity: 'normal' | 'medium' | 'high' | 'critical' }
}

// Dynamically import the Leaflet map to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-800">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-300">Loading interactive map...</p>
      </div>
    </div>
  )
})

export default function Map(props: MapProps) {
  return <LeafletMap {...props} />
}
