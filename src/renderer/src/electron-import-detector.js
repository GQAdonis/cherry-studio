// This script detects and logs any attempts to import the electron module
console.log('Electron import detector initialized');

// Store the original require function
const originalRequire = window.require;

// Override require to detect electron imports
if (typeof window.require === 'function') {
  window.require = function(moduleName) {
    if (moduleName === 'electron') {
      console.error('DETECTED: Direct electron import in renderer process!');
      console.error(new Error().stack);
    }
    return originalRequire.apply(this, arguments);
  };
}

// For ES modules, we can't directly intercept imports
// But we can log a warning to check for them
console.log('WARNING: Check for ES module imports of electron using: import * from "electron"');