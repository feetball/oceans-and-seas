import fs from 'fs/promises'
import path from 'path'

export interface TsunamiStation {
  id: string
  name: string
  lat: number
  lon: number
  region: string
  country: string
  type: 'dart' | 'offshore' | 'coastal' | 'lake'
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface StationsData {
  stations: TsunamiStation[]
  metadata: {
    lastUpdated: string
    version: string
    totalStations: number
    updateFrequency: string
    source: string
    priorityLevels: Record<string, string>
    stationTypes: Record<string, string>
  }
}

const STATIONS_FILE = path.join(process.cwd(), 'src/data/tsunami-stations.json')

/**
 * Load tsunami monitoring stations from JSON file
 */
export async function loadStations(): Promise<TsunamiStation[]> {
  try {
    const fileContent = await fs.readFile(STATIONS_FILE, 'utf-8')
    const data: StationsData = JSON.parse(fileContent)
    return data.stations
  } catch (error) {
    console.error('Error loading stations from JSON:', error)
    return []
  }
}

/**
 * Save updated stations to JSON file
 */
export async function saveStations(stations: TsunamiStation[]): Promise<boolean> {
  try {
    const existingData = await loadStationsData()
    const updatedData: StationsData = {
      ...existingData,
      stations,
      metadata: {
        ...existingData.metadata,
        lastUpdated: new Date().toISOString(),
        totalStations: stations.length
      }
    }
    
    await fs.writeFile(STATIONS_FILE, JSON.stringify(updatedData, null, 2))
    return true
  } catch (error) {
    console.error('Error saving stations to JSON:', error)
    return false
  }
}

/**
 * Load complete stations data including metadata
 */
export async function loadStationsData(): Promise<StationsData> {
  try {
    const fileContent = await fs.readFile(STATIONS_FILE, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error loading stations data:', error)
    return {
      stations: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0',
        totalStations: 0,
        updateFrequency: 'daily',
        source: 'NOAA NDBC',
        priorityLevels: {},
        stationTypes: {}
      }
    }
  }
}

/**
 * Add a new station to the collection
 */
export async function addStation(station: TsunamiStation): Promise<boolean> {
  try {
    const stations = await loadStations()
    
    // Check if station already exists
    if (stations.find(s => s.id === station.id)) {
      console.warn(`Station ${station.id} already exists`)
      return false
    }
    
    stations.push(station)
    return await saveStations(stations)
  } catch (error) {
    console.error('Error adding station:', error)
    return false
  }
}

/**
 * Update an existing station
 */
export async function updateStation(stationId: string, updates: Partial<TsunamiStation>): Promise<boolean> {
  try {
    const stations = await loadStations()
    const index = stations.findIndex(s => s.id === stationId)
    
    if (index === -1) {
      console.warn(`Station ${stationId} not found`)
      return false
    }
    
    stations[index] = { ...stations[index], ...updates }
    return await saveStations(stations)
  } catch (error) {
    console.error('Error updating station:', error)
    return false
  }
}

/**
 * Remove a station from the collection
 */
export async function removeStation(stationId: string): Promise<boolean> {
  try {
    const stations = await loadStations()
    const filteredStations = stations.filter(s => s.id !== stationId)
    
    if (filteredStations.length === stations.length) {
      console.warn(`Station ${stationId} not found`)
      return false
    }
    
    return await saveStations(filteredStations)
  } catch (error) {
    console.error('Error removing station:', error)
    return false
  }
}

/**
 * Filter stations by priority level
 */
export async function getStationsByPriority(priority: TsunamiStation['priority']): Promise<TsunamiStation[]> {
  const stations = await loadStations()
  return stations.filter(station => station.priority === priority)
}

/**
 * Filter stations by type
 */
export async function getStationsByType(type: TsunamiStation['type']): Promise<TsunamiStation[]> {
  const stations = await loadStations()
  return stations.filter(station => station.type === type)
}

/**
 * Filter stations by region
 */
export async function getStationsByRegion(region: string): Promise<TsunamiStation[]> {
  const stations = await loadStations()
  return stations.filter(station => station.region === region)
}

/**
 * Get stations within a geographical bounding box
 */
export async function getStationsInBounds(
  northLat: number,
  southLat: number,
  eastLon: number,
  westLon: number
): Promise<TsunamiStation[]> {
  const stations = await loadStations()
  return stations.filter(station => 
    station.lat >= southLat &&
    station.lat <= northLat &&
    station.lon >= westLon &&
    station.lon <= eastLon
  )
}

/**
 * Update station metadata
 */
export async function updateMetadata(updates: Partial<StationsData['metadata']>): Promise<boolean> {
  try {
    const data = await loadStationsData()
    data.metadata = { ...data.metadata, ...updates }
    
    await fs.writeFile(STATIONS_FILE, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error('Error updating metadata:', error)
    return false
  }
}
