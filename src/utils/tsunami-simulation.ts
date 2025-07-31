// Tsunami simulation based on recent earthquake data
export interface TsunamiSimulation {
  id: string
  name: string
  epicenter: { lat: number; lon: number }
  magnitude: number
  depth: number
  timestamp: Date
  tsunamiWaveData: Array<{
    stationId: string
    waveArrivalTime: Date
    maxWaveHeight: number
    waveSequence: Array<{
      time: Date
      height: number
      period: number
    }>
  }>
}

// Recent significant earthquakes that generated tsunamis
const RECENT_TSUNAMI_EVENTS: TsunamiSimulation[] = [
  {
    id: 'tohoku_2011',
    name: '2011 Tōhoku Earthquake and Tsunami',
    epicenter: { lat: 38.297, lon: 142.373 },
    magnitude: 9.1,
    depth: 32,
    timestamp: new Date('2011-03-11T05:46:24Z'),
    tsunamiWaveData: [
      {
        stationId: '21401',
        waveArrivalTime: new Date('2011-03-11T06:15:00Z'),
        maxWaveHeight: 6.8,
        waveSequence: [
          { time: new Date('2011-03-11T06:15:00Z'), height: 2.1, period: 45 },
          { time: new Date('2011-03-11T06:30:00Z'), height: 4.5, period: 38 },
          { time: new Date('2011-03-11T06:45:00Z'), height: 6.8, period: 42 },
          { time: new Date('2011-03-11T07:00:00Z'), height: 5.2, period: 40 },
          { time: new Date('2011-03-11T07:15:00Z'), height: 3.8, period: 45 },
          { time: new Date('2011-03-11T07:30:00Z'), height: 2.4, period: 48 }
        ]
      },
      {
        stationId: '21415',
        waveArrivalTime: new Date('2011-03-11T06:10:00Z'),
        maxWaveHeight: 8.2,
        waveSequence: [
          { time: new Date('2011-03-11T06:10:00Z'), height: 3.2, period: 40 },
          { time: new Date('2011-03-11T06:25:00Z'), height: 6.1, period: 35 },
          { time: new Date('2011-03-11T06:40:00Z'), height: 8.2, period: 38 },
          { time: new Date('2011-03-11T06:55:00Z'), height: 7.4, period: 42 },
          { time: new Date('2011-03-11T07:10:00Z'), height: 5.6, period: 44 },
          { time: new Date('2011-03-11T07:25:00Z'), height: 3.9, period: 46 }
        ]
      }
    ]
  },
  {
    id: 'alaska_2020',
    name: '2020 Alaska Peninsula Earthquake',
    epicenter: { lat: 55.325, lon: -158.541 },
    magnitude: 7.8,
    depth: 28,
    timestamp: new Date('2020-07-22T06:12:44Z'),
    tsunamiWaveData: [
      {
        stationId: '46419',
        waveArrivalTime: new Date('2020-07-22T06:45:00Z'),
        maxWaveHeight: 2.8,
        waveSequence: [
          { time: new Date('2020-07-22T06:45:00Z'), height: 1.2, period: 25 },
          { time: new Date('2020-07-22T07:00:00Z'), height: 2.8, period: 30 },
          { time: new Date('2020-07-22T07:15:00Z'), height: 2.1, period: 32 },
          { time: new Date('2020-07-22T07:30:00Z'), height: 1.6, period: 28 }
        ]
      }
    ]
  },
  {
    id: 'chile_2015',
    name: '2015 Illapel Earthquake',
    epicenter: { lat: -31.573, lon: -71.674 },
    magnitude: 8.3,
    depth: 25,
    timestamp: new Date('2015-09-16T22:54:33Z'),
    tsunamiWaveData: [
      {
        stationId: '32012',
        waveArrivalTime: new Date('2015-09-16T23:25:00Z'),
        maxWaveHeight: 4.2,
        waveSequence: [
          { time: new Date('2015-09-16T23:25:00Z'), height: 1.8, period: 35 },
          { time: new Date('2015-09-16T23:40:00Z'), height: 3.4, period: 32 },
          { time: new Date('2015-09-16T23:55:00Z'), height: 4.2, period: 38 },
          { time: new Date('2015-09-17T00:10:00Z'), height: 3.1, period: 40 },
          { time: new Date('2015-09-17T00:25:00Z'), height: 2.3, period: 42 }
        ]
      }
    ]
  }
]

/**
 * Generate tsunami simulation data for a specific event
 */
export function generateTsunamiSimulation(eventId: string, currentTime: Date = new Date()): TsunamiSimulation | null {
  const baseEvent = RECENT_TSUNAMI_EVENTS.find(event => event.id === eventId)
  if (!baseEvent) return null

  // Adjust timestamps to simulate the event happening now
  const originalTime = baseEvent.timestamp
  const timeOffset = currentTime.getTime() - originalTime.getTime()

  const adjustedEvent: TsunamiSimulation = {
    ...baseEvent,
    timestamp: currentTime,
    tsunamiWaveData: baseEvent.tsunamiWaveData.map(waveData => ({
      ...waveData,
      waveArrivalTime: new Date(waveData.waveArrivalTime.getTime() + timeOffset),
      waveSequence: waveData.waveSequence.map(wave => ({
        ...wave,
        time: new Date(wave.time.getTime() + timeOffset)
      }))
    }))
  }

  return adjustedEvent
}

