#!/bin/bash

# Script to test the production build locally

echo "Building for production..."
cd "$(dirname "$0")"
npm run build

echo "Testing the static build..."
cd out
npx serve -s

echo "Use Ctrl+C to exit the test server"
