const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn, execSync } = require('child_process');
const express = require('express');
const http = require('http');
const os = require('os');

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
};

// Function to start the backend server
function startBackendServer() {
  const backendPath = isDev 
    ? path.join(__dirname, '..', 'backend')
    : path.join(process.resourcesPath, 'backend');
  
  console.log(`Starting backend server from: ${backendPath}`);
  
  // Make sure the uploads directory exists
  const uploadsDir = path.join(backendPath, 'uploads');
  fs.ensureDirSync(uploadsDir);
  
  // Log additional info for troubleshooting
  console.log('Uploads directory:', uploadsDir);
  console.log('Directory exists:', fs.existsSync(uploadsDir));
  try {
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    console.log('Directory is writable: true');
  } catch (err) {
    console.log('Directory is writable: false', err);
  }

  // Start the backend server
  const serverPath = path.join(backendPath, 'server.js');
  console.log(`Server script path: ${serverPath}`);
  console.log(`Server script exists: ${fs.existsSync(serverPath)}`);
  
  backendProcess = spawn('node', [serverPath], {
    cwd: backendPath,
    env,
    stdio: 'pipe', // Capture output for debugging
  });
  
  // Log backend output for debugging
  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });
  
  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
    dialog.showErrorBox(
      'Backend Error', 
      `Failed to start the backend server: ${err.message}`
    );
  });
  
  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (code !== 0) {
      dialog.showErrorBox(
        'Backend Error', 
        `The backend server crashed with code ${code}. The application may not function correctly.`
      );
    }
  });
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Media Compressor',
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
  }
});
