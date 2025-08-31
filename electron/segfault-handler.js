/**
 * Segmentation Fault Handler for Electron
 *
 * This module helps prevent and recover from segmentation faults
 * that can occur in Electron applications, particularly
 * related to memory management and native modules.
 */

const log = require('electron-log');
let segfaultHandler;

try {
  // Try to load the segfault-handler module
  segfaultHandler = require('segfault-handler');
} catch (err) {
  log.warn('segfault-handler module not available, skipping initialization', err);
}

/**
 * Initializes the segmentation fault handler with proper configuration
 * 
 * @param {Object} options Configuration options
 * @param {string} options.logPath Path to write crash logs (default: app data directory)
 * @param {boolean} options.registerHandler Whether to register the SIGSEGV handler (default: true)
 */
function initialize(options = {}) {
  if (!segfaultHandler) {
    log.warn('Segfault handler not available, skipping initialization');
    return;
  }

  try {
    // Configure crash log destination
    const logPath = options.logPath || getDefaultLogPath();
    log.info(`Initializing segfault handler with log path: ${logPath}`);
    
    // Register the handler for SIGSEGV
    if (options.registerHandler !== false) {
      segfaultHandler.registerHandler(logPath);
      log.info('Segfault handler registered successfully');
    }

    // Add additional signal handlers for other critical signals
    setupAdditionalSignalHandlers();
    
    log.info('Segfault protection initialized successfully');
  } catch (err) {
    log.error('Failed to initialize segfault handler:', err);
  }
}

/**
 * Sets up handlers for additional critical signals beyond SIGSEGV
 */
function setupAdditionalSignalHandlers() {
  const criticalSignals = ['SIGABRT', 'SIGBUS', 'SIGILL', 'SIGFPE'];
  
  criticalSignals.forEach(signal => {
    try {
      process.on(signal, (signal) => {
        log.error(`Received ${signal} - attempting to log and recover`);
        
        // Log the error stack trace
        const stack = new Error().stack;
        log.error(`${signal} occurred at:\n${stack}`);
        
        // Force garbage collection to free memory
        if (global.gc) {
          log.info('Forcing garbage collection after signal');
          global.gc();
        }
        
        // We're handling but not preventing the crash, as that would leave the app in an unstable state
        log.error(`${signal} handler completed, process will exit`);
      });
      log.info(`Registered handler for ${signal}`);
    } catch (err) {
      log.warn(`Could not register handler for ${signal}:`, err);
    }
  });
  
  // Handle SIGTRAP which is common in Electron apps
  try {
    process.on('SIGTRAP', () => {
      log.warn('SIGTRAP received - this is often harmless in Electron but may indicate memory issues');
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
    });
    log.info('Registered handler for SIGTRAP');
  } catch (err) {
    log.warn('Could not register handler for SIGTRAP:', err);
  }
}

/**
 * Returns the default log path for crash dumps
 */
function getDefaultLogPath() {
  const { app } = require('electron');
  const path = require('path');
  
  // Use the app's user data directory for logs
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'crash-logs', 'segfault.log');
}

/**
 * Checks the current memory usage and logs warnings if it's high
 */
function checkMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const rss = Math.round(memoryUsage.rss / 1024 / 1024);
  
  log.debug(`Memory usage - RSS: ${rss}MB, Heap: ${heapUsed}/${heapTotal}MB`);
  
  // Warn if memory usage is high (over 80% of heap limit)
  if (heapUsed > 0.8 * heapTotal) {
    log.warn(`High memory usage detected: ${heapUsed}/${heapTotal}MB (${Math.round(heapUsed/heapTotal*100)}%)`);
    
    // Force garbage collection if available
    if (global.gc) {
      log.info('Forcing garbage collection due to high memory usage');
      global.gc();
      
      // Log memory usage after garbage collection
      const afterGC = process.memoryUsage();
      const heapUsedAfter = Math.round(afterGC.heapUsed / 1024 / 1024);
      log.info(`Memory after GC: ${heapUsedAfter}MB (recovered ${heapUsed - heapUsedAfter}MB)`);
    }
  }
}

/**
 * Starts a memory monitoring interval to periodically check usage
 * 
 * @param {number} interval Interval in ms between checks (default: 30000)
 * @returns {Object} The interval object that can be cleared
 */
function startMemoryMonitoring(interval = 30000) {
  log.info(`Starting memory monitoring with interval: ${interval}ms`);
  
  const timer = setInterval(() => {
    try {
      checkMemoryUsage();
    } catch (err) {
      log.error('Error in memory monitoring:', err);
    }
  }, interval);
  
  return timer;
}

// Export the module functions
module.exports = {
  initialize,
  checkMemoryUsage,
  startMemoryMonitoring
};
