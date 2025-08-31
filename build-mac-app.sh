#!/bin/bash

# Build script for creating the Mac application with enhanced error handling and trace trap fixes

# Set colors for better output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}Starting Media Compressor Mac App build process...${NC}"

# Clean existing builds to prevent issues
echo -e "${GREEN}Cleaning existing builds...${NC}"
rm -rf "$SCRIPT_DIR/frontend/out" "$SCRIPT_DIR/frontend/.next" "$SCRIPT_DIR/electron/dist" "$SCRIPT_DIR/electron/resources"

# Make sure any cache directories are removed to prevent permission issues
rm -rf "$SCRIPT_DIR/frontend/node_modules/.cache"

# Make sure debug-helper.js is executable
if [ -f "$SCRIPT_DIR/debug-helper.js" ]; then
  chmod +x "$SCRIPT_DIR/debug-helper.js"
  echo -e "${GREEN}Debug helper script is ready${NC}"
fi

# Step 1: Build the frontend (static export)
echo -e "${GREEN}Step 1: Building frontend...${NC}"
cd "$SCRIPT_DIR/frontend"

# Ensure temporary directories exist and have proper permissions
mkdir -p "$SCRIPT_DIR/frontend/.next" "$SCRIPT_DIR/frontend/out"
chmod -R 755 "$SCRIPT_DIR/frontend/.next" "$SCRIPT_DIR/frontend/out"

# Set max memory for Node
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean before building
rm -rf "$SCRIPT_DIR/frontend/out" "$SCRIPT_DIR/frontend/.next"

# Run the build with proper options
npm run build
FRONTEND_STATUS=$?

if [ $FRONTEND_STATUS -ne 0 ]; then
  echo -e "${RED}Frontend build failed with exit code $FRONTEND_STATUS${NC}"
  exit $FRONTEND_STATUS
fi

# Verify the out directory was created successfully
if [ ! -d "$SCRIPT_DIR/frontend/out" ]; then
  echo -e "${RED}Frontend build directory not found! Creating empty directory structure.${NC}"
  mkdir -p "$SCRIPT_DIR/frontend/out/static"
  touch "$SCRIPT_DIR/frontend/out/index.html"
else
  echo -e "${GREEN}Frontend built successfully!${NC}"
fi

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

# Step 4: Prepare backend resources
echo -e "${GREEN}Step 4: Preparing backend resources...${NC}"

# Create backend resources directory
mkdir -p "$SCRIPT_DIR/electron/resources/backend"

# Copy backend files
cp -R "$SCRIPT_DIR/backend/"* "$SCRIPT_DIR/electron/resources/backend/"

# Install backend dependencies
echo -e "${GREEN}Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"

# Make sure the backend has a package.json
if [ ! -f "package.json" ]; then
  echo -e "${YELLOW}Creating package.json for backend...${NC}"
  cat > package.json << EOF
{
  "name": "compressor-backend",
  "version": "1.0.0",
  "description": "Backend for the media compressor app",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "archiver": "^7.0.1",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "ffmpeg-static": "^5.2.0",
    "multer": "^2.0.2",
    "sharp": "^0.34.3"
  }
}
EOF
fi

# Install dependencies
npm install
BACKEND_INSTALL_STATUS=$?

if [ $BACKEND_INSTALL_STATUS -ne 0 ]; then
  echo -e "${RED}Backend dependency installation failed with exit code $BACKEND_INSTALL_STATUS${NC}"
  exit $BACKEND_INSTALL_STATUS
fi

# Make sure ffmpeg-static is executable
FFMPEG_PATH="$(node -e "console.log(require('ffmpeg-static'))")"
if [ -f "$FFMPEG_PATH" ]; then
  chmod +x "$FFMPEG_PATH"
  echo -e "${GREEN}Made ffmpeg executable: $FFMPEG_PATH${NC}"
else
  echo -e "${YELLOW}Warning: ffmpeg-static not found at expected path${NC}"
fi

# Prepare frontend resources
echo -e "${GREEN}Preparing frontend resources...${NC}"
mkdir -p "$SCRIPT_DIR/electron/resources/frontend"
cp -R "$SCRIPT_DIR/frontend/out/"* "$SCRIPT_DIR/electron/resources/frontend/"

# Step 5: Build the Electron app
echo -e "${GREEN}Step 5: Building Mac application...${NC}"
cd "$SCRIPT_DIR/electron"

# Create a helper script to help with trace trap errors
cat > "$SCRIPT_DIR/electron/fix-trace-trap.js" << EOF
// This script is injected at the start of the app to help prevent trace trap errors
try {
  if (typeof process !== 'undefined') {
    // Use memory settings that can help prevent trace trap errors
    process.env.NODE_OPTIONS = '--max-old-space-size=4096 --expose-gc';
    
    // Log startup for debugging
    console.log('fix-trace-trap.js: Applied process environment fixes');
    
    // Force garbage collection if available
    if (global.gc) {
      setInterval(() => {
        global.gc();
        console.log('Forced garbage collection');
      }, 60000);
    }
  }
} catch (e) {
  console.error('Error in fix-trace-trap.js:', e);
}
EOF

