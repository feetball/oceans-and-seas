import { promises as fs } from 'fs'
import path from 'path'

interface TsunamiStation {
  id: string
  name: string
  lat: number
  lon: number
  region: string
  country: string
  type: 'dart' | 'offshore' | 'coastal' | 'lake'
  priority: 'critical' | 'high' | 'medium' | 'low'
}

interface StationsData {
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

/**
 * Filter stations to only include those likely to have active data
 */
function filterActiveStations(stations: TsunamiStation[]): TsunamiStation[] {
  const activeStations = stations.filter(station => {
    // Filter out experimental and special stations
    const id = station.id.toLowerCase()
    const name = station.name.toLowerCase()
    
    // Exclude obvious experimental or inactive stations
    if (
      id.includes('test') ||
      id.includes('exp') ||
      name.includes('test') ||
      name.includes('experimental') ||
      name.includes('inactive') ||
      name.includes('discontinued') ||
      // Exclude dance-named stations (these are often experimental)
      name.includes('reggae') ||
      name.includes('lambada') ||
      name.includes('gavotte') ||
      name.includes('java') ||
      name.includes('valse') ||
      // Exclude stations with zero coordinates (often placeholders)
      (station.lat === 0 && station.lon === 0) ||
      // Exclude stations in very remote or unusual locations
      station.region === 'Unknown'
    ) {
      return false
    }
    
    // Include standard NOAA buoy station patterns
    // Most active stations follow these patterns:
    // 4xxxx - Great Lakes and Atlantic
    // 5xxxx - Pacific and Hawaii  
    // 2xxxx - International waters
    // 46xxx - Pacific Coast
    // 41xxx, 44xxx - Atlantic Coast
    // 42xxx - Gulf of Mexico
    // 45xxx - Great Lakes
    // 51xxx - Hawaii
    
    const numericId = parseInt(station.id)
    if (!isNaN(numericId)) {
      // Include standard buoy station ranges
      if (
        (numericId >= 41000 && numericId <= 49999) || // Atlantic and Pacific standard range
        (numericId >= 51000 && numericId <= 52999) || // Hawaii and Pacific DART
        (numericId >= 21000 && numericId <= 22999)    // International waters
      ) {
        return true
      }
    }
    
    // Include DART stations (tsunami detection)
    if (station.type === 'dart' || name.includes('dart')) {
      return true
    }
    
    // Include stations in major regions
    if ([
      'Pacific Coast',
      'Atlantic Coast', 
      'Gulf of Mexico',
      'Hawaii',
      'Alaska',
      'Great Lakes',
      'Central Pacific',
      'Western Pacific'
    ].includes(station.region)) {
      return true
    }
    
    return false
  })
  
  console.log(`Filtered ${stations.length} stations down to ${activeStations.length} likely active stations`)
  return activeStations
}

/**
 * Create a curated list of high-priority stations known to have data
 */
function getCuratedStations(): TsunamiStation[] {
  return [
    // Pacific Coast - Known active stations
    { id: '46221', name: 'Santa Monica Bay, CA', lat: 33.855, lon: -118.633, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'high' },
    { id: '46011', name: 'Santa Barbara, CA', lat: 34.243, lon: -119.244, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'high' },
    { id: '46054', name: 'West Eureka, CA', lat: 40.78, lon: -124.956, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'high' },
    { id: '46089', name: 'Tillamook, OR', lat: 45.775, lon: -125.76, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'medium' },
    { id: '46026', name: 'San Francisco North', lat: 37.759, lon: -122.833, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'high' },
    { id: '46050', name: 'Stonewall Bank, OR', lat: 44.656, lon: -124.524, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'medium' },
    { id: '46041', name: 'Cape Elizabeth, WA', lat: 47.353, lon: -124.731, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'medium' },
    { id: '46042', name: 'Monterey Bay, CA', lat: 36.785, lon: -122.469, region: 'Pacific Coast', country: 'US', type: 'coastal', priority: 'high' },
    
    // Alaska - Known active stations
    { id: '46001', name: 'Gulf of Alaska', lat: 56.3, lon: -148.0, region: 'Alaska', country: 'US', type: 'offshore', priority: 'critical' },
    { id: '46060', name: 'West Gulf of Alaska', lat: 56.994, lon: -148.015, region: 'Alaska', country: 'US', type: 'offshore', priority: 'high' },
    { id: '46070', name: 'Kodiak Island', lat: 57.5, lon: -152.9, region: 'Alaska', country: 'US', type: 'coastal', priority: 'critical' },
    { id: '46080', name: 'Yakutat Bay', lat: 59.5, lon: -139.9, region: 'Alaska', country: 'US', type: 'coastal', priority: 'high' },
    
    // Hawaii - Known active stations
    { id: '51001', name: 'Northwest Hawaii', lat: 23.445, lon: -162.279, region: 'Hawaii', country: 'US', type: 'offshore', priority: 'critical' },
    { id: '51002', name: 'Southwest Hawaii', lat: 17.218, lon: -157.756, region: 'Hawaii', country: 'US', type: 'coastal', priority: 'critical' },
    { id: '51003', name: 'Northwest Pacific', lat: 19.09, lon: -160.65, region: 'Hawaii', country: 'US', type: 'offshore', priority: 'critical' },
    { id: '51004', name: 'Central Pacific', lat: 17.48, lon: -152.32, region: 'Hawaii', country: 'US', type: 'offshore', priority: 'high' },
    
    // Pacific DART buoys (known to be active)
    { id: '21413', name: 'Guam West Pacific', lat: 13.35, lon: 144.79, region: 'Western Pacific', country: 'US', type: 'dart', priority: 'critical' },
    
    // Atlantic Coast - Known active stations
    { id: '41001', name: 'East Hatteras', lat: 34.68, lon: -72.66, region: 'Atlantic Coast', country: 'US', type: 'offshore', priority: 'high' },
    { id: '41002', name: 'South Hatteras', lat: 31.76, lon: -74.84, region: 'Atlantic Coast', country: 'US', type: 'offshore', priority: 'high' },
    { id: '44008', name: 'Nantucket Shoals', lat: 40.504, lon: -69.248, region: 'Atlantic Coast', country: 'US', type: 'offshore', priority: 'high' },
    { id: '44013', name: 'Boston', lat: 42.346, lon: -70.651, region: 'Atlantic Coast', country: 'US', type: 'coastal', priority: 'high' },
    { id: '44014', name: 'Virginia Beach', lat: 36.611, lon: -74.842, region: 'Atlantic Coast', country: 'US', type: 'offshore', priority: 'high' },
    
    // Gulf of Mexico - Known active stations
    { id: '42001', name: 'East Gulf', lat: 25.97, lon: -89.68, region: 'Gulf of Mexico', country: 'US', type: 'offshore', priority: 'high' },
    { id: '42002', name: 'West Gulf', lat: 26.55, lon: -93.64, region: 'Gulf of Mexico', country: 'US', type: 'offshore', priority: 'high' },
    { id: '42020', name: 'Corpus Christi', lat: 26.97, lon: -96.7, region: 'Gulf of Mexico', country: 'US', type: 'coastal', priority: 'medium' },
    { id: '42035', name: 'Galveston', lat: 29.23, lon: -94.41, region: 'Gulf of Mexico', country: 'US', type: 'coastal', priority: 'high' },
    
    // Great Lakes - Known active stations
    { id: '45001', name: 'North Lake Michigan', lat: 45.35, lon: -86.68, region: 'Great Lakes', country: 'US', type: 'lake', priority: 'medium' },
    { id: '45002', name: 'South Lake Michigan', lat: 42.58, lon: -87.38, region: 'Great Lakes', country: 'US', type: 'lake', priority: 'medium' },
    { id: '45003', name: 'North Lake Huron', lat: 45.91, lon: -82.77, region: 'Great Lakes', country: 'US', type: 'lake', priority: 'medium' },
    { id: '45007', name: 'Southeast Lake Ontario', lat: 43.62, lon: -77.40, region: 'Great Lakes', country: 'US', type: 'lake', priority: 'medium' }
  ]
}

/**
 * Update stations file with filtered active stations
 */
async function filterToActiveStations(): Promise<boolean> {
  try {
    console.log('Loading current stations file...')
    
    const stationsPath = path.join(process.cwd(), 'src', 'data', 'tsunami-stations.json')
    const fileContent = await fs.readFile(stationsPath, 'utf-8')
    const stationsData: StationsData = JSON.parse(fileContent)
    
    console.log(`Current file has ${stationsData.stations.length} stations`)
    
    // First try filtering the existing stations
    const filteredStations = filterActiveStations(stationsData.stations)
    
    // If we still have too many or too few, use curated list
    let finalStations: TsunamiStation[]
    
    if (filteredStations.length > 200 || filteredStations.length < 20) {
      console.log('Using curated list of known active stations instead')
      finalStations = getCuratedStations()
    } else {
      finalStations = filteredStations
    }
    
    // Update the stations data
    const updatedData: StationsData = {
      stations: finalStations,
      metadata: {
        ...stationsData.metadata,
        lastUpdated: new Date().toISOString(),
        version: '2.1',
        totalStations: finalStations.length,
        source: 'NOAA NDBC - Filtered Active Stations'
      }
    }
    
    // Write back to file
    await fs.writeFile(stationsPath, JSON.stringify(updatedData, null, 2))
    
    console.log(`Successfully updated stations file with ${finalStations.length} active stations`)
    
    // Show breakdown
    const regionCounts = finalStations.reduce((acc, station) => {
      acc[station.region] = (acc[station.region] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('Breakdown by region:')
    Object.entries(regionCounts).forEach(([region, count]) => {
      console.log(`  ${region}: ${count} stations`)
    })
    
    return true
    
  } catch (error) {
    console.error('Error filtering stations:', error)
    return false
  }
}

// Run the filter if this script is executed directly
if (require.main === module) {
  filterToActiveStations()
    .then(success => {
      console.log(success ? 'Filtering completed successfully' : 'Filtering failed')
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}

export { filterToActiveStations }
