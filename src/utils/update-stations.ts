// Always run the update when this script is executed directly
// Only run if not in production to avoid blocking Railway builds
if (process.env.NODE_ENV !== 'production') {
  runUpdate();
// removed extraneous closing brace
const fs = require('fs').promises;
const path = require('path');

interface NOAAStation {
  id: string
  name: string
  lat: number
  lon: number
  type: string
  owner: string
  status: string
  timezone: string
}

interface TsunamiStation {
  id: string
  name: string
  lat: number
  lon: number
  region: string
  country: string
  type: 'dart' | 'offshore' | 'coastal' | 'lake'
  priority: 'critical' | 'high' | 'medium' | 'low'
  hasData?: boolean
}

/**
 * Fetch all active NOAA buoy stations from their station list
 */
async function fetchAllNOAAStations(): Promise<NOAAStation[]> {
  try {
  console.log('Step 1: Fetching all NOAA stations...')
    
    // Try the stations list endpoint
    const response = await fetch('https://www.ndbc.noaa.gov/data/stations/station_table.txt')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch NOAA stations: ${response.status}`)
    }
    
    const text = await response.text()
    const lines = text.split('\n')
    const stations: NOAAStation[] = []
    
    console.log(`Processing ${lines.length} lines from station table...`)
    
    // Parse the pipe-delimited format
    // Format: STATION_ID | OWNER | TTYPE | HULL | NAME | PAYLOAD | LOCATION | TIMEZONE | FORECAST | NOTE
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Skip headers and empty lines
      if (!line || line.startsWith('#') || line.includes('STATION_ID')) {
        continue
      }
      
      // Split by pipe delimiter
      const parts = line.split('|').map(part => part.trim())
      
      if (parts.length >= 7) {
        const id = parts[0]
        const owner = parts[1]
        const type = parts[2]
        const name = parts[4]
        const location = parts[6]
        
        // Parse location string like "44.794 N 87.313 W (44°47'39" N 87°18'48" W)"
        const locationMatch = location.match(/([0-9.-]+)\s*([NS])\s+([0-9.-]+)\s*([EW])/)
        
        if (locationMatch && id) {
          let lat = parseFloat(locationMatch[1])
          let lon = parseFloat(locationMatch[3])
          
          // Apply direction (N/S for latitude, E/W for longitude)
          if (locationMatch[2] === 'S') lat = -lat
          if (locationMatch[4] === 'W') lon = -lon
          
          // Validate coordinates
          if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
            stations.push({
              id,
              name: name || `Station ${id}`,
              lat,
              lon,
              type: type || 'buoy',
              owner: owner || 'NOAA',
              status: 'active',
              timezone: 'UTC'
            })
          }
        }
      }
    }
    
    console.log(`Successfully parsed ${stations.length} stations`)
    return stations
    
  } catch (error) {
    console.error('Error fetching from station table, trying alternative approach:', error)
    
    // Fallback: use a comprehensive list of known NOAA station IDs
    return await fetchKnownStations()
  }
}

/**
 * Fallback function with comprehensive list of known NOAA stations
 */
async function fetchKnownStations(): Promise<NOAAStation[]> {
  console.log('Using comprehensive list of known NOAA stations...')
  
  const knownStations = [
    // Pacific Coast
    '46221', '46011', '46054', '46089', '46026', '46050', '46041', '46087', 
    '46013', '46042', '46025', '46086', '46059', '46066', '46084', '46088',
    '46022', '46028', '46053', '46014', '46027', '46012', '46015', '46029',
    
    // Alaska
    '46001', '46060', '46070', '46080', '46082', '46083', '46035', '46061',
    '46062', '46072', '46073', '46074', '46075', '46076', '46077', '46078',
    '46079', '46081', '46085',
    
    // Hawaii and Central Pacific
    '51001', '51002', '51003', '51004', '51101', '51201', '51202', '51203',
    '51204', '51205', '51206', '51207', '51208', '51209', '51210', '51211',
    
    // Pacific DART buoys
    '52200', '52201', '52202', '52203', '52204', '52205', '52206', '52207',
    '52208', '52209', '52210', '52211', '52212', '52213', '52214', '52215',
    
    // Western Pacific - DART and international buoys
    '21413', '21414', '21415', '21416', '21417', '21418', '21419', '21420',
    '21401', '21402', '21403', '21404', '21405', '21406', '21407', '21408',
    '21409', '21410', '21411', '21412', '21421', '21422', '21423', '21424',
    '52401', '52402', '52403', '52404', '52405', '52406', '52407', '52408',
    // Japan Meteorological Agency buoys
    '21001', '21002', '21003', '21004', '21005', '21006', '21007', '21008',
    // Philippine buoys
    '23001', '23002', '23003', '23004', '23005',
    // Indonesian buoys  
    '56001', '56002', '56003', '56004', '56005',
    // Australian Bureau of Meteorology Western Pacific
    '55001', '55002', '55003', '55004', '55005', '55006', '55007',
    
    // Atlantic Coast
    '41001', '41002', '41004', '41008', '41009', '41010', '41012', '41013',
    '44008', '44011', '44013', '44014', '44017', '44018', '44020', '44025',
    '44027', '44065', '44066', '44069', '44073', '44075', '44089', '44090',
    
    // Gulf of Mexico
    '42001', '42002', '42003', '42019', '42020', '42035', '42036', '42039',
    '42040', '42055', '42056', '42057', '42058', '42059', '42060',
    
    // Caribbean
    '41041', '41043', '41046', '41047', '41048', '41049', '42085', '42086',
    
    // Great Lakes
    '45001', '45002', '45003', '45004', '45005', '45006', '45007', '45008',
    '45012', '45013', '45014', '45161', '45164', '45165', '45167', '45168',
    '45169', '45170', '45171', '45172', '45173', '45174'
  ]
  
  const stations: NOAAStation[] = []
  
  // For each station, try to fetch its metadata
  for (const stationId of knownStations) {
    try {
      // Use a simple approach - fetch station page and parse coordinates
      const response = await fetch(`https://www.ndbc.noaa.gov/station_page.php?station=${stationId}`)
      
      if (response.ok) {
        const html = await response.text()
        
        // Extract coordinates from the HTML
        const latMatch = html.match(/(\d+\.\d+)\s*°?\s*N/)
        const lonMatch = html.match(/(\d+\.\d+)\s*°?\s*W/)
        const nameMatch = html.match(/<h1[^>]*>.*?Station\s+\w+\s*-\s*([^<]+)/i)
        
        if (latMatch && lonMatch) {
          const lat = parseFloat(latMatch[1])
          const lon = -parseFloat(lonMatch[1]) // West is negative
          const name = nameMatch ? nameMatch[1].trim() : `Station ${stationId}`
          
          stations.push({
            id: stationId,
            name,
            lat,
            lon,
            type: 'buoy',
            owner: 'NOAA',
            status: 'active',
            timezone: 'UTC'
          })
        }
      }
      
      // Add small delay to be respectful to NOAA servers
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.warn(`Failed to fetch data for station ${stationId}:`, error)
    }
  }
  
  console.log(`Retrieved ${stations.length} stations from known list`)
  return stations
}

