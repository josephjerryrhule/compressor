# Media Compressor Mac App

This document explains how to build and run the Media Compressor as a native Mac application.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- macOS operating system

## Building the Mac Application

Follow these steps to build the application:

1. Make sure all dependencies are installed:
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   cd ../electron && npm install
   ```

2. Run the build script:
   ```bash
   ./build-mac-app.sh
   ```

   This script will:
   - Build the frontend with Next.js
   - Set up the Electron application
   - Package everything into a macOS .app file

3. When the build completes, you'll find the application in:
   ```
   electron/dist/mac/Media Compressor.app
   ```

4. You can also find a DMG installer at:
   ```
   electron/dist/Media Compressor-1.0.0.dmg
   ```

## Installing the Application

1. Copy the `Media Compressor.app` to your Applications folder, or
2. Open the DMG file and drag the application to your Applications folder

## Running the Application

- Launch the application from your Applications folder or Launchpad
- The application includes both the frontend UI and backend server in a single package
- All compression operations happen locally on your computer

## Troubleshooting

If you encounter issues:

1. Check the Console app for error logs
2. Make sure you have proper permissions for the application
3. Ensure your Mac's security settings allow the application to run

## App Icon

To customize the app icon:

1. Create a 1024x1024 PNG image for your icon
2. Convert it to .icns format using a tool like iconutil or an online converter
3. Replace the `electron/icons/icon.icns` file
4. Rebuild the application

## Additional Notes

- The application stores temporary files in the application's data directory
- Compressed files are saved to your chosen location
- All processing happens locally - no data is sent to external servers
