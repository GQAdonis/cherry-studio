// This script helps diagnose Electron-related crashes
console.log('Electron diagnostic script initialized');

// Track WebviewTag element creation and method calls
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
  const element = originalCreateElement.apply(this, arguments);
  
  if (tagName.toLowerCase() === 'webview') {
    console.log('WEBVIEW ELEMENT CREATED');
    
    // Log when important methods are called
    const methodsToTrack = [
      'addEventListener', 'removeEventListener', 
      'getWebContentsId', 'openDevTools'
    ];
    
    methodsToTrack.forEach(method => {
      const original = element[method];
      if (typeof original === 'function') {
        element[method] = function() {
          console.log(`WEBVIEW METHOD CALLED: ${method}`, arguments);
          try {
            return original.apply(this, arguments);
          } catch (error) {
            console.error(`ERROR in WebviewTag.${method}:`, error);
            throw error;
          }
        };
      }
    });
    
    // Track property access
    const propsToTrack = ['src', 'style'];
    propsToTrack.forEach(prop => {
      let value = element[prop];
      Object.defineProperty(element, prop, {
        get: function() {
          console.log(`WEBVIEW PROPERTY GET: ${prop}`);
          return value;
        },
        set: function(newValue) {
          console.log(`WEBVIEW PROPERTY SET: ${prop}`, newValue);
          try {
            value = newValue;
          } catch (error) {
            console.error(`ERROR setting WebviewTag.${prop}:`, error);
            throw error;
          }
        }
      });
    });
  }
  
  return element;
};

// Monitor window.api.webview usage
if (window.api && window.api.webview) {
  const originalSetOpenLinkExternal = window.api.webview.setOpenLinkExternal;
  window.api.webview.setOpenLinkExternal = function(webviewId, isExternal) {
    console.log('CALLING api.webview.setOpenLinkExternal', { webviewId, isExternal });
    try {
      return originalSetOpenLinkExternal.apply(this, arguments);
    } catch (error) {
      console.error('ERROR in api.webview.setOpenLinkExternal:', error);
      throw error;
    }
  };
}

// Add a global error handler to catch any uncaught errors
window.addEventListener('error', function(event) {
  console.error('GLOBAL ERROR:', event.error);
});

console.log('Electron diagnostic script setup complete');