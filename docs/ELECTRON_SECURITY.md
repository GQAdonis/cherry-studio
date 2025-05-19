# Electron Security Best Practices

This document outlines the security best practices for our Electron application and explains how we've implemented them to ensure a secure application architecture.

## Security Best Practices for Electron Applications

### 1. Use the Latest Electron Version

Always use the latest stable version of Electron to benefit from the latest security patches and improvements.

### 2. Context Isolation and Preload Scripts

Context isolation is a feature that ensures that both your preload scripts and Electron's internal logic run in a separate context from the website's renderer process. This is important for security as it helps prevent websites from accessing Electron internals or the powerful APIs your preload script has access to.

**Implementation:**
- Enable `contextIsolation: true` in WebPreferences
- Use a preload script to expose only the necessary APIs to the renderer process
- Use the `contextBridge` API to expose functionality from the main process to the renderer process

### 3. Disable Node.js Integration in Renderer Processes

By default, Electron allows the renderer process to have full access to Node.js APIs. This is a security risk as it allows potentially malicious websites to access the user's system. Disabling Node.js integration helps mitigate this risk.

**Implementation:**
- Set `nodeIntegration: false` in WebPreferences
- Use preload scripts and IPC to provide only the necessary functionality to the renderer process

### 4. Avoid Direct Imports from 'electron' in Renderer Process

Directly importing the 'electron' module in renderer processes can bypass security restrictions and potentially expose Node.js APIs to the renderer process. Instead, use the preload script and contextBridge to expose only the necessary APIs.

**Implementation:**
- Use type-only imports for Electron types in renderer process
- Create custom type definition files that re-export Electron types without runtime imports
- Use runtime detection to catch any accidental direct imports

### 5. Content Security Policy (CSP)

Implement a Content Security Policy to mitigate the risk of Cross-Site Scripting (XSS) attacks.

**Implementation:**
- Set appropriate CSP headers
- Restrict the sources of content that can be loaded

### 6. Handle Session Permissions Carefully

Be cautious when granting permissions to sessions, such as notifications, geolocation, etc.

**Implementation:**
- Implement proper permission request handling
- Default to denying permissions and require explicit user approval

### 7. WebView Security

When using `<webview>` tags, ensure they are configured securely.

**Implementation:**
- Disable `nodeIntegration` in webviews
- Enable `contextIsolation` in webviews
- Set appropriate `webPreferences`

### 8. Validate Input in IPC Channels

Always validate and sanitize input received through IPC channels to prevent injection attacks.

**Implementation:**
- Implement input validation for all IPC messages
- Use TypeScript interfaces to enforce expected message formats

### 9. Use WebContentsView or Webview for Web Content Rendering

Use either WebContentsView or Webview implementations for web content rendering, never BrowserView.

**Implementation:**
- Implement all web content rendering using WebContentsView or Webview
- Ensure proper Z-order management and resource handling

### 10. Code Signing

Always code sign your application before distribution to ensure its integrity.

**Implementation:**
- Use appropriate code signing certificates for each platform
- Verify the signature during updates

## Application Security Implementation

Our application follows these security best practices through the following implementations:

### Secure IPC Communication

We use a preload script (`src/preload/index.ts`) to expose a limited API to the renderer process through the contextBridge. This ensures that the renderer process can only access the specific functionality we explicitly expose.

```typescript
// Example from preload script
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Expose specific IPC channels with validation
  send: (channel: string, data: any) => {
    // Whitelist channels that can be used
    const validChannels = ['request-data', 'save-data']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel: string, func: Function) => {
    const validChannels = ['response-data']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => func(...args))
    }
  }
})
```

### Type-Safe Electron Imports

To prevent direct imports from 'electron' in the renderer process while still maintaining type safety, we've created a custom type definition file that uses TypeScript's `import type` feature:

```typescript
// src/renderer/src/types/electron-renderer.d.ts
/**
 * Type definitions for Electron's WebviewTag
 * This file provides type definitions for the WebviewTag interface
 * to avoid direct imports from 'electron' in renderer process files.
 */

// Import the Electron namespace but only for type usage, not for runtime
import type { WebviewTag as ElectronWebviewTag } from 'electron';

// Re-export the WebviewTag type
export type WebviewTag = ElectronWebviewTag;
```

This allows us to use Electron types in the renderer process without actually importing the 'electron' module at runtime.

### Runtime Detection of Direct Imports

We've implemented a runtime detector (`src/renderer/src/electron-import-detector.js`) that overrides the `require` function to detect and log any attempts to directly import the 'electron' module:

```javascript
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
```

## Recent Security Improvements

We recently identified and fixed issues with direct imports from 'electron' in the renderer process:

1. **Issue**: Two files (WebviewContainer.tsx and MinappPopupContainer.tsx) were directly importing the WebviewTag type from 'electron'.

2. **Solution**: We created a custom type definition file (`src/renderer/src/types/electron-renderer.d.ts`) that uses TypeScript's `import type` feature to import the WebviewTag type from 'electron' for type checking purposes only, without actually importing the module at runtime.

3. **Implementation**:
   - Created `src/renderer/src/types/electron-renderer.d.ts` with type-only imports
   - Updated imports in WebviewContainer.tsx and MinappPopupContainer.tsx to use the new type definition
   - Added runtime detection to catch any future direct imports

4. **Verification**: We've verified that there are no remaining direct imports from 'electron' in the renderer process by:
   - Searching for import statements using 'electron'
   - Searching for require statements using 'electron'
   - Checking for any other patterns that might indicate direct imports

## How to Properly Access Electron APIs from the Renderer Process

To maintain security while still accessing necessary Electron functionality, follow these guidelines:

### 1. Use the Preload Script and contextBridge

The preload script is the secure way to expose main process functionality to the renderer process:

```typescript
// In preload script
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Expose specific functionality
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content)
})
```

### 2. Access the Exposed API in Renderer Process

In the renderer process, access the API exposed by the preload script:

```typescript
// In renderer process
document.getElementById('openButton').addEventListener('click', () => {
  window.api.openFile()
})
```

### 3. For Type Definitions Only

If you need Electron types in the renderer process (e.g., for WebviewTag), use type-only imports:

```typescript
// Create a type definition file (e.g., electron-renderer.d.ts)
import type { WebviewTag } from 'electron'
export type { WebviewTag }

// In your renderer process file
import { WebviewTag } from './types/electron-renderer'
```

### 4. Handle IPC Communication Properly

When using IPC for communication between main and renderer processes:

- Use `invoke/handle` for request-response patterns
- Validate all input data
- Use typed channels and payloads
- Handle errors appropriately

```typescript
// In main process
ipcMain.handle('save-file', async (event, content) => {
  try {
    // Validate content
    if (typeof content !== 'string') {
      throw new Error('Invalid content')
    }
    
    // Process the request
    await fs.writeFile('path/to/file', content)
    return { success: true }
  } catch (error) {
    console.error('Error saving file:', error)
    return { success: false, error: error.message }
  }
})

// In renderer process
const saveFile = async (content) => {
  try {
    const result = await window.api.saveFile(content)
    if (!result.success) {
      throw new Error(result.error)
    }
    return true
  } catch (error) {
    console.error('Failed to save file:', error)
    return false
  }
}
```

By following these guidelines, we can maintain a secure architecture while still providing the necessary functionality to the renderer process.