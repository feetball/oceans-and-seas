export interface BuoyLocation {
  latitude: number
  longitude: number
}

export interface NOAABuoyReading {
  timestamp: Date
  waterColumnHeight?: number // derived from wave height for tsunami detection
  waveHeight: number // WVHT - significant wave height
  dominantWavePeriod?: number // DPD
  averageWavePeriod?: number // APD
  meanWaveDirection?: string // MWD
  windDirection?: number // WDIR
  windSpeed?: number // WSPD
  windGust?: number // GST
  atmosphericPressure?: number // PRES
  airTemperature?: number // ATMP
  waterTemperature?: number // WTMP
  dewPoint?: number // DEWP
  visibility?: number // VIS
  swellHeight?: number // SwH
  swellPeriod?: number // SwP
  swellDirection?: string // SwD
}

export interface NOAABuoyData {
  id: string
  name: string
  location: BuoyLocation
  owner: string
  type: string // Buoy type (moored, drifting, etc.)
  program: string // NDBC program
  status: 'active' | 'inactive' | 'maintenance'
  readings: NOAABuoyReading[]
  lastUpdate: Date
  depth?: number // water depth at buoy location
  hullType?: string
  description?: string
}

export interface TsunamiAlert {
  id: string
  buoyId: string
  buoyName: string
  location: BuoyLocation
  severity: 'low' | 'medium' | 'high'
  waveHeightIncrease: number
  timestamp: Date
  message: string
  detectionMethod: 'wave_height' | 'wave_period' | 'combined'
}

// Station metadata from NOAA
export interface NOAAStationMetadata {
  id: string
  name: string
  owner: string
  type: string
  hull: string
  location: {
    latitude: number
    longitude: number
    text: string
  }
  timezone: string
  forecast: string
  note?: string
}
