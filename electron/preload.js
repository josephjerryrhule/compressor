// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Add any needed IPC functionality here
  openExternalLink: (url) => {
    ipcRenderer.send('open-external-link', url);
  }
});