/**
 * Add known Western Pacific buoys that may not be in NOAA database
 */
function addAllPacificBuoys(): NOAAStation[] {
  return [
    // DART buoys (NOAA, US, International)
    { id: '21413', name: 'Guam West Pacific DART', lat: 13.35, lon: 144.79, type: 'DART', owner: 'NOAA', status: 'active', timezone: 'Pacific/Guam' },
    { id: '21414', name: 'Philippines East DART', lat: 15.0, lon: 135.0, type: 'DART', owner: 'NOAA', status: 'active', timezone: 'Asia/Manila' },
    { id: '21415', name: 'Japan Southeast DART', lat: 30.0, lon: 152.0, type: 'DART', owner: 'JMA', status: 'active', timezone: 'Asia/Tokyo' },
    { id: '21416', name: 'Mariana Trench DART', lat: 12.0, lon: 147.0, type: 'DART', owner: 'NOAA', status: 'active', timezone: 'Pacific/Guam' },
    { id: '52401', name: 'Northwest Pacific DART', lat: 32.31, lon: 152.12, type: 'DART', owner: 'NOAA', status: 'active', timezone: 'UTC' },
    { id: '52402', name: 'Central Pacific DART', lat: 17.0, lon: 156.0, type: 'DART', owner: 'NOAA', status: 'active', timezone: 'Pacific/Honolulu' },
    // Add more DART and international Pacific buoys here as needed
    // Japanese Meteorological Agency (JMA) buoys
    { id: '21001', name: 'Honshu East Coast', lat: 36.0, lon: 141.0, type: 'Weather Buoy', owner: 'JMA', status: 'active', timezone: 'Asia/Tokyo' },
    { id: '21002', name: 'Kyushu Southeast', lat: 31.0, lon: 132.0, type: 'Weather Buoy', owner: 'JMA', status: 'active', timezone: 'Asia/Tokyo' },
    { id: '21003', name: 'Okinawa East', lat: 26.0, lon: 128.0, type: 'Weather Buoy', owner: 'JMA', status: 'active', timezone: 'Asia/Tokyo' },
    // Philippine buoys (PAGASA)
    { id: '23001', name: 'Luzon East Coast', lat: 16.0, lon: 122.0, type: 'Weather Buoy', owner: 'PAGASA', status: 'active', timezone: 'Asia/Manila' },
    { id: '23002', name: 'Mindanao East', lat: 8.0, lon: 127.0, type: 'Weather Buoy', owner: 'PAGASA', status: 'active', timezone: 'Asia/Manila' },
    // Indonesian buoys (BMKG)
    { id: '56001', name: 'Java Sea', lat: -6.0, lon: 110.0, type: 'Weather Buoy', owner: 'BMKG', status: 'active', timezone: 'Asia/Jakarta' },
    // Australian Bureau of Meteorology (BOM)
    { id: '55001', name: 'Coral Sea North', lat: -15.0, lon: 155.0, type: 'Weather Buoy', owner: 'BOM', status: 'active', timezone: 'Australia/Brisbane' },
    // Add more Pacific buoys as needed
  ];
}

