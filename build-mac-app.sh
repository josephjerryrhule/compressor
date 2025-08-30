#!/bin/bash

# Build script for creating the Mac application

# Set colors for better output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}Starting Media Compressor Mac App build process...${NC}"

# Step 1: Build the frontend (static export)
echo -e "${GREEN}Step 1: Building frontend...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run build
FRONTEND_STATUS=$?

if [ $FRONTEND_STATUS -ne 0 ]; then
  echo -e "${RED}Frontend build failed with exit code $FRONTEND_STATUS${NC}"
  exit $FRONTEND_STATUS
fi

echo -e "${GREEN}Frontend built successfully!${NC}"

# Step 2: Set up the Electron app
echo -e "${GREEN}Step 2: Setting up Electron app...${NC}"
cd "$SCRIPT_DIR/electron"

if [ ! -d "node_modules" ]; then
  echo "Installing Electron dependencies..."
  npm install
  ELECTRON_INSTALL_STATUS=$?
  
  if [ $ELECTRON_INSTALL_STATUS -ne 0 ]; then
    echo -e "${RED}Electron dependency installation failed with exit code $ELECTRON_INSTALL_STATUS${NC}"
    exit $ELECTRON_INSTALL_STATUS
  fi
fi

# Step 3: Check icon file
echo -e "${GREEN}Step 3: Checking app icon...${NC}"
if [ ! -f "$SCRIPT_DIR/electron/icons/icon.png" ]; then
  echo -e "${YELLOW}Warning: No icon.png file found. Downloading a default icon...${NC}"
  mkdir -p "$SCRIPT_DIR/electron/icons"
  curl -o "$SCRIPT_DIR/electron/icons/icon.png" "https://cdn-icons-png.flaticon.com/512/9795/9795432.png"
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to download icon. The app will use the default Electron icon.${NC}"
  else
    echo -e "${GREEN}Default icon downloaded successfully.${NC}"
  fi
else
  echo -e "${GREEN}Icon file found.${NC}"
fi

# Step 4: Prepare resources for the build
echo -e "${GREEN}Step 4: Preparing resources...${NC}"
cd "$SCRIPT_DIR/electron"
chmod +x prepare-resources.sh
./prepare-resources.sh
PREPARE_STATUS=$?

if [ $PREPARE_STATUS -ne 0 ]; then
  echo -e "${RED}Resource preparation failed with exit code $PREPARE_STATUS${NC}"
  exit $PREPARE_STATUS
fi

# Step 5: Build the Electron app
echo -e "${GREEN}Step 5: Building Mac application...${NC}"
npm run build
BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo -e "${RED}Build failed with exit code $BUILD_STATUS${NC}"
  exit $BUILD_STATUS
fi

echo -e "${GREEN}Mac application built successfully!${NC}"
echo -e "${YELLOW}Your application can be found in electron/dist/mac${NC}"
echo -e "${YELLOW}To install, drag the application to your Applications folder.${NC}"
