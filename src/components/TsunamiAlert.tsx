'use client'

import { NOAABuoyData } from '@/types/buoy'

interface TsunamiAlertProps {
  alerts: Array<{
    buoy: NOAABuoyData
    isTsunami: boolean
    severity: 'normal' | 'medium' | 'high' | 'critical'
  }>
}

export default function TsunamiAlert({ alerts }: TsunamiAlertProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/20 border-red-500 text-red-400'
      case 'high': return 'bg-amber-900/20 border-amber-500 text-amber-400'
      case 'medium': return 'bg-yellow-900/20 border-yellow-500 text-yellow-400'
      default: return 'bg-blue-900/20 border-blue-500 text-blue-400'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '🔶'
      default: return 'ℹ️'
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return 'CRITICAL TSUNAMI WARNING'
      case 'high': return 'HIGH TSUNAMI ALERT'
      case 'medium': return 'MODERATE TSUNAMI ADVISORY'
      default: return 'TSUNAMI WATCH'
    }
  }

  const getCurrentWaveHeight = (buoy: NOAABuoyData) => {
    if (buoy.readings.length === 0) return 0
    const latest = buoy.readings[buoy.readings.length - 1]
    return latest.waveHeight || latest.waterColumnHeight || 0
  }

  const getHeightChange = (buoy: NOAABuoyData) => {
    if (buoy.readings.length < 2) return 0
    const latest = buoy.readings[buoy.readings.length - 1]
    const previous = buoy.readings[buoy.readings.length - 2]
    
    const currentHeight = latest.waveHeight || latest.waterColumnHeight || 0
    const previousHeight = previous.waveHeight || previous.waterColumnHeight || 0
    
    return currentHeight - previousHeight
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const waveHeight = getCurrentWaveHeight(alert.buoy)
        const heightChange = getHeightChange(alert.buoy)
        
        return (
          <div key={`${alert.buoy.id}-${index}`} className={`border-l-4 p-4 rounded-lg ${getSeverityColor(alert.severity)}`}>
            <div className="flex items-start">
              <div className="text-2xl mr-3">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">
                    {getSeverityText(alert.severity)}
                  </h3>
                  <span className="text-sm font-medium">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-medium">Station: {alert.buoy.name} ({alert.buoy.id})</p>
                  <p className="text-sm">
                    Location: {alert.buoy.location.latitude.toFixed(4)}°N, {Math.abs(alert.buoy.location.longitude).toFixed(4)}°W
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Current wave height: <span className="font-medium">{waveHeight.toFixed(2)} m</span></p>
                    {heightChange > 0 && (
                      <p>Height increase: <span className="font-medium text-red-400">+{heightChange.toFixed(2)} m</span></p>
                    )}
                    <p className="italic">
                      {alert.severity === 'critical' 
                        ? 'IMMEDIATE EVACUATION RECOMMENDED for coastal areas'
                        : alert.severity === 'high'
                        ? 'Stay alert and avoid coastal areas'
                        : 'Monitor conditions and be prepared to take action'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
