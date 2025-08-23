#!/bin/bash

# PolyHarmony Docker Deployment Script

set -e

echo "🚀 Starting PolyHarmony deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Build the production image
echo "📦 Building production Docker image..."
docker-compose build app

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start the application
echo "▶️  Starting PolyHarmony application..."
docker-compose up -d app

# Wait for the application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 10

# Check if the application is healthy
echo "🏥 Checking application health..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy and running!"
    echo "🌐 Access your application at: http://localhost:3000"
else
    echo "❌ Application health check failed. Check logs with: docker-compose logs app"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
