import { NextRequest, NextResponse } from 'next/server'
import { 
  loadStations, 
  addStation, 
  updateStation, 
  removeStation,
  getStationsByPriority,
  getStationsByType,
  getStationsByRegion,
  type TsunamiStation 
} from '@/utils/stations-manager'

// GET /api/stations - Get all stations or filter by query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const priority = searchParams.get('priority') as 'critical' | 'high' | 'medium' | 'low' | null
    const type = searchParams.get('type') as 'dart' | 'offshore' | 'coastal' | 'lake' | null
    const region = searchParams.get('region') as 'pacific' | 'atlantic' | 'gulf' | 'great_lakes' | 'alaska' | 'caribbean' | null

    let stations: TsunamiStation[]

    // Apply filters - only one filter at a time
    if (priority) {
      stations = await getStationsByPriority(priority)
    } else if (type) {
      stations = await getStationsByType(type)
    } else if (region) {
      stations = await getStationsByRegion(region)
    } else {
      stations = await loadStations()
    }

    return NextResponse.json({
      success: true,
      count: stations.length,
      stations: stations
    })
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stations'
    }, { status: 500 })
  }
}

// POST /api/stations - Add a new station
export async function POST(request: NextRequest) {
  try {
    const newStation: Omit<TsunamiStation, 'lastUpdated'> = await request.json()
    
    // Validate required fields
    if (!newStation.id || !newStation.name || typeof newStation.lat !== 'number' || typeof newStation.lon !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: id, name, lat (number), lon (number)'
      }, { status: 400 })
    }

    const success = await addStation(newStation)
    
    if (success) {
      const stations = await loadStations()
      return NextResponse.json({
        success: true,
        message: `Station ${newStation.id} added successfully`,
        totalStations: stations.length
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to add station - may already exist'
      }, { status: 409 })
    }
  } catch (error) {
    console.error('Error adding station:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add station'
    }, { status: 500 })
  }
}

// PUT /api/stations - Update an existing station
export async function PUT(request: NextRequest) {
  try {
    const updates: Partial<TsunamiStation> & { id: string } = await request.json()
    
    if (!updates.id) {
      return NextResponse.json({
        success: false,
        error: 'Station ID is required for updates'
      }, { status: 400 })
    }

    const success = await updateStation(updates.id, updates)
    
    if (success) {
      const stations = await loadStations()
      return NextResponse.json({
        success: true,
        message: `Station ${updates.id} updated successfully`,
        totalStations: stations.length
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Station not found'
      }, { status: 404 })
    }
  } catch (error) {
    console.error('Error updating station:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update station'
    }, { status: 500 })
  }
}

// DELETE /api/stations?id=STATION_ID - Remove a station
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('id')
    
    if (!stationId) {
      return NextResponse.json({
        success: false,
        error: 'Station ID is required'
      }, { status: 400 })
    }

    const success = await removeStation(stationId)
    
    if (success) {
      const stations = await loadStations()
      return NextResponse.json({
        success: true,
        message: `Station ${stationId} removed successfully`,
        totalStations: stations.length
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Station not found'
      }, { status: 404 })
    }
  } catch (error) {
    console.error('Error removing station:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove station'
    }, { status: 500 })
  }
}
