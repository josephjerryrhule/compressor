// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose a flag to indicate we're in Electron
contextBridge.exposeInMainWorld('isElectron', true);

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Add any needed IPC functionality here
  openExternalLink: (url) => {
    ipcRenderer.send('open-external-link', url);
  }
});