/**
 * Convert NOAA station to our tsunami station format
 */
function convertToTsunamiStation(noaaStation: NOAAStation): TsunamiStation {
  // Determine region based on coordinates
  let region = 'Unknown'
  const { lat, lon } = noaaStation
  
  if (lat >= 24 && lat <= 72 && lon >= -180 && lon <= -120) {
    region = 'Alaska'
  } else if (lat >= 18 && lat <= 28 && lon >= -180 && lon <= -154) {
    region = 'Hawaii'
  } else if (lat >= 20 && lat <= 70 && lon >= -130 && lon <= -110) {
    region = 'Pacific Coast'
  } else if (lat >= 0 && lat <= 45 && lon >= -180 && lon <= -140) {
    region = 'Central Pacific'
  } else if (lat >= 0 && lat <= 45 && lon >= 140 && lon <= 180) {
    region = 'Western Pacific'
  } else if (lat >= -10 && lat <= 45 && lon >= 100 && lon <= 140) {
    region = 'Western Pacific'
  } else if (lat >= 8 && lat <= 50 && lon >= -100 && lon <= -80) {
    region = 'Gulf of Mexico'
  } else if (lat >= 20 && lat <= 50 && lon >= -80 && lon <= -60) {
    region = 'Atlantic Coast'
  } else if (lat >= 40 && lat <= 50 && lon >= -95 && lon <= -75) {
    region = 'Great Lakes'
  } else if (lat >= 10 && lat <= 30 && lon >= -85 && lon <= -60) {
    region = 'Caribbean'
  }
  
  // Determine type based on location and station info
  let type: 'dart' | 'offshore' | 'coastal' | 'lake' = 'offshore'
  
  if (noaaStation.type?.toLowerCase().includes('dart') || noaaStation.name?.toLowerCase().includes('dart')) {
    type = 'dart'
  } else if (region === 'Great Lakes') {
    type = 'lake'
  } else if (Math.abs(lat) < 5 || Math.abs(lon) > 160) {
    type = 'offshore' // Deep ocean
  } else {
    type = 'coastal'
  }
  
  // Determine priority based on location importance
  let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  
  if (type === 'dart') {
    priority = 'critical'
  } else if (region === 'Hawaii' || region === 'Alaska') {
    priority = 'critical'
  } else if (region === 'Pacific Coast' || region === 'Atlantic Coast') {
    priority = 'high'
  } else if (region === 'Central Pacific' || region === 'Western Pacific') {
    priority = 'high'
  } else {
    priority = 'medium'
  }
  
  return {
    id: noaaStation.id,
    name: noaaStation.name,
    lat: noaaStation.lat,
    lon: noaaStation.lon,
    region,
    country: 'US',
    type,
    priority
  }
}

