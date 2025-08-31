const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, execSync } = require('child_process');
const express = require('express');
const http = require('http');
const os = require('os');
const log = require('electron-log');
const memoryOptimizer = require('./memory-optimizer');

// Configure logging
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('Application starting...');

// Override console logging to use electron-log
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
console.info = log.info;
console.debug = log.debug;

// Apply critical fixes for trace trap errors and segmentation faults
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.allowRendererProcessReuse = false;

// Initialize V8 memory handling before anything else
process.env.ELECTRON_DISABLE_GPU_SANDBOX = 'true';
process.env.ELECTRON_DISABLE_GPU_COMPOSITING = 'true';

// Set up scheduled garbage collection
if (global.gc) {
  log.info('Garbage collection is available, setting up scheduled GC');
  setInterval(() => {
    try {
      const before = process.memoryUsage().heapUsed / 1024 / 1024;
      global.gc();
      const after = process.memoryUsage().heapUsed / 1024 / 1024;
      log.info(`Garbage collection completed: ${Math.round(before - after)} MB freed`);
    } catch (error) {
      log.error('Error during garbage collection:', error);
    }
  }, 60000); // Run every minute
}

// Monitor memory usage
setInterval(() => {
  try {
    const memUsage = process.memoryUsage();
    log.info(`Memory usage: RSS ${Math.round(memUsage.rss / 1024 / 1024)} MB, ` +
             `Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}/${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);
  } catch (error) {
    log.error('Error during memory monitoring:', error);
  }
}, 300000); // Check every 5 minutes

// Prevent Electron from crashing when there's an uncaught exception
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Don't attempt to show dialog for SIGSEGV or other critical errors
  // as this could cause a crash loop
  if (error.code !== 'SIGSEGV') {
    try {
      dialog.showErrorBox(
        'Application Error',
        `An unexpected error occurred: ${error.message}\n\nThe application will try to continue.`
      );
    } catch (dialogError) {
      console.error('Failed to show error dialog:', dialogError);
    }
  } else {
    console.error('SIGSEGV detected, avoiding dialog to prevent crash loop');
  }
});

// Set up handlers for common crash signals
const criticalSignals = ['SIGABRT', 'SIGBUS', 'SIGILL', 'SIGFPE', 'SIGTRAP'];
criticalSignals.forEach(signal => {
  try {
    process.on(signal, () => {
      log.error(`Received ${signal} - attempting to log and recover`);
      
      // Force garbage collection to free memory
      if (global.gc) {
        log.info('Forcing garbage collection after signal');
        global.gc();
      }
      
      log.error(`${signal} handler completed, process will exit safely`);
    });
    log.info(`Registered handler for ${signal}`);
  } catch (err) {
    log.warn(`Could not register handler for ${signal}:`, err);
  }
});

// Capture and log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Apply memory optimizations to prevent memory errors
memoryOptimizer.applyMemoryOptimizations();
memoryOptimizer.monitorMemoryUsage();

// Prevent Electron from crashing when there's an uncaught exception
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Don't attempt to show dialog for SIGSEGV or other critical errors
  // as this could cause a crash loop
  if (error.code !== 'SIGSEGV') {
    try {
      dialog.showErrorBox(
        'Application Error',
        `An unexpected error occurred: ${error.message}\n\nThe application will try to continue.`
      );
    } catch (dialogError) {
      console.error('Failed to show error dialog:', dialogError);
    }
  } else {
    console.error('SIGSEGV detected, avoiding dialog to prevent crash loop');
  }
});

// Capture and log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Apply memory optimizations to prevent memory errors
memoryOptimizer.applyMemoryOptimizations();
memoryOptimizer.monitorMemoryUsage();

// Determine if we're in development or production
const isDev = !app.isPackaged;

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;
let backendProcess;
let serverPort = 4000;
let frontendPort = 3456; // Custom port for the frontend in production

// Environment variables needed for the backend
const env = {
  ...process.env,
  PORT: serverPort.toString(),
  NODE_OPTIONS: '--max-old-space-size=4096',
};

// Function to start the backend server
function startBackendServer() {
  const backendPath = isDev 
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend');
  
  log.info(`Starting backend server from: ${backendPath}`);
  
  // Create a writable uploads directory within the user's data directory for production
  let uploadsDir;
  if (isDev) {
    uploadsDir = path.join(backendPath, 'uploads');
  } else {
    // In production, use the app's user data directory
    const userDataPath = app.getPath('userData');
    uploadsDir = path.join(userDataPath, 'uploads');
    
    // Set the environment variable for the backend to use
    env.UPLOADS_DIR = uploadsDir;
  }
  
  fs.ensureDirSync(uploadsDir);
  
  // Log additional info for troubleshooting
  log.info('Uploads directory:', uploadsDir);
  log.info('Directory exists:', fs.existsSync(uploadsDir));
  try {
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    log.info('Directory is writable: true');
  } catch (err) {
    log.error('Directory is writable: false', err);
    // Try to correct permissions
    try {
      fs.chmodSync(uploadsDir, 0o755);
      log.info('Changed directory permissions');
    } catch (permErr) {
      log.error('Failed to change directory permissions:', permErr);
    }
  }

  // Handle ffmpeg path for packaged app
  if (!isDev) {
    const ffmpegSource = path.join(process.resourcesPath, 'ffmpeg');
    log.info(`Checking for bundled ffmpeg at: ${ffmpegSource}`);
    
    if (fs.existsSync(ffmpegSource)) {
      try {
        // Make sure it's executable
        fs.chmodSync(ffmpegSource, 0o755);
        log.info('Made ffmpeg executable');
      } catch (err) {
        log.warn('Failed to set ffmpeg permissions:', err.message);
      }
    } else {
      log.warn('Bundled ffmpeg not found at:', ffmpegSource);
    }
  }

  // Check if node_modules exists in backend directory
  const nodeModulesPath = path.join(backendPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath) && !isDev) {
    log.info('Installing backend dependencies...');
    try {
      // Create a temporary package.json if it doesn't exist
      const packageJsonPath = path.join(backendPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        log.info('Creating package.json for backend');
        fs.writeFileSync(packageJsonPath, JSON.stringify({
          "name": "compressor-backend",
          "version": "1.0.0",
          "main": "server.js",
          "dependencies": {
            "archiver": "^7.0.1",
            "cors": "^2.8.5",
            "express": "^4.18.2",
            "ffmpeg-static": "^5.2.0",
            "multer": "^2.0.2",
            "sharp": "^0.34.3"
          }
        }, null, 2));
      }
      
      // Install dependencies
      log.info('Running npm install in backend directory');
      execSync('npm install', {
        cwd: backendPath,
        stdio: 'inherit'
      });
      log.info('Backend dependencies installed successfully.');
    } catch (err) {
      log.error('Failed to install backend dependencies:', err);
      dialog.showErrorBox(
        'Backend Error', 
        `Failed to install backend dependencies: ${err.message}`
      );
    }
  }

  // Start the backend server
  const serverPath = path.join(backendPath, 'server.js');
  log.info(`Server script path: ${serverPath}`);
  log.info(`Server script exists: ${fs.existsSync(serverPath)}`);
  
  // Use a more robust approach for spawn
  try {
    // Set max old space size for Node.js to prevent memory issues
    backendProcess = spawn('node', ['--max-old-space-size=4096', serverPath], {
      cwd: backendPath,
      env,
      stdio: 'pipe', // Capture output for debugging
    });
    
    if (!backendProcess) {
      throw new Error('Failed to create backend process');
    }
    
    log.info('Backend process started with pid:', backendProcess.pid);
    
    // Log backend output for debugging
    backendProcess.stdout.on('data', (data) => {
      log.info(`Backend stdout: ${data}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      log.error(`Backend stderr: ${data}`);
    });
    
    backendProcess.on('error', (err) => {
      log.error('Failed to start backend process:', err);
      dialog.showErrorBox(
        'Backend Error', 
        `Failed to start the backend server: ${err.message}`
      );
    });
    
    backendProcess.on('close', (code) => {
      log.info(`Backend process exited with code ${code}`);
      if (code !== 0) {
        dialog.showErrorBox(
          'Backend Error', 
          `The backend server crashed with code ${code}. The application may not function correctly.`
        );
      }
    });
  } catch (err) {
    log.error('Exception starting backend process:', err);
    dialog.showErrorBox(
      'Backend Error', 
      `Exception starting backend process: ${err.message}`
    );
  }
}

  // Set up proxy for API requests when in production (Electron)
  if (!isDev) {
    // Create a simple Express server for the frontend
    const frontendApp = express();
    
    // Proxy API requests to the backend
    frontendApp.use('/api', (req, res, next) => {
      const backendUrl = `http://localhost:${serverPort}${req.url}`;
      console.log(`Proxying API request: ${req.url} to ${backendUrl}`);
      
      // Create proxy request
      const proxyReq = http.request(
        backendUrl,
        {
          method: req.method,
          headers: req.headers
        },
        (proxyRes) => {
          // Copy status code
          res.statusCode = proxyRes.statusCode;
          
          // Copy headers
          Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
          });
          
          // Pipe response
          proxyRes.pipe(res);
        }
      );
      
      // Forward request body
      req.pipe(proxyReq);
      
      // Handle errors
      proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err);
        res.statusCode = 500;
        res.end('Proxy Error');
      });
    });
    
    // Serve static frontend files
    frontendApp.use(express.static(path.join(process.resourcesPath, 'frontend')));
    
    // Handle other routes by serving index.html
    frontendApp.get('*', (req, res) => {
      res.sendFile(path.join(process.resourcesPath, 'frontend', 'index.html'));
    });
    
    // Start the frontend server
    frontendApp.listen(frontendPort, () => {
      console.log(`Frontend server running on port ${frontendPort}`);
    });
  }

