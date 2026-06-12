#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")"

echo "Starting Deployment Process..."

# Determine environment (default: production)
ENV_NAME=${1:-production}
ENV_FILE=".env.${ENV_NAME}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    exit 1
fi

echo "Using environment configuration from $ENV_FILE"

# Ensure local data directories exist for bind mounts
mkdir -p data/redis

# Create docker network if it doesn't exist
docker network create linkedin-net 2>/dev/null || true

# Start Redis with bind mount
docker rm -f linkedin-autopost-redis 2>/dev/null || true
docker run -d --name linkedin-autopost-redis \
    --network linkedin-net \
    -p 6379:6379 \
    -v "$(pwd)/data/redis:/data" \
    redis:alpine

echo "Stopping old containers..."
docker rm -f linkedin-autopost-web linkedin-autopost-worker 2>/dev/null || true

echo "Building Application Images..."
# Build images
docker build --target web -t linkedin-autopost-web .
docker build --target worker -t linkedin-autopost-worker .

echo "Starting Application Containers..."
# Run Web
docker run -d --name linkedin-autopost-web \
    --network linkedin-net \
    --add-host=host.docker.internal:host-gateway \
    -p 4000:4000 \
    --env-file "$ENV_FILE" \
    -e REDIS_URL=redis://linkedin-autopost-redis:6379 \
    -e AUTH_TRUST_HOST=true \
    linkedin-autopost-web

# Run Worker
docker run -d --name linkedin-autopost-worker \
    --network linkedin-net \
    --add-host=host.docker.internal:host-gateway \
    --env-file "$ENV_FILE" \
    -e REDIS_URL=redis://linkedin-autopost-redis:6379 \
    linkedin-autopost-worker

echo "Deployment Complete! The application is running at http://localhost:4000 or https://linkedinpost.atanusroy.com"
