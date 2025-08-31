#!/bin/bash

# Build and test the static website for Netlify deployment

echo "🔨 Building the production version..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix the errors and try again."
  exit 1
fi

echo "✅ Build successful!"
echo "🚀 Starting local server to test the build..."
echo "Press Ctrl+C to stop the server when done testing."

npx serve -s out
