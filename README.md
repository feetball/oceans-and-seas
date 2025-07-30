# Ocean Buoy Tsunami Detection System

A real-time web application for monitoring ocean buoy water column height data to detect potential tsunamis. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Real-time Monitoring**: Live updates of ocean buoy data every 30 seconds
- **Interactive Map**: Visual representation of buoy locations with color-coded status indicators
- **Tsunami Detection**: Automated detection algorithm that monitors water column height changes
- **Alert System**: Real-time alerts for potential tsunami conditions
- **Detailed Analytics**: Comprehensive data panels showing buoy readings and historical data
- **Responsive Design**: Optimized for desktop and mobile viewing

## Tsunami Detection Algorithm

The system uses a simple but effective detection algorithm:
- Monitors the last 5 readings from each buoy
- Triggers alerts when water column height increases by more than 2 meters between consecutive readings
- Classifies alerts as:
  - **Medium**: 2-5 meter increase
  - **High**: >5 meter increase

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **API**: Next.js API Routes
- **Map Visualization**: Custom SVG-based mapping (can be upgraded to Leaflet/Mapbox)

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
