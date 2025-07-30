#!/bin/bash
set -e

IMAGE_NAME="oceans-and-seas:latest"
CONTAINER_NAME="oceans-and-seas-app"
PORT=3000

# Build Docker image
docker build -t $IMAGE_NAME .

# Stop and remove any existing container
docker rm -f $CONTAINER_NAME || true

# Run the container
docker run -d --name $CONTAINER_NAME -p $PORT:3000 $IMAGE_NAME

echo "Deployment complete. App running on http://localhost:$PORT"
