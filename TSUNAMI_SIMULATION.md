# Tsunami Simulation Playback Controls

## Overview
The Pacific Tsunami Detection System now includes comprehensive playback controls that allow you to simulate and analyze historical tsunami events with full temporal control.

## Features

### 🎮 Playback Controls
- **Play/Pause**: Start and stop the simulation
- **Stop**: Reset simulation to beginning
- **Restart**: Reset and immediately start playing
- **Speed Control**: Adjust playback speed from 0.25x to 16x
- **Seek**: Jump to specific times or use progress bar
- **Fine Control**: Step forward/backward by 1 or 5 minutes

### 📊 Historical Events
- **Tōhoku 2011 (M9.1)**: Japan earthquake and tsunami
- **Alaska 2020 (M7.8)**: Alaska Peninsula earthquake
- **Chile 2015 (M8.3)**: Illapel earthquake and tsunami

### 🌊 Real-Time Visualization
- **Wave Propagation**: Animated tsunami wave fronts spreading from epicenter
- **Epicenter Marker**: Pulsating earthquake source location
- **Wave Arrival Times**: Calculated ETA for each buoy station
- **Dynamic Alerts**: Buoy status changes as waves arrive
- **Danger Zones**: Circular alert zones around affected buoys

## How to Use

### Basic Playback
1. Open the application
2. Locate the "Tsunami Simulation Controls" panel in the sidebar
3. Select a historical event from the dropdown
4. Click the Play button to start the simulation
5. Use the progress bar to seek to specific times
6. Adjust speed using the speed buttons (0.25x to 16x)

### Advanced Controls
- **Time Navigation**: Use the "+30m", "+60m", "+120m", "+180m" quick jump buttons
- **Fine Control**: Use "-5m", "-1m", "+1m", "+5m" for precise timing
- **Event Switching**: Use Previous/Next Event buttons for quick comparison

### Visual Elements

#### Map Visualization
- **Red Pulsating Marker**: Earthquake epicenter
- **Red Dashed Circles**: Tsunami wave fronts expanding from epicenter
- **Colored Buoys**:
  - 🟢 Green: Normal/Pre-wave conditions
  - 🟡 Yellow: Medium tsunami alert (50km danger zone)
  - 🟠 Orange: High tsunami alert (100km danger zone)
  - 🔴 Red: Critical tsunami alert (200km danger zone)

#### Time Display
- **Current Time**: Shows elapsed time since earthquake (HH:MM:SS)
- **Progress Bar**: Visual representation of simulation progress
- **Event Information**: Current event name and magnitude

### Technical Details

#### Wave Propagation Model
- **Speed**: ~200 m/s in deep ocean (~12 km/minute)
- **Distance Calculation**: Great circle distance from epicenter
- **Arrival Time**: Based on distance and wave speed
- **Intensity**: Decreases with distance from epicenter

#### Simulation Accuracy
- **Primary Wave**: Main tsunami front (red dashed line)
- **Secondary Wave**: Slower following wave (orange dashed line)
- **Buoy Response**: Realistic wave height simulation based on distance
- **Alert Thresholds**: Graduated response system

## Keyboard Shortcuts
- **Spacebar**: Play/Pause toggle
- **R**: Restart simulation
- **S**: Stop simulation
- **← →**: Seek backward/forward by 1 minute
- **Shift + ← →**: Seek backward/forward by 5 minutes
- **1-7**: Set playback speed (0.25x to 16x)

## Data Sources
- **Earthquake Data**: USGS Earthquake Catalog
- **Buoy Network**: NOAA NDBC Pacific Ocean stations
- **Wave Propagation**: Simplified physics model for demonstration

## Performance Notes
- **Smooth Animation**: 100ms update intervals for fluid visualization
- **Memory Efficient**: Subscription-based state management
- **Responsive**: Real-time updates without blocking UI
- **Cached Data**: Improved performance with integrated caching system

## Future Enhancements
- Additional historical events
- More sophisticated wave propagation models
- Real-time earthquake integration
- Export simulation data
- Custom scenario creation

---

*For technical support or feature requests, please refer to the main project documentation.*
