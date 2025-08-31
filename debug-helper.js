#!/usr/bin/env node

/**
 * Debug Helper for Media Compressor
 * 
 * This script helps diagnose issues with the Media Compressor app.
 * Run it with: node debug-helper.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

console.log(`${colors.cyan}Media Compressor Debug Helper${colors.reset}`);
console.log(`${colors.cyan}============================${colors.reset}\n`);

// Get system info
console.log(`${colors.yellow}System Information:${colors.reset}`);
console.log(`OS: ${os.platform()} ${os.release()}`);
console.log(`Architecture: ${os.arch()}`);
console.log(`Node.js: ${process.version}`);
console.log(`Total Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
console.log(`Free Memory: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB\n`);

// Check for ffmpeg installation
console.log(`${colors.yellow}Checking FFmpeg:${colors.reset}`);
try {
  const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
  console.log(`${colors.green}✓ FFmpeg found:${colors.reset} ${ffmpegVersion}`);
} catch (err) {
  console.log(`${colors.red}✗ FFmpeg not found in PATH${colors.reset}`);
  console.log(`Consider installing FFmpeg: brew install ffmpeg`);
}

// Check the ffmpeg-static package
try {
  const ffmpegStaticPath = require('ffmpeg-static');
  if (fs.existsSync(ffmpegStaticPath)) {
    console.log(`${colors.green}✓ ffmpeg-static is installed and valid at:${colors.reset} ${ffmpegStaticPath}`);
    
    // Check if executable
    try {
      fs.accessSync(ffmpegStaticPath, fs.constants.X_OK);
      console.log(`${colors.green}✓ ffmpeg-static is executable${colors.reset}`);
    } catch (err) {
      console.log(`${colors.red}✗ ffmpeg-static is not executable${colors.reset}`);
      console.log(`  Try: chmod +x ${ffmpegStaticPath}`);
    }
  } else {
    console.log(`${colors.red}✗ ffmpeg-static path exists but file is missing:${colors.reset} ${ffmpegStaticPath}`);
  }
} catch (err) {
  console.log(`${colors.red}✗ ffmpeg-static not installed${colors.reset}`);
  console.log(`  Run: npm install ffmpeg-static`);
}

console.log('\n');

// Check Electron version
console.log(`${colors.yellow}Checking Electron:${colors.reset}`);
try {
  const electronDir = path.join(__dirname, 'node_modules', 'electron');
  if (fs.existsSync(electronDir)) {
    const electronPackageJson = require(path.join(electronDir, 'package.json'));
    console.log(`${colors.green}✓ Electron installed:${colors.reset} v${electronPackageJson.version}`);
  } else {
    console.log(`${colors.red}✗ Electron not found in node_modules${colors.reset}`);
  }
} catch (err) {
  console.log(`${colors.red}✗ Error checking Electron:${colors.reset} ${err.message}`);
}

// Check Node.js memory limits
console.log(`\n${colors.yellow}Node.js Memory Configuration:${colors.reset}`);
try {
  const heapStatistics = process.memoryUsage();
  console.log(`Heap Used: ${Math.round(heapStatistics.heapUsed / (1024 * 1024))} MB`);
  console.log(`Heap Total: ${Math.round(heapStatistics.heapTotal / (1024 * 1024))} MB`);
  console.log(`RSS: ${Math.round(heapStatistics.rss / (1024 * 1024))} MB`);
  
  // Suggest NODE_OPTIONS for memory
  console.log(`\n${colors.cyan}Suggested NODE_OPTIONS:${colors.reset}`);
  console.log(`export NODE_OPTIONS="--max-old-space-size=4096 --no-flush-bytecode --expose-gc"`);
} catch (err) {
  console.log(`${colors.red}Error getting memory stats:${colors.reset} ${err.message}`);
}

// Check for Electron logs
console.log(`\n${colors.yellow}Checking for Electron Logs:${colors.reset}`);
const homeDir = os.homedir();
const possibleLogLocations = [
  path.join(homeDir, 'Library/Logs/Media Compressor'),
  path.join(homeDir, 'Library/Logs/media-compressor'),
  path.join(homeDir, 'Library/Application Support/Media Compressor/logs'),
  path.join(homeDir, '.config/media-compressor/logs'),
];

let logsFound = false;
for (const logPath of possibleLogLocations) {
  if (fs.existsSync(logPath)) {
    console.log(`${colors.green}✓ Logs found at:${colors.reset} ${logPath}`);
    logsFound = true;
    
    // List log files
    try {
      const logFiles = fs.readdirSync(logPath);
      if (logFiles.length > 0) {
        console.log(`  Log files: ${logFiles.join(', ')}`);
      } else {
        console.log(`  No log files found in directory`);
      }
    } catch (err) {
      console.log(`  Error reading log directory: ${err.message}`);
    }
  }
}

if (!logsFound) {
  console.log(`${colors.yellow}No Electron logs found in standard locations${colors.reset}`);
}

console.log(`\n${colors.cyan}Debug Helper Complete${colors.reset}`);
console.log(`If you're experiencing trace trap errors, try rebuilding with the following steps:`);
console.log(`1. Add memory flags to Electron in main.js`);
console.log(`2. Make sure ffmpeg is properly installed and executable`);
console.log(`3. Rebuild the app with: ./build-mac-app.sh`);
