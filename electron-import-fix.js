/**
 * Electron Import Fix Plugin for Vite
 * 
 * This plugin intercepts any imports of the 'electron' module in the renderer process
 * and provides a mock implementation instead. This prevents the "__dirname is not defined"
 * error that occurs when the electron module is imported directly in an ES module context.
 */

module.exports = function electronImportFixPlugin() {
  const ELECTRON_MODULE_ID = 'electron';
  const ELECTRON_MOCK_CODE = `
    // Mock implementation of the electron module for renderer process
    // This prevents "__dirname is not defined" errors
    console.warn('[Electron Import Fix] Intercepted import of electron module in renderer process');
    console.warn('[Electron Import Fix] You should use window.electron or window.api instead');
    
    // Create a mock electron object with empty implementations
    // This allows code to run without errors, but won't actually do anything
    const mockElectron = {
      ipcRenderer: {
        on: () => {},
        once: () => {},
        send: () => {},
        invoke: async () => {},
        removeListener: () => {},
        removeAllListeners: () => {}
      },
      webFrame: {
        setZoomFactor: () => {},
        getZoomFactor: () => 1
      },
      clipboard: {
        writeText: () => {},
        readText: () => ''
      },
      shell: {
        openExternal: () => {}
      },
      // Add other electron APIs as needed
    };
    
    export default mockElectron;
    export const ipcRenderer = mockElectron.ipcRenderer;
    export const webFrame = mockElectron.webFrame;
    export const clipboard = mockElectron.clipboard;
    export const shell = mockElectron.shell;
  `;

  return {
    name: 'electron-import-fix',
    
    // This hook is called when a module is resolved
    resolveId(source) {
      // Only intercept imports of the electron module
      if (source === ELECTRON_MODULE_ID) {
        console.log(`[Electron Import Fix] Intercepted import of ${ELECTRON_MODULE_ID}`);
        // Return a virtual module ID that we'll handle in the load hook
        return `\0${ELECTRON_MODULE_ID}-mock`;
      }
      return null;
    },
    
    // This hook is called when a module is loaded
    load(id) {
      // Check if this is our virtual module
      if (id === `\0${ELECTRON_MODULE_ID}-mock`) {
        console.log(`[Electron Import Fix] Providing mock implementation for ${ELECTRON_MODULE_ID}`);
        // Return our mock implementation
        return ELECTRON_MOCK_CODE;
      }
      return null;
    }
  };
};