#!/bin/bash

# Script to prepare resources for Electron build

# Set colors for better output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${YELLOW}Preparing resources for Electron build...${NC}"

# Step 1: Ensure backend dependencies are installed
echo -e "${GREEN}Installing backend dependencies...${NC}"
cd "$BACKEND_DIR"
npm install
BACKEND_STATUS=$?

if [ $BACKEND_STATUS -ne 0 ]; then
  echo -e "${RED}Backend dependency installation failed with exit code $BACKEND_STATUS${NC}"
  exit $BACKEND_STATUS
fi

# Step 2: Copy backend files to electron build directory
echo -e "${GREEN}Copying backend files...${NC}"
mkdir -p "$SCRIPT_DIR/resources/backend"
cp -R "$BACKEND_DIR"/* "$SCRIPT_DIR/resources/backend/"

# Create uploads directory
mkdir -p "$SCRIPT_DIR/resources/backend/uploads"

# Remove node_modules from the copied files (they'll be installed in the build process)
rm -rf "$SCRIPT_DIR/resources/backend/node_modules"

# Step 3: Copy frontend build files
echo -e "${GREEN}Copying frontend build files...${NC}"
if [ ! -d "$FRONTEND_DIR/out" ]; then
  echo -e "${RED}Frontend build directory not found. Please run the build-mac-app.sh script first.${NC}"
  exit 1
fi

mkdir -p "$SCRIPT_DIR/resources/frontend"
cp -R "$FRONTEND_DIR/out"/* "$SCRIPT_DIR/resources/frontend/"

echo -e "${GREEN}Resources prepared successfully!${NC}"