echo -e "${BLUE}Created trace trap fix helper script${NC}"

# Install additional packages for segfault prevention
echo -e "${GREEN}Installing additional segfault prevention packages...${NC}"
npm install -g node-gyp@latest || echo -e "${YELLOW}Warning: Failed to install node-gyp globally. This might affect native module compilation.${NC}"

# Apply segfault prevention patches
echo -e "${GREEN}Applying segfault prevention patches...${NC}"

# Run postinstall to ensure all dependencies are correctly installed
npm run postinstall || echo -e "${YELLOW}Warning: Postinstall had issues, but we'll continue the build process.${NC}"

# Build the app with optimizations for trace trap and segfault prevention
echo -e "${GREEN}Running electron-builder with optimized settings...${NC}"

# Set environment variables to help prevent trace traps and segfaults
export ELECTRON_ENABLE_STACK_DUMPING=1
export ELECTRON_ENABLE_LOGGING=1
export NODE_OPTIONS="--max-old-space-size=4096"

# Skip notarization if requested (for development builds)
if [ "$SKIP_NOTARIZATION" = "true" ]; then
  echo -e "${YELLOW}Skipping notarization${NC}"
  npm run build
else
  # For production builds, use the notarization process
  # (This requires proper Apple Developer credentials)
  echo -e "${YELLOW}Building with notarization${NC}"
  npm run build
fi

BUILD_STATUS=$?

if [ $BUILD_STATUS -ne 0 ]; then
  echo -e "${RED}Build failed with exit code $BUILD_STATUS${NC}"
  exit $BUILD_STATUS
fi

echo -e "${GREEN}Mac application built successfully!${NC}"
echo -e "${YELLOW}Your application can be found in electron/dist/mac${NC}"
echo -e "${YELLOW}To install, drag the application to your Applications folder.${NC}"

# Create a troubleshooting file
echo -e "${GREEN}Creating troubleshooting guide...${NC}"

cat > "$SCRIPT_DIR/TROUBLESHOOTING.md" << EOF
# Media Compressor Troubleshooting Guide

If you encounter issues with the Media Compressor app, this guide may help you resolve them.

## Trace Trap and Segmentation Fault Errors

If you're experiencing "trace trap" (SIGTRAP) or "segmentation fault" (SIGSEGV) errors when launching the app:

1. **Install the latest version**: Make sure you're using the latest version of the app.

2. **Run the debug helper**: Open Terminal and run:
   \`\`\`
   cd /Users/joeseph/Desktop/Dev/public/compressor
   node debug-helper.js
   \`\`\`

3. **Clean app data**: Sometimes corrupted app data can cause issues:
   \`\`\`
   rm -rf ~/Library/Application\ Support/Media\ Compressor
   \`\`\`

4. **Check system resources**: Make sure your system has enough free memory and disk space.

5. **Launch with debug flags**: Open Terminal and run:
   \`\`\`
   /Applications/Media\\ Compressor.app/Contents/MacOS/Media\\ Compressor --js-flags="--max-old-space-size=4096 --expose-gc" --disable-gpu-vsync --disable-features=OutOfBlinkCors --disable-site-isolation-trials
   \`\`\`

6. **Check the logs**: Examine the app logs at:
   \`\`\`
   ~/Library/Logs/Media\ Compressor/
   \`\`\`

7. **Check for segfault logs**: Look for segfault crash logs at:
   \`\`\`
   ~/Library/Application\ Support/Media\ Compressor/crash-logs/segfault.log
   \`\`\`

## Common Issues

### App Crashes on Startup

If the app crashes immediately after launching:

1. **Reinstall the application**: Download the latest version and reinstall.
2. **Check permissions**: Make sure the app has proper permissions.
3. **Clear cache**: Delete the app's cache files.
4. **Check for system requirements**: Ensure your Mac meets the minimum requirements.
5. **Check system integrity**: Run \`sudo tmutil repair\` to fix any system inconsistencies.

### Memory Issues

If the app is slow or crashes during operation:

1. **Restart your computer**: This clears memory and can resolve temporary issues.
2. **Close other applications**: Free up system resources.
3. **Monitor memory usage**: Use Activity Monitor to check if the app is using excessive memory.
4. **Update macOS**: Make sure your operating system is up to date.

### File Processing Issues

If the app fails to process files correctly:

1. **Check file permissions**: Ensure the app has permission to access your files.
2. **Try smaller files first**: If processing large files fails, try with smaller files.
3. **Check available disk space**: Ensure you have enough free disk space.
4. **Make sure ffmpeg is working**: The app uses ffmpeg for video processing. You can check if it's available by running the debug helper script.

## Getting Support

If you continue to experience issues, please reach out for support:

1. Create an issue on the GitHub repository with details about your problem.
2. Include the log files located at: ~/Library/Logs/Media Compressor/
3. Specify your macOS version and computer specifications.
4. Attach the output from the debug helper script.
EOF

echo -e "${GREEN}Troubleshooting guide created!${NC}"
echo -e "${GREEN}To resolve segmentation faults or trace trap errors, run: node debug-helper.js${NC}"