// Create the browser window
function createWindow() {
  // Safeguard against segmentation faults by setting up proper memory limits
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc');
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  app.allowRendererProcessReuse = false;
  
  // macOS specific workarounds to prevent crashes
  if (process.platform === 'darwin') {
    // Disable hardware acceleration on macOS to prevent GPU-related crashes
    app.disableHardwareAcceleration();
    
    // Ensure app is visible in dock
    app.dock.show();
    
    // Disable GPU sandbox for better stability on macOS
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    
    // Additional macOS stability settings
    app.commandLine.appendSwitch('no-sandbox');
    
    log.info('Applied macOS-specific stability settings');
  }

  // Force garbage collection before creating a new window
  if (global.gc) {
    global.gc();
  }

  // Create the window with optimized settings
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Prevent memory leaks and crashes
      sandbox: true,
      javascript: true,
      backgroundThrottling: false,
      webgl: false
    },
    title: 'Media Compressor',
    // Improve performance and reduce crash potential
    show: false, // Don't show until content is ready
    // macOS specific settings
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    // Enable macOS native look and feel
    backgroundColor: '#00000000'
  });

  // Wait for content to be ready before showing to avoid white flash and potential timing issues
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Monitor renderer process for crashes and handle gracefully
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error(`Renderer process gone: ${details.reason}`);
    if (details.reason === 'crashed' || details.reason === 'killed') {
      dialog.showErrorBox(
        'Application Error',
        'The application encountered a problem and needs to restart.'
      );
      // Recreate window on crash
      mainWindow = null;
      createWindow();
    }
  });

  // Load the app
  if (isDev) {
    // In development, load from the Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from our static server
    mainWindow.loadURL(`http://localhost:${frontendPort}`);
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App ready event
app.whenReady().then(() => {
  // Start the backend server
  startBackendServer();
  
  // Create the main window
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up when the app is quitting
app.on('quit', () => {
  if (backendProcess) {
    console.log('Killing backend process...');
    backendProcess.kill();
  }
});

// Handle app activation (macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    // If window exists but is minimized, restore it
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    // Make sure window is visible and focused
    mainWindow.show();
    mainWindow.focus();
    
    // Make sure app is in dock (macOS specific)
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  }
});

// Handle macOS dock icon clicks
app.on('browser-window-created', () => {
  if (process.platform === 'darwin') {
    app.dock.show();
  }
});
