#!/bin/bash
# Launch script for Media Compressor with debug options

# Find the app
APP_LOCATIONS=(
  "/Applications/Media Compressor.app"
  "$HOME/Applications/Media Compressor.app"
  "./electron/dist/mac/Media Compressor.app"
  "./electron/dist/mac-arm64/Media Compressor.app"
)

APP_PATH=""
for loc in "${APP_LOCATIONS[@]}"; do
  if [ -d "$loc" ]; then
    echo "Found app at: $loc"
    APP_PATH="$loc"
    break
  fi
done

if [ -z "$APP_PATH" ]; then
  echo "Application not found in standard locations."
  echo "Checking alternate locations..."
  
  # Try to install from DMG if it exists
  DMG_PATH="./electron/dist/Media Compressor-1.0.0-arm64.dmg"
  if [ -f "$DMG_PATH" ]; then
    echo "Found DMG installer at: $DMG_PATH"
    echo "Would you like to install the application? (y/n)"
    read -p "> " install_choice
    
    if [[ "$install_choice" == "y" ]]; then
      echo "Mounting DMG..."
      hdiutil attach "$DMG_PATH"
      echo "Please drag the application to your Applications folder, then press Enter"
      read -p "Press Enter when done..."
      hdiutil detach "/Volumes/Media Compressor 1.0.0"
      
      # Check if app was installed to Applications
      if [ -d "/Applications/Media Compressor.app" ]; then
        APP_PATH="/Applications/Media Compressor.app"
        echo "Application installed successfully!"
      fi
    fi
  fi
  
  if [ -z "$APP_PATH" ]; then
    echo "Could not find or install the application."
    exit 1
  fi
fi

# Remove lock files
rm -f "$HOME/Library/Application Support/Media Compressor/Singleton Lock"
rm -f "$HOME/Library/Application Support/Media Compressor/SingletonLock"
rm -f "$HOME/Library/Application Support/Media Compressor/SingletonCookie"
rm -f "$HOME/Library/Application Support/Media Compressor/.org.chromium.Chromium.ELF2jr"

# Create logs directory
mkdir -p "$HOME/Library/Logs/Media Compressor"

# Launch with debug flags
echo "Launching $APP_PATH with debug options..."
"$APP_PATH/Contents/MacOS/Media Compressor" \
  --enable-logging=stderr \
  --v=1 \
  --js-flags="--expose-gc --max-old-space-size=4096" \
  --disable-gpu-sandbox \
  --disable-gpu-vsync \
  > "$HOME/Library/Logs/Media Compressor/launch.log" 2>&1 &

echo "App launched in background. Check logs at: $HOME/Library/Logs/Media Compressor/launch.log"
echo "Run: tail -f $HOME/Library/Logs/Media Compressor/launch.log"
