#!/bin/bash

# Script to ensure all dependencies are installed correctly

echo "Checking and installing backend dependencies..."

# Check for Sharp dependency which often has issues
if ! npm list sharp > /dev/null 2>&1; then
  echo "⚠️  Sharp not found or not installed correctly. Reinstalling..."
  npm install sharp --force
else
  echo "✅ Sharp is installed."
fi

# Check for FFmpeg dependency
if ! npm list ffmpeg-static > /dev/null 2>&1; then
  echo "⚠️  ffmpeg-static not found. Installing..."
  npm install ffmpeg-static --save
else
  echo "✅ ffmpeg-static is installed."
fi

# Check for other critical dependencies
dependencies=("express" "multer" "cors" "archiver")

for dep in "${dependencies[@]}"; do
  if ! npm list $dep > /dev/null 2>&1; then
    echo "⚠️  $dep not found. Installing..."
    npm install $dep --save
  else
    echo "✅ $dep is installed."
  fi
done

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install Electron dependencies for Mac app
echo "Installing Electron dependencies for Mac app..."
cd electron
npm install
cd ..

echo "All dependencies checked and installed."
echo "Now running server configuration check..."
node backend/check-server.js