/**
 * Generate realistic tsunami readings for a buoy based on distance from epicenter
 */
export function generateTsunamiReadings(
  buoyLat: number, 
  buoyLon: number, 
  epicenterLat: number, 
  epicenterLon: number, 
  magnitude: number,
  startTime: Date,
  durationHours: number = 6
): Array<{
  timestamp: Date
  waveHeight: number
  waterColumnHeight: number
  dominantWavePeriod: number
  atmosphericPressure: number
  isTsunamiWave: boolean
}> {
  const readings = []
  
  // Calculate distance from epicenter (simplified)
  const distance = Math.sqrt(
    Math.pow(buoyLat - epicenterLat, 2) + Math.pow(buoyLon - epicenterLon, 2)
  ) * 111 // Rough km conversion
  
  // Tsunami wave travel time (approximately 200-800 km/h depending on depth)
  const waveSpeed = 500 // km/h average
  const arrivalTimeMinutes = (distance / waveSpeed) * 60
  const arrivalTime = new Date(startTime.getTime() + arrivalTimeMinutes * 60 * 1000)
  
  // Generate readings every 6 minutes for the duration
  const intervalMinutes = 6
  const totalReadings = (durationHours * 60) / intervalMinutes
  
  for (let i = 0; i < totalReadings; i++) {
    const currentTime = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000)
    const minutesSinceStart = (currentTime.getTime() - startTime.getTime()) / (1000 * 60)
    const minutesSinceArrival = (currentTime.getTime() - arrivalTime.getTime()) / (1000 * 60)
    
    let waveHeight = 1.2 + Math.sin(minutesSinceStart / 30) * 0.3 // Normal sea state
    let isTsunamiWave = false
    
    // Add tsunami waves after arrival time
    if (minutesSinceArrival > 0 && minutesSinceArrival < 180) { // 3 hours of tsunami activity
      const tsunamiAmplitude = Math.max(0, (magnitude - 7) * 2 - distance / 1000) // Amplitude based on magnitude and distance
      
      if (tsunamiAmplitude > 0) {
        // Multiple wave peaks with decreasing amplitude
        const wave1 = tsunamiAmplitude * Math.exp(-minutesSinceArrival / 60) * Math.sin((minutesSinceArrival - 0) / 15)
        const wave2 = tsunamiAmplitude * 0.7 * Math.exp(-(minutesSinceArrival - 30) / 60) * Math.sin((minutesSinceArrival - 30) / 18)
        const wave3 = tsunamiAmplitude * 0.5 * Math.exp(-(minutesSinceArrival - 60) / 60) * Math.sin((minutesSinceArrival - 60) / 22)
        
        const tsunamiComponent = Math.max(0, wave1 + wave2 + wave3)
        
        if (tsunamiComponent > 0.5) {
          waveHeight += tsunamiComponent
          isTsunamiWave = true
        }
      }
    }
    
    readings.push({
      timestamp: currentTime,
      waveHeight: Math.max(0.1, waveHeight),
      waterColumnHeight: Math.max(0.1, waveHeight),
      dominantWavePeriod: isTsunamiWave ? 25 + Math.random() * 15 : 8 + Math.random() * 4,
      atmosphericPressure: 1013 + Math.sin(minutesSinceStart / 60) * 5 + (Math.random() - 0.5) * 3,
      isTsunamiWave
    })
  }
  
  return readings
}

/**
 * Create a mock tsunami event for testing
 */
export function createMockTsunamiEvent(): {
  event: TsunamiSimulation
  affectedBuoys: string[]
} {
  const now = new Date()
  const eventTime = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
  
  // Simulate a magnitude 8.2 earthquake near Japan
  const mockEvent: TsunamiSimulation = {
    id: 'mock_' + Date.now(),
    name: 'Simulated Pacific Tsunami Event',
    epicenter: { lat: 36.5, lon: 142.8 },
    magnitude: 8.2,
    depth: 25,
    timestamp: eventTime,
    tsunamiWaveData: [
      {
        stationId: '21413', // Guam West Pacific DART
        waveArrivalTime: new Date(eventTime.getTime() + 45 * 60 * 1000),
        maxWaveHeight: 5.2,
        waveSequence: []
      },
      {
        stationId: '21415', // Japan Southeast DART  
        waveArrivalTime: new Date(eventTime.getTime() + 15 * 60 * 1000),
        maxWaveHeight: 7.8,
        waveSequence: []
      },
      {
        stationId: '52401', // Northwest Pacific DART
        waveArrivalTime: new Date(eventTime.getTime() + 30 * 60 * 1000),
        maxWaveHeight: 4.6,
        waveSequence: []
      }
    ]
  }
  
  return {
    event: mockEvent,
    affectedBuoys: ['21413', '21415', '52401', '21001', '21002', '21003']
  }
}