/**
 * Update the stations JSON file with all NOAA stations
 */
async function updateStationsFromNOAA(): Promise<boolean> {
  try {
    console.log('Starting NOAA stations update...')
    
    const noaaStations = await fetchAllNOAAStations()
    
    // Add Western Pacific buoys that may not be in NOAA database  
  const allPacificBuoys = addAllPacificBuoys();
  console.log(`Adding ${allPacificBuoys.length} additional Pacific buoys`);
  const allStations = [...noaaStations, ...allPacificBuoys];
  console.log('Step 2: Total stations (NOAA + Pacific):', allStations.length);
    if (allStations.length === 0) {
      console.error('No stations retrieved')
      return false
    }

    // Debug: print a sample station
    console.log('Sample NOAA station:', JSON.stringify(noaaStations[0], null, 2))
    if (allPacificBuoys.length > 0) {
      console.log('Sample Pacific buoy:', JSON.stringify(allPacificBuoys[0], null, 2))
    }
    
    console.log(`Converting ${allStations.length} stations...`)
    
    // Convert to our format
  console.log('Step 3: Converting stations to tsunami stations...')
    // Actively check each station for real data
    const tsunamiStations: TsunamiStation[] = [];
    for (const station of allStations) {
      const tsStation = convertToTsunamiStation(station);
      try {
        // Try to fetch real-time data for the station
        const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${station.id}.txt`);
        if (response.ok) {
          const text = await response.text();
          // If there are more than 3 lines (header, units, at least one data row), mark as having data
          const lines = text.split('\n').filter(line => line.trim());
          tsStation.hasData = lines.length > 3;
        } else {
          tsStation.hasData = false;
        }
      } catch (err) {
        tsStation.hasData = false;
      }
      tsunamiStations.push(tsStation);
    }
  console.log('Step 4: Converted stations:', tsunamiStations.length)
    
    // Filter to keep only useful stations (those with reasonable coordinates)
    console.log('Step 5: Filtering valid stations...')
    const filteredStations = tsunamiStations.filter(station => 
      Math.abs(station.lat) <= 90 && 
      Math.abs(station.lon) <= 180 &&
      station.name.length > 0
    )
    console.log(`Step 6: Filtered to ${filteredStations.length} valid stations`)
    
    // Create the updated JSON structure
    const stationsData = {
      stations: filteredStations,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '2.0',
        totalStations: filteredStations.length,
        updateFrequency: 'daily',
        source: 'NOAA NDBC API',
        priorityLevels: {
          critical: 'Primary tsunami monitoring stations',
          high: 'Important regional monitoring',
          medium: 'Secondary monitoring and validation',
          low: 'Supplementary data points'
        },
        stationTypes: {
          dart: 'Deep-ocean Assessment and Reporting of Tsunamis',
          offshore: 'Deep water ocean buoys',
          coastal: 'Near-shore monitoring stations',
          lake: 'Great Lakes monitoring'
        }
      }
    }
    
    // Write to the JSON file
    const stationsPath = path.join(process.cwd(), 'src', 'data', 'tsunami-stations.json')
    console.log('Step 7: Writing stations to', stationsPath)
    try {
      await fs.writeFile(stationsPath, JSON.stringify(stationsData, null, 2))
      console.log('Step 8: Successfully wrote to', stationsPath)
    } catch (writeError) {
      console.error('Step 8: Failed to write stations file:', writeError)
      return false
    }
    
    console.log(`Successfully updated stations file with ${filteredStations.length} stations`)
    console.log('Breakdown by region:')
    
    const regionCounts = filteredStations.reduce((acc, station) => {
      acc[station.region] = (acc[station.region] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(regionCounts).forEach(([region, count]) => {
      console.log(`  ${region}: ${count} stations`)
    })
    
    return true
    
  } catch (error) {
    console.error('Error updating stations from NOAA:', error)
    return false
  }
}

// For ES module usage, export the update function and run if imported directly
async function runUpdate() {
  const success = await updateStationsFromNOAA()
  console.log(success ? 'Update completed successfully' : 'Update failed')
}

// Allow direct execution
if (require.main === module) {
  updateStationsFromNOAA().then(success => {
    if (success) {
      console.log('Update completed successfully (direct run)')
    } else {
      console.error('Update failed (direct run)')
    }
  })
}
}
