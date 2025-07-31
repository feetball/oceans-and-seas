// @ts-ignore: NextResponse import for Next.js API route
import { NextResponse } from 'next/server'
import { NOAABuoyData, NOAABuoyReading, NOAAStationMetadata } from '@/types/buoy'
import { loadStations, type TsunamiStation } from '@/utils/stations-manager'
import { createMockTsunamiEvent, generateTsunamiReadings } from '@/utils/tsunami-simulation'

async function fetchStationMetadata(stationId: string): Promise<NOAAStationMetadata | null> {
  try {
    const response = await fetch(`https://www.ndbc.noaa.gov/station_page.php?station=${stationId}`)
    
    if (!response.ok) return null
    
    const html = await response.text()
    
    // Parse basic station info from HTML
    const nameMatch = html.match(/<h1[^>]*>Station\s+(\w+)\s+-\s+([^<]+)</i)
    const locationMatch = html.match(/(\d+\.\d+)\s*°?[NS]\s+(\d+\.\d+)\s*°?[EW]/i)
    const ownerMatch = html.match(/Information submitted by\s+(?:<[^>]*>)*([^<]+)/i)
    
    // Get station info from our JSON data
    const stations = await loadStations()
    const station = stations.find(s => s.id === stationId)
    
    return {
      id: stationId,
      name: nameMatch ? nameMatch[2].trim() : station?.name || `Station ${stationId}`,
      owner: ownerMatch ? ownerMatch[1].trim() : 'NOAA NDBC',
      type: station?.type === 'dart' ? 'DART Buoy' : 'Ocean Buoy',
      hull: 'Unknown',
      location: {
        latitude: station?.lat || 0,
        longitude: station?.lon || 0,
        text: station ? `${station.lat}°N ${Math.abs(station.lon)}°W` : 'Unknown'
      },
      timezone: 'UTC',
      forecast: `https://www.ndbc.noaa.gov/data/Forecasts/FZUS56.KLOX.html`
    }
  } catch (error) {
    console.error(`Error fetching metadata for station ${stationId}:`, error)
    return null
  }
}

