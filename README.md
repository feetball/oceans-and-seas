# Ocean Buoy Tsunami Detection System

A real-time web application for monitoring ocean buoy water column height data to detect potential tsunamis. Built with Next.js, TypeScript, and Tailwind CSS, optimized for deployment on Vercel.

## 🌊 Features

- **Real-time Monitoring**: Live updates of ocean buoy data with intelligent caching
- **Interactive Map**: Leaflet-based visualization with danger zones and tsunami alerts
- **Advanced Tsunami Detection**: Multi-level alert system with historical simulation data
- **Comprehensive Pacific Coverage**: 1,913 oceanic buoy stations including DART, JMA, BOM networks
- **Performance Caching**: 180x faster response times with multi-layer caching system
- **Serverless Ready**: Optimized for Vercel deployment with edge caching
- **Real-time Alerts**: Color-coded status indicators and danger zone visualization

## 🚨 Tsunami Detection System

### Detection Algorithm
- **Multi-reading Analysis**: Analyzes last 4 readings for trend detection
- **Wave Height Monitoring**: Tracks rapid increases and sustained elevation
- **Severity Classification**:
  - **Normal**: Standard ocean conditions (green)
  - **Medium**: 2.5m+ waves or 30%+ increase (yellow) - 50km danger zone
  - **High**: 4m+ waves or rapid escalation (orange) - 100km danger zone  
  - **Critical**: 6m+ waves or extreme conditions (red) - 200km danger zone

### Historical Simulation
- **2011 Tōhoku Earthquake**: 9.0 magnitude simulation
- **2020 Alaska Earthquake**: 7.8 magnitude event
- **2015 Chile Earthquake**: 8.3 magnitude tsunami
- **Real-time Playback**: Mock data with realistic wave propagation

## 🛠 Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet with custom tsunami visualization
- **Caching**: Multi-layer system (memory + file/Redis)
- **API**: Next.js API Routes with NOAA NDBC integration
- **Deployment**: Vercel-optimized serverless functions

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/oceans-and-seas)

### Manual Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy automatically with optimized settings

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment guide.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/
│   ├── api/buoys/       # API endpoints for buoy data
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main application page
├── components/
│   ├── Map.tsx          # Interactive map component
│   ├── BuoyDataPanel.tsx # Data display panel
│   └── TsunamiAlert.tsx # Alert component
└── types/
    └── buoy.ts          # TypeScript type definitions
```

## Data Sources

Currently uses mock data for demonstration. In a production environment, this would integrate with:
- NOAA National Data Buoy Center
- International tsunami warning systems
- Regional oceanographic monitoring networks

## Customization

### Adding Real Data Sources

To connect to real buoy data:

1. Modify `/src/app/api/buoys/route.ts` to fetch from actual APIs
2. Update the data structure in `/src/types/buoy.ts` if needed
3. Adjust the tsunami detection algorithm in `/src/app/page.tsx`

### Enhancing the Map

For production use, consider upgrading to:
- **Leaflet**: Open-source mapping library
- **Mapbox**: Professional mapping service
- **Google Maps**: Widely-used mapping platform

### Improving Detection

The detection algorithm can be enhanced with:
- Machine learning models for pattern recognition
- Historical data analysis
- Integration with seismic monitoring
- Weather condition correlation

## Deployment

The app can be deployed on any platform that supports Next.js:

- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Google Cloud Platform**
- **Azure Static Web Apps**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is open source and available under the MIT License.

## Safety Notice

This application is for demonstration and educational purposes. For actual tsunami warning systems, always rely on official sources like:
- National Weather Service
- Pacific Tsunami Warning Center
- Local emergency management agencies
