import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
  metadata: any
}

/**
 * Detect the operating system and return appropriate HTTP test command
 */
function getHttpTestCommand(url: string): string {
  const isWindows = process.platform === 'win32'
  
  if (isWindows) {
    // PowerShell command for Windows
    return `powershell -Command "try { $response = Invoke-WebRequest -Uri '${url}' -Method Head -TimeoutSec 5; exit 0 } catch { exit 1 }"`
  } else {
    // curl command for Unix-like systems
    return `curl -I -s --max-time 5 "${url}" > /dev/null 2>&1`
  }
}

/**
 * Test if a station has real data by checking NOAA's endpoints using shell commands
 */
async function testStationData(stationId: string): Promise<boolean> {
  try {
    // Try multiple NOAA data endpoints to see if station is active
    const endpoints = [
      `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`,
      `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.spec`,
      `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.cwind`,
      `https://www.ndbc.noaa.gov/station_page.php?station=${stationId}`
    ]

    for (const url of endpoints) {
      try {
        const command = getHttpTestCommand(url)
        
        await execAsync(command)
        
        console.log(`✓ Station ${stationId} has data at ${url.split('/').pop()}`)
        return true
        
      } catch (error) {
        // Continue to next endpoint
        continue
      }
    }

    console.log(`✗ Station ${stationId} appears to have no active data`)
    return false

  } catch (error) {
    console.warn(`Error testing station ${stationId}:`, error)
    return false
  }
}

/**
 * Test all stations and keep only those with active data
 */
async function validateStationsWithRealData(): Promise<boolean> {
  try {
    console.log('Loading current stations...')
    
    const stationsPath = path.join(process.cwd(), 'src', 'data', 'tsunami-stations.json')
    const fileContent = await fs.readFile(stationsPath, 'utf-8')
    const stationsData: StationsData = JSON.parse(fileContent)
    
    console.log(`Testing ${stationsData.stations.length} stations for active data...`)
    console.log('This may take a few minutes...')
    
    const activeStations: TsunamiStation[] = []
    
    // Test stations in batches to avoid overwhelming NOAA servers
    const batchSize = 5
    const stations = stationsData.stations
    
    for (let i = 0; i < stations.length; i += batchSize) {
      const batch = stations.slice(i, i + batchSize)
      
      console.log(`Testing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(stations.length/batchSize)} (stations ${i+1}-${Math.min(i+batchSize, stations.length)})`)
      
      // Test all stations in this batch concurrently
      const promises = batch.map(async (station) => {
        const hasData = await testStationData(station.id)
        return { station, hasData }
      })
      
      const results = await Promise.all(promises)
      
      // Add stations with data to our active list
      results.forEach(({ station, hasData }) => {
        if (hasData) {
          activeStations.push(station)
        }
      })
      
      // Small delay between batches to be respectful
      if (i + batchSize < stations.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log(`Found ${activeStations.length} stations with active data out of ${stations.length} tested`)
    
    if (activeStations.length === 0) {
      console.error('No active stations found! This might indicate a network issue.')
      return false
    }
    
    // Update the stations file with only active stations
    const updatedData: StationsData = {
      stations: activeStations,
      metadata: {
        ...stationsData.metadata,
        lastUpdated: new Date().toISOString(),
        version: '3.0',
        totalStations: activeStations.length,
        source: 'NOAA NDBC - Validated Active Stations',
        validationDate: new Date().toISOString(),
        validationNote: 'Stations tested for active data availability'
      }
    }
    
    // Write back to file
    await fs.writeFile(stationsPath, JSON.stringify(updatedData, null, 2))
    
    console.log(`Successfully updated stations file with ${activeStations.length} validated active stations`)
    
    // Show breakdown
    const regionCounts = activeStations.reduce((acc, station) => {
      acc[station.region] = (acc[station.region] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\nBreakdown by region:')
    Object.entries(regionCounts).forEach(([region, count]) => {
      console.log(`  ${region}: ${count} stations`)
    })
    
    console.log('\nActive station IDs:')
    console.log(activeStations.map(s => s.id).join(', '))
    
    return true
    
  } catch (error) {
    console.error('Error validating stations:', error)
    return false
  }
}

// Alternative: Add specific stations we know have data
async function addKnownActiveStations(): Promise<boolean> {
  try {
    console.log('Adding known active stations...')
    
    const stationsPath = path.join(process.cwd(), 'src', 'data', 'tsunami-stations.json')
    const fileContent = await fs.readFile(stationsPath, 'utf-8')
    const stationsData: StationsData = JSON.parse(fileContent)
    
    // Add the stations you mentioned plus some other known active ones
    const knownActiveStations = [
      { id: '52402', name: 'Pacific DART Buoy', lat: 17.0, lon: -156.0, region: 'Central Pacific', country: 'US', type: 'dart', priority: 'critical' },
      { id: 'aprp7', name: 'Apra Harbor, Guam', lat: 13.44, lon: 144.66, region: 'Western Pacific', country: 'US', type: 'coastal', priority: 'high' }
    ]
    
    // Add these to existing stations (avoid duplicates)
    const existingIds = new Set(stationsData.stations.map(s => s.id))
    
    for (const newStation of knownActiveStations) {
      if (!existingIds.has(newStation.id)) {
        stationsData.stations.push(newStation as TsunamiStation)
        console.log(`Added station ${newStation.id}: ${newStation.name}`)
      } else {
        console.log(`Station ${newStation.id} already exists`)
      }
    }
    
    // Update metadata
    const updatedData = {
      ...stationsData,
      metadata: {
        ...stationsData.metadata,
        lastUpdated: new Date().toISOString(),
        totalStations: stationsData.stations.length,
        additionalStations: 'Added known active stations'
      }
    }
    
    await fs.writeFile(stationsPath, JSON.stringify(updatedData, null, 2))
    
    console.log(`Updated stations file with ${stationsData.stations.length} total stations`)
    return true
    
  } catch (error) {
    console.error('Error adding known stations:', error)
    return false
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--add-known')) {
    addKnownActiveStations()
      .then(success => {
        console.log(success ? 'Successfully added known stations' : 'Failed to add stations')
        process.exit(success ? 0 : 1)
      })
      .catch(error => {
        console.error('Script failed:', error)
        process.exit(1)
      })
  } else {
    validateStationsWithRealData()
      .then(success => {
        console.log(success ? 'Validation completed successfully' : 'Validation failed')
        process.exit(success ? 0 : 1)
      })
      .catch(error => {
        console.error('Script failed:', error)
        process.exit(1)
      })
  }
}

export { validateStationsWithRealData, addKnownActiveStations }