async function fetchStationData(stationId: string): Promise<NOAABuoyReading[]> {
  try {
    const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`)
    
    if (!response.ok) {
      console.warn(`No data available for station ${stationId}`)
      return []
    }
    
    const text = await response.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 3) return []
    
    // Parse header to understand data format
    const headers = lines[0].split(/\s+/)
    const units = lines[1].split(/\s+/)
    
    const readings: NOAABuoyReading[] = []
    
    // Parse each data line (skip header and units)
    for (let i = 2; i < Math.min(lines.length, 50); i++) { // Limit to last 48 readings
      const values = lines[i].split(/\s+/)
      if (values.length < 5) continue
      
      try {
        // Parse timestamp: YY MM DD hh mm
        const year = 2000 + parseInt(values[0])
        const month = parseInt(values[1]) - 1 // JS months are 0-based
        const day = parseInt(values[2])
        const hour = parseInt(values[3])
        const minute = parseInt(values[4])
        
        const timestamp = new Date(year, month, day, hour, minute)
        
        const reading: NOAABuoyReading = {
          timestamp,
          waveHeight: 0 // Will be set below
        }
        
        // Parse values based on header positions
        headers.forEach((header, index) => {
          if (index < values.length && values[index] !== 'MM') {
            const value = parseFloat(values[index])
            if (!isNaN(value)) {
              switch (header) {
                case 'WVHT': // Wave height (m)
                  reading.waveHeight = value
                  reading.waterColumnHeight = value // Use wave height as proxy for water column changes
                  break
                case 'DPD': // Dominant wave period (sec)
                  reading.dominantWavePeriod = value
                  break
                case 'APD': // Average wave period (sec)
                  reading.averageWavePeriod = value
                  break
                case 'MWD': // Mean wave direction (degrees)
                  reading.meanWaveDirection = value.toString()
                  break
                case 'PRES': // Atmospheric pressure (hPa)
                  reading.atmosphericPressure = value
                  break
                case 'ATMP': // Air temperature (Celsius)
                  reading.airTemperature = value
                  break
                case 'WTMP': // Water temperature (Celsius)
                  reading.waterTemperature = value
                  break
                case 'WSPD': // Wind speed (m/s)
                  reading.windSpeed = value
                  break
                case 'WDIR': // Wind direction (degrees)
                  reading.windDirection = value
                  break
                case 'GST': // Wind gust (m/s)
                  reading.windGust = value
                  break
              }
            }
          }
        })
        
        readings.push(reading)
      } catch (parseError) {
        console.warn(`Error parsing line ${i} for station ${stationId}:`, parseError)
      }
    }
    
    return readings.reverse() // Most recent first
  } catch (error) {
    console.error(`Error fetching data for station ${stationId}:`, error)
    return []
  }
}

function generateMockReading(station: TsunamiStation, baseTime: Date, tsunamiEvent?: any): NOAABuoyReading {
  const variance = Math.random() * 0.4 - 0.2 // ±0.2m variance
  const baseHeight = 1.5 + Math.sin(Date.now() / 600000) * 0.8 // Tidal simulation
  
  // Add some stations with elevated readings for demo
  let waveHeight = baseHeight + variance
  
  // Check if this station is affected by tsunami simulation
  if (tsunamiEvent && tsunamiEvent.affectedBuoys.includes(station.id)) {
    const tsunamiReadings = generateTsunamiReadings(
      station.lat,
      station.lon,
      tsunamiEvent.event.epicenter.lat,
      tsunamiEvent.event.epicenter.lon,
      tsunamiEvent.event.magnitude,
      tsunamiEvent.event.timestamp,
      4 // 4 hours of simulation
    )
    
    // Find the reading closest to current time
    const currentTime = baseTime.getTime()
    const closestReading = tsunamiReadings.reduce((closest, reading) => {
      const timeDiff = Math.abs(reading.timestamp.getTime() - currentTime)
      const closestDiff = Math.abs(closest.timestamp.getTime() - currentTime)
      return timeDiff < closestDiff ? reading : closest
    })
    
    if (closestReading) {
      waveHeight = closestReading.waveHeight
    }
  } else if (station.id === '46221' || station.id === '21413') {
    waveHeight += Math.sin(Date.now() / 300000) * 1.5 + 1.0 // Simulated anomaly
  }
  
  return {
    timestamp: baseTime,
    waveHeight: Math.max(0.1, waveHeight),
    waterColumnHeight: Math.max(0.1, waveHeight),
    dominantWavePeriod: 8 + Math.random() * 4,
    averageWavePeriod: 6 + Math.random() * 3,
    meanWaveDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    windSpeed: Math.random() * 15,
    windDirection: Math.random() * 360,
    windGust: Math.random() * 20,
    airTemperature: 15 + Math.random() * 15,
    waterTemperature: 18 + Math.random() * 8,
    dewPoint: 12 + Math.random() * 10,
    atmosphericPressure: 1013 + Math.random() * 20 - 10,
    visibility: 10 + Math.random() * 10
  }
}

export async function GET() {
  try {
    console.log('Loading stations from JSON file...')
    const stations = await loadStations()
    console.log(`Loaded ${stations.length} stations`)
    
    // Create tsunami simulation event for testing
    const tsunamiEvent = createMockTsunamiEvent()
    console.log(`Created tsunami simulation: ${tsunamiEvent.event.name}`)
    console.log(`Affected buoys: ${tsunamiEvent.affectedBuoys.join(', ')}`)
    
    // Filter to oceanic buoys only
    const oceanicStations = stations.filter(station => {
      const lat = station.lat
      const lon = station.lon
      
      // Exclude Great Lakes (rough boundaries)
      if (lat >= 41 && lat <= 49 && lon >= -95 && lon <= -75) {
        return false
      }
      
      // Keep only deep ocean and offshore buoys
      const isDeepOcean = Math.abs(lat) > 5 || Math.abs(lon) > 10
      const isPacific = (lat >= -60 && lat <= 60 && (lon >= 100 || lon <= -120))
      const isAtlantic = (lat >= -60 && lat <= 60 && lon >= -80 && lon <= -10)
      const isIndian = (lat >= -60 && lat <= 30 && lon >= 20 && lon <= 120)
      
      return isDeepOcean && (isPacific || isAtlantic || isIndian)
    })
    
    console.log(`Filtered to ${oceanicStations.length} oceanic stations`)
    
    const buoyPromises = oceanicStations.map(async (station: TsunamiStation, index: number) => {
      // Add small delay between requests to be respectful to NOAA servers
      await new Promise(resolve => setTimeout(resolve, index * 100))
      
      const [metadata, readings] = await Promise.all([
        fetchStationMetadata(station.id),
        fetchStationData(station.id)
      ])
      
      // Fallback to mock data if real data unavailable
      let finalReadings = readings
      if (readings.length === 0) {
        finalReadings = []
        // Generate last 24 hours of mock data
        for (let i = 0; i < 48; i++) {
          const time = new Date(Date.now() - i * 30 * 60 * 1000) // Every 30 minutes
          finalReadings.push(generateMockReading(station, time, tsunamiEvent))
        }
        finalReadings.reverse()
      }
      
      const buoyData: NOAABuoyData = {
        id: station.id,
        name: metadata?.name || station.name,
        location: {
          latitude: station.lat,
          longitude: station.lon
        },
        owner: metadata?.owner || 'NOAA NDBC',
        type: metadata?.type || 'Ocean Buoy',
        program: 'DART/NDBC Tsunami Warning Network',
        status: finalReadings.length > 0 ? 'active' : 'inactive',
        readings: finalReadings,
        lastUpdate: finalReadings.length > 0 ? finalReadings[finalReadings.length - 1].timestamp : new Date(),
        description: `Tsunami monitoring station ${station.id}`
      }
      
      return buoyData
    })
    
    const buoyData = await Promise.all(buoyPromises)

    // Always include buoys with valid coordinates, even if no readings
    const visibleBuoys = buoyData.filter((buoy: NOAABuoyData) => {
      const lat = buoy.location?.latitude
      const lon = buoy.location?.longitude
      return typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat) > 0 && Math.abs(lon) > 0
    })

    return NextResponse.json(visibleBuoys)
  } catch (error) {
    console.error('Error fetching NOAA buoy data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NOAA buoy data' },
      { status: 500 }
    )
  }
}
