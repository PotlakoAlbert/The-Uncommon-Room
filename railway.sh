#!/bin/bash

# Railway deployment script
echo "Starting Railway deployment..."

# Install dependencies
npm install

# Build the server
echo "Building server..."
npm run build:server

# Start the application
echo "Starting application..."
npm start