// Mini app preload script
import { contextBridge, ipcRenderer, webFrame } from 'electron'

// Ensure no limits on isolated world - important for mini app compatibility
webFrame.setIsolatedWorldInfo(999, {
  securityOrigin: window.location.origin,
  csp: "", // Allow everything for maximum compatibility
  name: "miniAppIsolatedWorld"
})

// Ensure DOM APIs are available
if (typeof window !== 'undefined') {
  // Make sure localStorage and indexedDB are accessible
  try {
    // Test localStorage access
    window.localStorage.setItem('__test_storage__', 'test')
    window.localStorage.removeItem('__test_storage__')
    
    // Test indexedDB access
    const testRequest = window.indexedDB.open('__test_db__', 1)
    testRequest.onsuccess = (event: Event) => { // Added type for event
      const db = (event.target as IDBOpenDBRequest).result; // Added type assertion
      db.close()
      window.indexedDB.deleteDatabase('__test_db__')
    }
    testRequest.onerror = (event: Event) => { // Added error handler
      console.error('IndexedDB test open error:', (event.target as IDBOpenDBRequest).error);
    }
  } catch (e) {
    console.error('Storage API access error:', e)
  }
}

// Expose safe APIs to mini apps
contextBridge.exposeInMainWorld('miniAppBridge', {
  // Communication with the main app
  sendMessage: (channel: string, data: any) => { // Added types
    ipcRenderer.send(`miniapp:${channel}`, data)
  },
  
  // Receive messages from the main app
  onMessage: (channel: string, callback: (data: any) => void) => { // Added types
    const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data) // Added type for event
    ipcRenderer.on(`miniapp:${channel}`, listener)
    return () => {
      ipcRenderer.removeListener(`miniapp:${channel}`, listener)
    }
  },
  
  // Get app information
  getAppInfo: () => {
    return {
      appId: window.location.hostname,
      version: '1.0.0', // This could be dynamic if needed
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
  // Ensure all web APIs are available and working
  try {
    // Force enable all DOM APIs
    const script = document.createElement('script')
    script.textContent = `
      // Ensure localStorage and indexedDB are accessible
      try {
        window.localStorage.setItem('__test_storage__', 'test');
        window.localStorage.removeItem('__test_storage__');
        console.log('localStorage is working in mini-app isolated world');
        
        const request = indexedDB.open('__test_db__', 1);
        request.onsuccess = (event) => {
          const db = event.target.result;
          db.close();
          indexedDB.deleteDatabase('__test_db__');
          console.log('indexedDB is working in mini-app isolated world');
        };
        request.onerror = (event) => {
          console.error('IndexedDB test open error in mini-app isolated world:', event.target.error);
        };
      } catch (e) {
        console.error('Storage API access error in mini-app isolated world:', e);
      }
    `
    document.head.appendChild(script)
  } catch (e) {
    console.error('Error injecting API compatibility script:', e)
  }
  
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
  if (document.body) { // Check if body exists
    document.body.style.visibility = 'visible'
    document.body.style.display = 'block'
    document.body.style.opacity = '1'
  }
}