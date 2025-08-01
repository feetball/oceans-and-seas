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
  if (alerts.length === 0) return null

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const highAlerts = alerts.filter(a => a.severity === 'high')
  const mediumAlerts = alerts.filter(a => a.severity === 'medium')

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-red-600 to-red-800 border-red-400'
      case 'high': return 'from-orange-600 to-orange-800 border-orange-400'
      case 'medium': return 'from-yellow-600 to-yellow-800 border-yellow-400'
      default: return 'from-gray-600 to-gray-800 border-gray-400'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '�'
      case 'high': return '🟠' 
      case 'medium': return '�'
      default: return '🟢'
    }
  }

  const formatTime = () => {
    return new Date().toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  const getCurrentWaveHeight = (buoy: NOAABuoyData) => {
    if (buoy.readings.length === 0) return 0
    const latest = buoy.readings[buoy.readings.length - 1]
    return latest.waveHeight || latest.waterColumnHeight || 0
  }

  return (
    <div className="p-6 space-y-4">
      {/* Main Alert Header */}
      <div className="text-center border-b-2 border-red-400 pb-4">
        <div className="flex items-center justify-center space-x-4 mb-2">
          <span className="text-6xl animate-pulse">🚨</span>
          <div>
            <h1 className="text-4xl font-black text-white tracking-wider">
              TSUNAMI WARNING
            </h1>
            <p className="text-red-200 text-lg font-bold">
              IMMEDIATE THREAT TO COASTAL AREAS
            </p>
          </div>
          <span className="text-6xl animate-pulse">🚨</span>
        </div>
        <div className="bg-black bg-opacity-50 rounded-lg p-3 border border-red-400">
          <p className="text-red-300 text-sm font-mono">
            ISSUED: {formatTime()}
          </p>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {criticalAlerts.length > 0 && (
          <div className={`bg-gradient-to-r ${getSeverityColor('critical')} rounded-lg p-4 border-2 animate-pulse`}>
            <div className="text-center">
              <div className="text-3xl mb-2">🔴</div>
              <div className="text-2xl font-black text-white">{criticalAlerts.length}</div>
              <div className="text-red-200 font-bold text-sm">CRITICAL ALERTS</div>
              <div className="text-red-300 text-xs mt-1">IMMEDIATE EVACUATION</div>
            </div>
          </div>
        )}

        {highAlerts.length > 0 && (
          <div className={`bg-gradient-to-r ${getSeverityColor('high')} rounded-lg p-4 border-2`}>
            <div className="text-center">
              <div className="text-3xl mb-2">🟠</div>
              <div className="text-2xl font-black text-white">{highAlerts.length}</div>
              <div className="text-orange-200 font-bold text-sm">HIGH ALERTS</div>
              <div className="text-orange-300 text-xs mt-1">PREPARE TO EVACUATE</div>
            </div>
          </div>
        )}

        {mediumAlerts.length > 0 && (
          <div className={`bg-gradient-to-r ${getSeverityColor('medium')} rounded-lg p-4 border-2`}>
            <div className="text-center">
              <div className="text-3xl mb-2">🟡</div>
              <div className="text-2xl font-black text-white">{mediumAlerts.length}</div>
              <div className="text-yellow-200 font-bold text-sm">MEDIUM ALERTS</div>
              <div className="text-yellow-300 text-xs mt-1">STAY ALERT</div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Alert List */}
      <div className="space-y-3 max-h-40 overflow-y-auto">
        {alerts.slice(0, 5).map((alert, index) => {
          const waveHeight = getCurrentWaveHeight(alert.buoy)
          
          return (
            <div 
              key={alert.buoy.id}
              className={`bg-gradient-to-r ${getSeverityColor(alert.severity)} rounded-lg p-3 border-2 ${alert.severity === 'critical' ? 'animate-pulse' : ''}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getSeverityIcon(alert.severity)}</span>
                  <div>
                    <div className="font-bold text-white text-lg">
                      {alert.buoy.name}
                    </div>
                    <div className="text-sm opacity-90">
                      Station {alert.buoy.id} • Wave: {waveHeight.toFixed(1)}m
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-white text-xl">
                    {alert.severity.toUpperCase()}
                  </div>
                  <div className="text-xs opacity-90">
                    {alert.buoy.location?.latitude.toFixed(2)}°, {alert.buoy.location?.longitude.toFixed(2)}°
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {alerts.length > 5 && (
        <div className="text-center">
          <p className="text-red-300 text-sm font-bold">
            + {alerts.length - 5} additional alerts (check stations panel)
          </p>
        </div>
      )}

      {/* Emergency Instructions */}
      <div className="bg-black bg-opacity-60 rounded-lg p-4 border-2 border-red-500">
        <h3 className="text-red-400 font-black text-lg mb-3 text-center">
          ⚠️ EMERGENCY INSTRUCTIONS ⚠️
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="text-red-300 font-bold mb-2">🏃 IMMEDIATE ACTIONS:</h4>
            <ul className="space-y-1 text-red-200">
              <li>• Move to higher ground immediately</li>
              <li>• Stay away from beaches and harbors</li>
              <li>• Listen to emergency broadcasts</li>
              <li>• Do not return until all-clear</li>
            </ul>
          </div>
          <div>
            <h4 className="text-red-300 font-bold mb-2">📞 EMERGENCY CONTACTS:</h4>
            <ul className="space-y-1 text-red-200">
              <li>• Emergency Services: 911</li>
              <li>• Tsunami Warning Center</li>
              <li>• Local Emergency Management</li>
              <li>• Coast Guard: VHF Ch 16</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
