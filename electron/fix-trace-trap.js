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
