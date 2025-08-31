#!/bin/bash
# Script to prepare deployment for Hostinger

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparing Media Compressor for Hostinger deployment...${NC}"

# Navigate to frontend directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install it before proceeding.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Build the application
echo -e "${YELLOW}Building the application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Please check the errors above.${NC}"
    exit 1
fi

# Create a deployment zip file
echo -e "${YELLOW}Creating deployment zip file...${NC}"
cd out
zip -r ../hostinger-deployment.zip .
cd ..

echo -e "${GREEN}Deployment preparation complete!${NC}"
echo -e "${GREEN}The file 'hostinger-deployment.zip' is ready to be uploaded to Hostinger.${NC}"
echo -e "${YELLOW}Follow the instructions in HOSTINGER_DEPLOYMENT.md to complete the deployment.${NC}"
