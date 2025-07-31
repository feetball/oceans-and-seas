// @ts-ignore: NextResponse import for Next.js API route
import { NextResponse } from 'next/server'
import { NOAABuoyData, NOAABuoyReading, NOAAStationMetadata } from '@/types/buoy'
import { loadStations, type TsunamiStation } from '@/utils/stations-manager'
import { createMockTsunamiEvent, generateTsunamiReadings } from '@/utils/tsunami-simulation'
import { buoyCacheManager } from '@/utils/buoy-cache'

// Enhanced tsunami detection for caching
function detectTsunamiStatus(buoy: NOAABuoyData): { isTsunami: boolean; severity: 'normal' | 'medium' | 'high' | 'critical' } {
  if (buoy.readings.length < 2) return { isTsunami: false, severity: 'normal' }
  
  const latestReading = buoy.readings[buoy.readings.length - 1]
  const previousReading = buoy.readings[buoy.readings.length - 2]
  
  const currentHeight = latestReading.waveHeight || latestReading.waterColumnHeight || 0
  const previousHeight = previousReading.waveHeight || previousReading.waterColumnHeight || 0
  
  const heightChange = currentHeight - previousHeight
  const heightChangePercent = (heightChange / (previousHeight || 1)) * 100
  
  const hasSignificantWaveHeight = currentHeight > 2.5
  const hasRapidIncrease = heightChangePercent > 30
  const hasLargeMagnitude = currentHeight > 4.0
  const hasCriticalMagnitude = currentHeight > 6.0
  
  // Calculate trend over last few readings
  if (buoy.readings.length >= 3) {
    const recent = buoy.readings.slice(-4)
    const heights = recent.map(r => r.waveHeight || r.waterColumnHeight || 0)
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length
    
    if (hasCriticalMagnitude || currentHeight > 7.0) {
      return { isTsunami: true, severity: 'critical' }
    } else if (hasLargeMagnitude || (hasSignificantWaveHeight && hasRapidIncrease)) {
      return { isTsunami: true, severity: 'high' }
    } else if (hasSignificantWaveHeight || heightChangePercent > 20 || avgHeight > 2.0) {
      return { isTsunami: true, severity: 'medium' }
    } else if (currentHeight > 2.0 || heightChangePercent > 15) {
      return { isTsunami: true, severity: 'medium' }
    }
  }
  
  if (hasCriticalMagnitude) {
    return { isTsunami: true, severity: 'critical' }
  } else if (hasLargeMagnitude) {
    return { isTsunami: true, severity: 'high' }
  } else if (hasSignificantWaveHeight) {
    return { isTsunami: true, severity: 'medium' }
  }
  
  return { isTsunami: false, severity: 'normal' }
}

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
  const startTime = Date.now()
  
  try {
    console.log('🌊 Fetching buoy data with caching (Vercel serverless)...')
    
    // Check cache first
    const cachedData = await buoyCacheManager.getBuoyData()
    if (cachedData) {
      console.log(`⚡ Serving ${cachedData.data.length} buoys from cache`)
      return NextResponse.json(cachedData.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Cache-Status': 'HIT'
        }
      })
    }
    
    console.log('📡 Cache miss - fetching fresh data from NOAA...')
    
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
    
    // Limit the number of stations for Vercel's serverless timeout
    const maxStations = process.env.VERCEL ? 50 : oceanicStations.length
    const limitedStations = oceanicStations.slice(0, maxStations)
    
    if (process.env.VERCEL) {
      console.log(`⚡ Limited to ${maxStations} stations for Vercel deployment`)
    }
    
    const buoyPromises = limitedStations.map(async (station: TsunamiStation, index: number) => {
      // Reduce delay for Vercel to avoid timeouts
      const delay = process.env.VERCEL ? index * 50 : index * 100
      await new Promise(resolve => setTimeout(resolve, delay))
      
      try {
        const [metadata, readings] = await Promise.all([
          Promise.race([
            fetchStationMetadata(station.id),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)) // 5s timeout
          ]),
          Promise.race([
            fetchStationData(station.id),
            new Promise<NOAABuoyReading[]>(resolve => setTimeout(() => resolve([]), 5000)) // 5s timeout
          ])
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
      } catch (error) {
        console.warn(`Failed to fetch station ${station.id}:`, error)
        // Return minimal buoy data on error
        return {
          id: station.id,
          name: station.name,
          location: { latitude: station.lat, longitude: station.lon },
          owner: 'NOAA NDBC',
          type: 'Ocean Buoy',
          program: 'DART/NDBC Tsunami Warning Network',
          status: 'inactive',
          readings: [],
          lastUpdate: new Date(),
          description: `Tsunami monitoring station ${station.id}`
        } as NOAABuoyData
      }
    })
    
    const buoyData = await Promise.all(buoyPromises)

    // Always include buoys with valid coordinates, even if no readings
    const visibleBuoys = buoyData.filter((buoy: NOAABuoyData) => {
      const lat = buoy.location?.latitude
      const lon = buoy.location?.longitude
      return typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat) > 0 && Math.abs(lon) > 0
    })

    const fetchDuration = Date.now() - startTime
    console.log(`✅ Fetched ${visibleBuoys.length} buoys in ${fetchDuration}ms`)

    // Cache the fresh data
    await buoyCacheManager.setBuoyData(visibleBuoys, fetchDuration)
    
    // Update buoy status cache
    const statusPromises = visibleBuoys.map(async (buoy) => {
      const status = detectTsunamiStatus(buoy)
      const latestReading = buoy.readings[buoy.readings.length - 1]
      if (latestReading) {
        await buoyCacheManager.updateBuoyStatus(
          buoy.id,
          status.severity,
          status.isTsunami,
          latestReading.waveHeight || 0,
          buoy.location
        )
      }
    })
    
    await Promise.all(statusPromises)
    console.log(`💾 Updated status cache for ${visibleBuoys.length} buoys`)

    return NextResponse.json(visibleBuoys, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache-Status': 'MISS',
        'X-Fetch-Duration': fetchDuration.toString()
      }
    })
  } catch (error) {
    console.error('Error fetching NOAA buoy data:', error)
    
    // Try to return cached data even if stale in case of error
    const staleCache = await buoyCacheManager.getBuoyData()
    if (staleCache) {
      console.log('⚠️ Returning stale cache data due to error')
      return NextResponse.json(staleCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache-Status': 'STALE',
          'X-Error': 'Fresh fetch failed, serving stale data'
        }
      })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch NOAA buoy data', timestamp: new Date().toISOString() },
      { 
        status: 500,
        headers: {
          'X-Error': 'No data available'
        }
      }
    )
  }
}
