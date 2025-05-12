// Mini app preload script
const { contextBridge, ipcRenderer } = require('electron')

// Expose safe APIs to mini apps
contextBridge.exposeInMainWorld('miniAppBridge', {
  // Communication with the main app
  sendMessage: (channel, data) => {
    ipcRenderer.send(`miniapp:${channel}`, data)
  },
  
  // Receive messages from the main app
  onMessage: (channel, callback) => {
    const listener = (_event, data) => callback(data)
    ipcRenderer.on(`miniapp:${channel}`, listener)
    return () => {
      ipcRenderer.removeListener(`miniapp:${channel}`, listener)
    }
  },
  
  // Get app information
  getAppInfo: () => {
    return {
      appId: window.location.hostname,
      version: '1.0.0',
      platform: process.platform
    }
  },
  
  // Notify the main app that the mini app is ready
  notifyReady: () => {
    ipcRenderer.send('miniapp:ready', { url: window.location.href })
  }
})

// Inject visibility helpers
document.addEventListener('DOMContentLoaded', () => {
  // Ensure content is visible
  const style = document.createElement('style')
  style.textContent = `
    body {
      visibility: visible !important;
      display: block !important;
      opacity: 1 !important;
    }
  `
  document.head.appendChild(style)
  
  // Notify the main app that the DOM is ready
  ipcRenderer.send('miniapp:dom-ready', { url: window.location.href })
})

// Automatically notify the main app when the page is fully loaded
window.addEventListener('load', () => {
  ipcRenderer.send('miniapp:loaded', { url: window.location.href })
})

// Ensure the page is visible
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // Document already loaded, make it visible immediately
  document.body.style.visibility = 'visible'
  document.body.style.display = 'block'
  document.body.style.opacity = '1'
}