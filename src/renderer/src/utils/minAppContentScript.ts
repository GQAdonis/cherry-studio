/**
 * Mini-App Content Script
 *
 * This script is injected into mini-app webviews to enable:
 * - Communication with Cherry Studio via postMessage
 * - Text selection detection for context menu
 * - Page content extraction utilities
 */

/**
 * Get the content script to inject into webviews
 */
export function getMinAppContentScript(appId: string): string {
  return `
(function() {
  // Prevent double injection
  if (window.__cherryBridgeInitialized) return;
  window.__cherryBridgeInitialized = true;

  const APP_ID = ${JSON.stringify(appId)};
  
  // Cherry Bridge API
  window.cherryBridge = {
    appId: APP_ID,
    version: '1.0.0',
    
    // Internal state
    _messageHandlers: new Map(),
    _pendingRequests: new Map(),
    _requestId: 0,
    
    /**
     * Send a message to Cherry Studio
     */
    send: function(type, payload) {
      window.parent.postMessage({
        source: 'cherry-minapp',
        appId: APP_ID,
        type: type,
        payload: payload
      }, '*');
    },
    
    /**
     * Send a request and wait for response
     */
    request: function(type, payload) {
      return new Promise((resolve, reject) => {
        const id = ++this._requestId;
        const timeout = setTimeout(() => {
          this._pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }, 30000);
        
        this._pendingRequests.set(id, { resolve, reject, timeout });
        
        window.parent.postMessage({
          source: 'cherry-minapp',
          appId: APP_ID,
          type: type,
          id: id,
          payload: payload
        }, '*');
      });
    },
    
    /**
     * Register a message handler
     */
    onMessage: function(type, handler) {
      if (!this._messageHandlers.has(type)) {
        this._messageHandlers.set(type, []);
      }
      this._messageHandlers.get(type).push(handler);
      
      return () => {
        const handlers = this._messageHandlers.get(type);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) handlers.splice(index, 1);
        }
      };
    },
    
    /**
     * Handle incoming messages
     */
    _handleMessage: function(event) {
      const data = event.data;
      if (!data || data.source !== 'cherry-host') return;
      
      // Handle response to pending request
      if (data.id && this._pendingRequests.has(data.id)) {
        const { resolve, reject, timeout } = this._pendingRequests.get(data.id);
        clearTimeout(timeout);
        this._pendingRequests.delete(data.id);
        
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.payload);
        }
        return;
      }
      
      // Handle message type
      const handlers = this._messageHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data.payload);
          } catch (e) {
            console.error('Cherry Bridge handler error:', e);
          }
        });
      }
    },
    
    // Utility methods
    
    /**
     * Get selected text
     */
    getSelectedText: function() {
      return window.getSelection()?.toString() || '';
    },
    
    /**
     * Get page text content
     */
    getPageText: function() {
      const clone = document.body.cloneNode(true);
      const scripts = clone.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());
      return clone.textContent?.trim() || '';
    },
    
    /**
     * Get page HTML
     */
    getPageHTML: function() {
      return document.documentElement.outerHTML;
    },
    
    /**
     * Get page metadata
     */
    getPageMetadata: function() {
      return {
        title: document.title,
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                 document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') || ''
      };
    }
  };
  
  // Set up message listener
  window.addEventListener('message', (event) => {
    window.cherryBridge._handleMessage(event);
  });
  
  // Notify Cherry Studio that we're ready
  window.cherryBridge.send('ready', {
    url: window.location.href,
    title: document.title
  });
  
  // Track text selection for context menu
  let lastSelection = '';
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection()?.toString() || '';
    if (selection !== lastSelection) {
      lastSelection = selection;
      window.cherryBridge.send('selection-change', {
        text: selection,
        hasSelection: selection.length > 0
      });
    }
  });
  
  // Track navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    window.cherryBridge.send('navigation', {
      url: window.location.href,
      title: document.title,
      type: 'pushState'
    });
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    window.cherryBridge.send('navigation', {
      url: window.location.href,
      title: document.title,
      type: 'replaceState'
    });
  };
  
  window.addEventListener('popstate', () => {
    window.cherryBridge.send('navigation', {
      url: window.location.href,
      title: document.title,
      type: 'popstate'
    });
  });
  
  // Log initialization
  console.log('[Cherry Bridge] Initialized for app:', APP_ID);
})();
`
}

/**
 * Get a minimal content script for pages that don't need full bridge
 */
export function getMinimalContentScript(): string {
  return `
(function() {
  if (window.__cherryMinimalInitialized) return;
  window.__cherryMinimalInitialized = true;
  
  // Just expose basic utilities
  window.cherryUtils = {
    getSelectedText: () => window.getSelection()?.toString() || '',
    getPageText: () => {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      return clone.textContent?.trim() || '';
    }
  };
})();
`
}

export default getMinAppContentScript
