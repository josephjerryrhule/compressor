#!/usr/bin/env node

/**
 * Enhanced Debug and Launch Helper for Media Compressor
 * 
 * This script helps diagnose and fix launch issues with the Media Compressor app.
 * Run it with: node launch-debug.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

console.log(`${colors.cyan}Media Compressor Launch Debugger${colors.reset}`);
console.log(`${colors.cyan}===============================${colors.reset}\n`);

// Get system info
console.log(`${colors.yellow}System Information:${colors.reset}`);
console.log(`OS: ${os.platform()} ${os.release()}`);
console.log(`Architecture: ${os.arch()}`);
console.log(`Node.js: ${process.version}`);
console.log(`Total Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
console.log(`Free Memory: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB\n`);

// Check application location
console.log(`${colors.yellow}Checking Application:${colors.reset}`);
const appLocations = [
  '/Applications/Media Compressor.app',
  path.join(os.homedir(), 'Applications/Media Compressor.app'),
  path.join(__dirname, 'electron/dist/mac/Media Compressor.app')
];

let appPath = null;
for (const location of appLocations) {
  if (fs.existsSync(location)) {
    appPath = location;
    console.log(`${colors.green}✓ Application found:${colors.reset} ${location}`);
    break;
  }
}

if (!appPath) {
  console.log(`${colors.red}✗ Application not found in standard locations${colors.reset}`);
  console.log(`  Please build the application or specify its location`);
} else {
  // Check for the executable
  const executablePath = path.join(appPath, 'Contents/MacOS/Media Compressor');
  if (fs.existsSync(executablePath)) {
    console.log(`${colors.green}✓ Executable found${colors.reset}`);
    
    // Check permissions
    try {
      fs.accessSync(executablePath, fs.constants.X_OK);
      console.log(`${colors.green}✓ Executable has correct permissions${colors.reset}`);
    } catch (err) {
      console.log(`${colors.red}✗ Executable lacks execute permissions${colors.reset}`);
      console.log(`  Fixing permissions...`);
      try {
        execSync(`chmod +x "${executablePath}"`);
        console.log(`${colors.green}✓ Permissions fixed${colors.reset}`);
      } catch (err) {
        console.log(`${colors.red}✗ Failed to fix permissions:${colors.reset} ${err.message}`);
      }
    }
  } else {
    console.log(`${colors.red}✗ Executable not found at:${colors.reset} ${executablePath}`);
  }
}

// Look for and remove potential lock files
console.log(`\n${colors.yellow}Checking for lock files:${colors.reset}`);
const userDataDir = path.join(os.homedir(), 'Library/Application Support/Media Compressor');
if (fs.existsSync(userDataDir)) {
  const lockFiles = [
    path.join(userDataDir, 'Singleton Lock'),
    path.join(userDataDir, 'SingletonLock'),
    path.join(userDataDir, 'SingletonCookie'),
    path.join(userDataDir, '.org.chromium.Chromium.ELF2jr'),
  ];
  
  let foundLockFiles = false;
  for (const lockFile of lockFiles) {
    if (fs.existsSync(lockFile)) {
      foundLockFiles = true;
      console.log(`${colors.yellow}Found lock file:${colors.reset} ${lockFile}`);
      try {
        fs.unlinkSync(lockFile);
        console.log(`${colors.green}✓ Removed lock file${colors.reset}`);
      } catch (err) {
        console.log(`${colors.red}✗ Failed to remove lock file:${colors.reset} ${err.message}`);
      }
    }
  }
  
  if (!foundLockFiles) {
    console.log(`${colors.green}✓ No lock files found${colors.reset}`);
  }
} else {
  console.log(`${colors.yellow}User data directory not found:${colors.reset} ${userDataDir}`);
}

// Check for and clean up crash dumps
console.log(`\n${colors.yellow}Checking for crash dumps:${colors.reset}`);
const crashDirectories = [
  path.join(os.homedir(), 'Library/Application Support/Media Compressor/Crashpad'),
  path.join(os.homedir(), 'Library/Application Support/CrashReporter'),
];

for (const crashDir of crashDirectories) {
  if (fs.existsSync(crashDir)) {
    console.log(`${colors.yellow}Found crash directory:${colors.reset} ${crashDir}`);
    // We don't delete crash reports automatically as they may be useful
    console.log(`  You may want to clean this directory if it contains many files`);
  }
}

// Check for backend server port usage
console.log(`\n${colors.yellow}Checking for port conflicts:${colors.reset}`);
try {
  const lsofOutput = execSync('lsof -i :4000').toString();
  console.log(`${colors.red}✗ Port 4000 is in use:${colors.reset}`);
  console.log(lsofOutput);
  console.log(`  This may prevent the app's backend server from starting`);
} catch (err) {
  // If lsof returns non-zero, it means no process is using port 4000
  console.log(`${colors.green}✓ Port 4000 is available${colors.reset}`);
}

// Ask the user if they want to attempt to start the app
console.log(`\n${colors.cyan}Would you like to attempt to start the application with debugging?${colors.reset}`);
console.log(`1. Start app with normal logging (y/n)?`);

// Since we can't have interactive input in VS Code, we'll provide commands to run
console.log(`\n${colors.cyan}Run these commands in your terminal to launch with debugging:${colors.reset}`);

if (appPath) {
  console.log(`\n${colors.green}Start with basic logging:${colors.reset}`);
  console.log(`open -a "${appPath}" --args --enable-logging=stderr --v=1`);
  
  console.log(`\n${colors.green}Start with advanced memory debugging:${colors.reset}`);
  console.log(`open -a "${appPath}" --args --enable-logging=stderr --v=1 --js-flags="--expose-gc --max-old-space-size=4096" --disable-gpu-sandbox --disable-gpu-vsync`);
  
  console.log(`\n${colors.green}Launch directly from terminal for full console output:${colors.reset}`);
  console.log(`"${path.join(appPath, 'Contents/MacOS/Media Compressor')}" --enable-logging=stderr --v=1`);
} else {
  console.log(`${colors.red}Cannot provide launch commands because application path is unknown.${colors.reset}`);
}

// Create helper script for easy launching
console.log(`\n${colors.yellow}Creating launch helper script...${colors.reset}`);
const launchScriptPath = path.join(__dirname, 'launch-app.sh');
const launchScriptContent = `#!/bin/bash
# Launch script for Media Compressor with debug options

# Find the app
APP_LOCATIONS=(
  "/Applications/Media Compressor.app"
  "$HOME/Applications/Media Compressor.app"
  "./electron/dist/mac/Media Compressor.app"
)

APP_PATH=""
for loc in "\${APP_LOCATIONS[@]}"; do
  if [ -d "$loc" ]; then
    APP_PATH="$loc"
    break
  fi
done

if [ -z "$APP_PATH" ]; then
  echo "Application not found in standard locations."
  exit 1
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
"$APP_PATH/Contents/MacOS/Media Compressor" \\
  --enable-logging=stderr \\
  --v=1 \\
  --js-flags="--expose-gc --max-old-space-size=4096" \\
  --disable-gpu-sandbox \\
  --disable-gpu-vsync \\
  > "$HOME/Library/Logs/Media Compressor/launch.log" 2>&1 &

echo "App launched in background. Check logs at: $HOME/Library/Logs/Media Compressor/launch.log"
echo "Run: tail -f $HOME/Library/Logs/Media Compressor/launch.log"
`;

try {
  fs.writeFileSync(launchScriptPath, launchScriptContent);
  fs.chmodSync(launchScriptPath, 0o755);
  console.log(`${colors.green}✓ Created launch script at:${colors.reset} ${launchScriptPath}`);
  console.log(`  Run it with: ./launch-app.sh`);
} catch (err) {
  console.log(`${colors.red}✗ Failed to create launch script:${colors.reset} ${err.message}`);
}

console.log(`\n${colors.cyan}Debug Helper Complete${colors.reset}`);
console.log(`If you're still experiencing issues after trying these solutions, check the logs at:`);
console.log(`~/Library/Logs/Media Compressor/`);
