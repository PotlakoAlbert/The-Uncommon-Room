#!/bin/sh

# Build the API
npm run build:server

# Create static directory in api folder if it doesn't exist
mkdir -p api/static

# Build the client
cd client
npm install
npm run build

# Copy client build to api/static
cp -r dist/* ../api/static/

echo "Build completed. Files are organized in api/ directory"