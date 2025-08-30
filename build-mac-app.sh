#!/bin/bash

# Build script for creating the Mac application

# Set colors for better output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${YELLOW}Starting Media Compressor Mac App build process...${NC}"

# Step 1: Build the frontend (static export)
echo -e "${GREEN}Step 1: Building frontend...${NC}"
cd "$(dirname "$0")/frontend"
npm run build
FRONTEND_STATUS=$?

if [ $FRONTEND_STATUS -ne 0 ]; then
  echo -e "${RED}Frontend build failed with exit code $FRONTEND_STATUS${NC}"
  exit $FRONTEND_STATUS
fi

echo -e "${GREEN}Frontend built successfully!${NC}"

# Step 2: Set up the Electron app
echo -e "${GREEN}Step 2: Setting up Electron app...${NC}"
cd "$(dirname "$0")/electron"

if [ ! -d "node_modules" ]; then
  echo "Installing Electron dependencies..."
  npm install
  ELECTRON_INSTALL_STATUS=$?
  
  if [ $ELECTRON_INSTALL_STATUS -ne 0 ]; then
    echo -e "${RED}Electron dependency installation failed with exit code $ELECTRON_INSTALL_STATUS${NC}"
    exit $ELECTRON_INSTALL_STATUS
  fi
fi

# Step 3: Check if icon file exists, create placeholder if not
if [ ! -f "icons/icon.icns" ]; then
  echo -e "${YELLOW}Warning: No icon.icns file found. Using default icon.${NC}"
  # We would create a default icon here in a real scenario
fi

# Step 4: Build the Electron app
echo -e "${GREEN}Step 3: Building Mac application...${NC}"
npm run build
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo -e "${RED}Build failed with exit code $BUILD_STATUS${NC}"
  exit $BUILD_STATUS
fi

echo -e "${GREEN}Mac application built successfully!${NC}"
echo -e "${YELLOW}Your application can be found in electron/dist/mac${NC}"
