'use client'

import { NOAABuoyData } from '@/types/buoy'

interface BuoyDataPanelProps {
  buoys: NOAABuoyData[]
  selectedBuoy: NOAABuoyData | null
  onBuoySelect: (buoy: NOAABuoyData) => void
  tsunamiDetector: (buoy: NOAABuoyData) => { isTsunami: boolean; severity: 'normal' | 'medium' | 'high' | 'critical' }
  isLoading: boolean
}

export default function BuoyDataPanel({ buoys, selectedBuoy, onBuoySelect, tsunamiDetector, isLoading }: BuoyDataPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-gradient-to-b from-slate-900 to-black p-6 border-t-4 border-red-600">
        <div className="animate-pulse">
          <div className="h-8 bg-red-900 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 bg-slate-800 rounded border border-red-800"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString()
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400'
      case 'inactive': return 'text-red-400'
      case 'maintenance': return 'text-yellow-400'
      default: return 'text-slate-400'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/40 border-red-500'
      case 'high': return 'text-orange-400 bg-orange-900/40 border-orange-500'
      case 'medium': return 'text-yellow-400 bg-yellow-900/40 border-yellow-500'
      default: return 'text-green-400 bg-green-900/40 border-green-500'
    }
  }

  return (
    <div className="bg-gradient-to-b from-slate-900 to-black text-white overflow-hidden h-full border-t-4 border-red-600">
      <div className="bg-gradient-to-r from-red-900 to-red-800 p-4 border-b-2 border-red-500">
        <h2 className="text-xl font-black text-white flex items-center">
          📊 STATION MONITORING
        </h2>
        <p className="text-red-200 text-sm">Real-time Ocean Sensor Data</p>
      </div>
      
      <div className="p-4">
        {selectedBuoy ? (
          <div className="bg-black bg-opacity-60 rounded-lg p-4 border-2 border-red-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{selectedBuoy.name}</h3>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedBuoy.status)}`}>
                  {selectedBuoy.status}
                </span>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(tsunamiDetector(selectedBuoy).severity)}`}>
                    {tsunamiDetector(selectedBuoy).severity.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-slate-400">Station ID:</span>
                <div className="text-white">{selectedBuoy.id}</div>
              </div>
              
              <div>
                <span className="font-medium text-slate-400">Owner:</span>
                <div className="text-white">{selectedBuoy.owner}</div>
              </div>
              
              <div>
                <span className="font-medium text-slate-400">Type:</span>
                <div className="text-white">{selectedBuoy.type}</div>
              </div>
              
              <div>
                <span className="font-medium text-slate-400">Location:</span>
                <div className="text-white">
                  {selectedBuoy.location.latitude.toFixed(4)}°N, {Math.abs(selectedBuoy.location.longitude).toFixed(4)}°W
                </div>
              </div>
              
              <div>
                <span className="font-medium text-slate-400">Last Update:</span>
                <div className="text-white">
                  {formatDate(selectedBuoy.lastUpdate)} {formatTime(selectedBuoy.lastUpdate)}
                </div>
              </div>
            </div>

            {selectedBuoy.readings.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-slate-300 mb-3">Latest Reading</h4>
                <div className="bg-slate-700 rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wave Height:</span>
                    <span className="font-medium text-white">
                      {(selectedBuoy.readings[selectedBuoy.readings.length - 1].waveHeight || 0).toFixed(2)} m
                    </span>
                  </div>
                  {selectedBuoy.readings[selectedBuoy.readings.length - 1].dominantWavePeriod && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wave Period:</span>
                      <span className="font-medium text-white">
                        {selectedBuoy.readings[selectedBuoy.readings.length - 1].dominantWavePeriod!.toFixed(1)} s
                      </span>
                    </div>
                  )}
                  {selectedBuoy.readings[selectedBuoy.readings.length - 1].meanWaveDirection && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wave Direction:</span>
                      <span className="font-medium text-white">
                        {selectedBuoy.readings[selectedBuoy.readings.length - 1].meanWaveDirection}
                      </span>
                    </div>
                  )}
                  {selectedBuoy.readings[selectedBuoy.readings.length - 1].atmosphericPressure && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pressure:</span>
                      <span className="font-medium text-white">
                        {selectedBuoy.readings[selectedBuoy.readings.length - 1].atmosphericPressure!.toFixed(1)} hPa
                      </span>
                    </div>
                  )}
                  {selectedBuoy.readings[selectedBuoy.readings.length - 1].waterTemperature && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Water Temp:</span>
                      <span className="font-medium text-white">
                        {selectedBuoy.readings[selectedBuoy.readings.length - 1].waterTemperature!.toFixed(1)} °C
                      </span>
                    </div>
                  )}
                  {selectedBuoy.readings[selectedBuoy.readings.length - 1].windSpeed && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wind Speed:</span>
                      <span className="font-medium text-white">
                        {selectedBuoy.readings[selectedBuoy.readings.length - 1].windSpeed!.toFixed(1)} m/s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {selectedBuoy.readings.length > 1 && (
              <div className="mt-6">
                <h4 className="font-semibold text-slate-300 mb-3">Recent Wave Heights</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedBuoy.readings.slice(-10).reverse().map((reading, index) => {
                    const waveHeight = reading.waveHeight || reading.waterColumnHeight || 0
                    return (
                      <div key={index} className="bg-slate-700 rounded p-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-300">
                            {formatTime(reading.timestamp)}
                          </span>
                          <span className="text-blue-400 font-medium">
                            {waveHeight.toFixed(2)} m
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">
            Select a station on the map to view detailed data
          </p>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-300 mb-4">All Stations</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {buoys.map(buoy => {
            const tsunamiStatus = tsunamiDetector(buoy)
            const latestWaveHeight = buoy.readings.length > 0 
              ? (buoy.readings[buoy.readings.length - 1].waveHeight || buoy.readings[buoy.readings.length - 1].waterColumnHeight || 0)
              : 0
              
            return (
              <div
                key={buoy.id}
                className={`p-3 rounded cursor-pointer transition-colors border ${
                  selectedBuoy?.id === buoy.id 
                    ? 'bg-blue-900/20 border-blue-500' 
                    : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                }`}
                onClick={() => onBuoySelect(buoy)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{buoy.name}</div>
                    <div className="text-xs text-slate-400">
                      {buoy.id} • {Math.abs(buoy.location.longitude).toFixed(1)}°W
                    </div>
                  </div>
                  <div className="text-right">
                    {tsunamiStatus.isTsunami && (
                      <div className={`text-xs px-2 py-1 rounded mb-1 ${getSeverityColor(tsunamiStatus.severity)}`}>
                        {tsunamiStatus.severity.toUpperCase()}
                      </div>
                    )}
                    <div className={`text-xs font-medium ${getStatusColor(buoy.status)}`}>
                      {buoy.status}
                    </div>
                    {buoy.readings.length > 0 && (
                      <div className="text-xs text-slate-300">
                        {latestWaveHeight.toFixed(1)} m
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
