#!/bin/bash
# Simple script to run the app directly from the build location

APP_PATH="./electron/dist/mac-arm64/Media Compressor.app"

if [ ! -d "$APP_PATH" ]; then
  echo "Error: Application not found at $APP_PATH"
  echo "Did you build the application?"
  exit 1
fi

echo "Starting Media Compressor from $APP_PATH..."

# Create logs directory
mkdir -p "$HOME/Library/Logs/Media Compressor"

# Remove lock files (in case the app didn't close properly last time)
rm -f "$HOME/Library/Application Support/Media Compressor/Singleton Lock"
rm -f "$HOME/Library/Application Support/Media Compressor/SingletonLock" 
rm -f "$HOME/Library/Application Support/Media Compressor/SingletonCookie"

# Launch the app directly with debug flags
"$APP_PATH/Contents/MacOS/Media Compressor" \
  --enable-logging=stderr \
  --v=1 \
  --js-flags="--expose-gc --max-old-space-size=4096" \
  --disable-gpu-sandbox \
  --disable-gpu-vsync \
  > "$HOME/Library/Logs/Media Compressor/launch.log" 2>&1 &

echo "App launched in background. Check logs at: $HOME/Library/Logs/Media Compressor/launch.log"
echo "Run: tail -f $HOME/Library/Logs/Media Compressor/launch.log"
