# Railway Deployment

This project is configured for deployment on Railway.

## Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

## Manual Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables if needed
3. Deploy automatically with Railway's build system

## Environment Variables

Currently no environment variables are required, but you can add:

- `NODE_ENV=production` (automatically set by Railway)
- `PORT` (automatically set by Railway)

## Build Process

Railway will automatically:
1. Install dependencies with `npm ci`
2. Build the Next.js application with `npm run build`
3. Compile the TypeScript utilities
4. Start the production server with `npm start`

## Features

- Automatic HTTPS
- Custom domains
- Environment management
- Zero-config deployment
- Automatic builds on git push
