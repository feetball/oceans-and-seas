'use client'

import { useState } from 'react'

interface TsunamiControlPanelProps {
  onSimulationToggle: (enabled: boolean) => void
  onEventSelect: (eventId: string) => void
  isSimulationActive: boolean
}

export default function TsunamiControlPanel({ 
  onSimulationToggle, 
  onEventSelect, 
  isSimulationActive 
}: TsunamiControlPanelProps) {
  const [selectedEvent, setSelectedEvent] = useState('mock')

  const simulationEvents = [
    { id: 'mock', name: 'Live Simulation - Pacific Event', description: 'Magnitude 8.2 near Japan' },
    { id: 'tohoku_2011', name: '2011 Tōhoku Earthquake', description: 'Magnitude 9.1, Historic Event' },
    { id: 'alaska_2020', name: '2020 Alaska Peninsula', description: 'Magnitude 7.8' },
    { id: 'chile_2015', name: '2015 Illapel Earthquake', description: 'Magnitude 8.3' }
  ]

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId)
    onEventSelect(eventId)
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🌊 Tsunami Simulation Control
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">
            {isSimulationActive ? 'Simulation Active' : 'Live Data'}
          </span>
          <button
            onClick={() => onSimulationToggle(!isSimulationActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isSimulationActive ? 'bg-red-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSimulationActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {isSimulationActive && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Tsunami Event:
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => handleEventChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            >
              {simulationEvents.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} - {event.description}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-700 rounded p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-medium">Simulation Active</span>
            </div>
            <p className="text-slate-300 text-xs">
              Displaying {selectedEvent === 'mock' ? 'live' : 'historical'} tsunami wave data. 
              Affected buoys will show elevated readings and danger zones.
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Medium (50km zone)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>High (100km zone)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Critical (200km zone)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
