// Memory management helper for Electron app
// This script helps prevent trace trap errors by optimizing memory usage

/**
 * This module implements strategies to prevent trace trap errors in Electron apps
 * without using the unsupported --no-flush-bytecode flag.
 * 
 * Alternative strategies include:
 * 1. Setting larger heap size limits
 * 2. Explicit garbage collection
 * 3. Avoiding large JSON parse/stringify operations
 * 4. Managing GPU resources carefully
 * 5. Proper handling of IPC communication
 */

const { app } = require('electron');
const log = require('electron-log');

// Configure logging if not already done
if (!log.transports.file.level) {
  log.transports.file.level = 'debug';
  log.transports.console.level = 'debug';
}

/**
 * Apply memory optimization settings to the Electron app
 */
function applyMemoryOptimizations() {
  log.info('Applying memory optimizations to prevent memory errors');

  // Prevent NSAlert crashes on macOS
  if (process.platform === 'darwin') {
    process.env.ELECTRON_DISABLE_SANDBOX = '1';
    app.disableDomainBlockingFor3DAPIs();
  }
  
  // Set larger memory limits to prevent out-of-memory issues
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
  
  // Expose garbage collection API to enable manual GC
  app.commandLine.appendSwitch('js-flags', '--expose-gc');
  
  // Disable hardware acceleration which can cause segfaults
  app.disableHardwareAcceleration();
  
  // Disable GPU features that might cause stability issues
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  
  // Safer content security settings
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  
  // Allow v8 more breathing room with memory
  if (process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS += ' --max-old-space-size=4096';
  } else {
    process.env.NODE_OPTIONS = '--max-old-space-size=4096';
  }
  
  // Schedule periodic garbage collection
  setupPeriodicGC();
  
  log.info('Memory optimizations applied successfully');
}

/**
 * Schedule periodic garbage collection to avoid memory buildup
 */
function setupPeriodicGC() {
  if (global.gc) {
    log.info('Garbage collection is available - scheduling periodic GC');
    
    // Run garbage collection every minute
    const intervalId = setInterval(() => {
      try {
        global.gc();
        log.debug('Forced garbage collection executed');
      } catch (err) {
        log.error('Error during forced garbage collection:', err);
      }
    }, 60000);
    
    // Make sure we clean up when app quits
    app.on('quit', () => {
      clearInterval(intervalId);
    });
  } else {
    log.warn('Garbage collection API not available. Start app with --expose-gc flag for better memory management');
  }
}

/**
 * Monitor memory usage and log it periodically
 */
function monitorMemoryUsage() {
  const intervalId = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    log.info('Memory usage:', {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    });
  }, 300000); // Every 5 minutes
  
  // Clean up on app quit
  app.on('quit', () => {
    clearInterval(intervalId);
  });
}

/**
 * Apply best practices to prevent memory leaks and trace trap errors
 */
function setupErrorHandling() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
  });
  
  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  // Clean up resources when windows are closed
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

module.exports = {
  applyMemoryOptimizations,
  setupPeriodicGC,
  monitorMemoryUsage,
  setupErrorHandling
};
