# WebContentsView Implementation Plan for Cherry Studio

## Overview

This document outlines a comprehensive plan for migrating all mini apps in Cherry Studio from the current `<webview>` tag implementation to Electron's newer `WebContentsView` API. This migration addresses critical limitations in the current implementation, particularly for applications like Bolt.diy that require enhanced access to storage, IndexedDB, and other browser features.

## Background

### Current Implementation Challenges

The current implementation uses Electron's `<webview>` tag which has several limitations:

1. **Limited Storage Access**: Applications like Bolt.diy struggle with persistent storage
2. **Stability Issues**: The `<webview>` tag is based on Chromium's webview, which is undergoing architectural changes
3. **Performance Constraints**: Web applications run with reduced performance compared to native browser tabs
4. **Security Concerns**: The `<webview>` tag has known security issues and is officially discouraged by Electron

### Why WebContentsView?

`WebContentsView` is Electron's recommended replacement for both `<webview>` tags and `BrowserView`. It offers:

1. **Direct Integration with Chromium**: Uses Chrome's native WebContentsView implementation
2. **Enhanced Storage Access**: Provides full access to browser storage features
3. **Improved Performance**: Applications run with native browser performance
4. **Better Security**: More isolated from the main application
5. **Future-Proof**: Aligned with Chromium's UI framework (Views API)

## Implementation Roadmap

### Phase 1: Core Services and Infrastructure

#### 1. WebContentsViewService Implementation

```typescript
// File: src/main/services/WebContentsViewService.ts
import { WebContentsView, BrowserWindow, Rectangle } from 'electron'
import Logger from 'electron-log'

/**
 * Service for managing WebContentsView instances in the main process.
 * Provides methods for creating, showing, hiding, and destroying WebContentsView instances.
 */
class WebContentsViewService {
  private views: Map<string, WebContentsView> = new Map()
  private mainWindow: BrowserWindow | null = null
  
  constructor() {
    this.views = new Map()
  }

  /**
   * Set the main window reference
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * Create a new WebContentsView for a mini app
   */
  createView(appId: string, url: string): WebContentsView | null {
    if (!this.mainWindow) {
      Logger.error('WebContentsViewService: Cannot create view, main window not set')
      return null
    }

    // Destroy existing view if it exists
    this.destroyView(appId)

    try {
      // Create a new WebContentsView
      const view = new WebContentsView()
      
      // Store the view
      this.views.set(appId, view)
      
      // Add the view to the main window's contentView
      this.mainWindow.contentView.addChildView(view)
      
      // Navigate to the URL
      view.webContents.loadURL(url)
      
      return view
    } catch (error) {
      Logger.error('WebContentsViewService: Error creating view', error)
      return null
    }
  }

  /**
   * Get a WebContentsView by app ID
   */
  getView(appId: string): WebContentsView | undefined {
    return this.views.get(appId)
  }

  /**
   * Show a WebContentsView and position it correctly
   */
  showView(appId: string, bounds: Rectangle) {
    const view = this.views.get(appId)
    if (!view || !this.mainWindow) return

    // Hide all other views first
    this.hideAllViews()
    
    // Set the bounds and show the view
    view.setBounds(bounds)
    
    // Unlike BrowserView, WebContentsView doesn't have setTopBrowserView
    // We need to ensure it's visible by managing the z-order
    // Calling addChildView again will bring it to the top
    this.mainWindow.contentView.addChildView(view)
  }

  /**
   * Hide a specific WebContentsView
   */
  hideView(appId: string) {
    const view = this.views.get(appId)
    if (!view || !this.mainWindow) return
    
    // Set to zero size to effectively hide it
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  }

  /**
   * Hide all WebContentsViews
   */
  hideAllViews() {
    if (!this.mainWindow) return
    
    for (const [_, view] of this.views) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
  }

  /**
   * Destroy a WebContentsView
   */
  destroyView(appId: string) {
    const view = this.views.get(appId)
    if (!view || !this.mainWindow) return
    
    try {
      this.mainWindow.contentView.removeChildView(view)
      // Clean up any resources
      view.webContents.closeDevTools()
      // Remove from our map
      this.views.delete(appId)
    } catch (error) {
      Logger.error('WebContentsViewService: Error destroying view', error)
    }
  }

  /**
   * Destroy all WebContentsViews
   */
  destroyAllViews() {
    if (!this.mainWindow) return
    
    for (const [appId, _] of this.views) {
      this.destroyView(appId)
    }
  }

  /**
   * Open DevTools for a specific WebContentsView
   */
  openDevTools(appId: string) {
    const view = this.views.get(appId)
    if (!view) return
    
    view.webContents.openDevTools({ mode: 'detach' })
  }

  /**
   * Set whether links should open externally
   */
  setOpenLinksExternally(appId: string, openExternal: boolean) {
    const view = this.views.get(appId)
    if (!view) return
    
    view.webContents.setWindowOpenHandler(({ url }) => {
      if (openExternal) {
        // Open in default browser
        require('electron').shell.openExternal(url)
        return { action: 'deny' }
      }
      // Open in the same view
      return { action: 'allow' }
    })
  }

  /**
   * Reload a specific WebContentsView
   */
  reloadView(appId: string, url?: string) {
    const view = this.views.get(appId)
    if (!view) return
    
    if (url) {
      view.webContents.loadURL(url)
    } else {
      view.webContents.reload()
    }
  }

  /**
   * Get the current URL of a WebContentsView
   */
  getCurrentUrl(appId: string): string | null {
    const view = this.views.get(appId)
    if (!view) return null
    
    return view.webContents.getURL()
  }
}

// Create a singleton instance
const webContentsViewService = new WebContentsViewService()

export default webContentsViewService
```

#### 2. IPC Channel Definitions

```typescript
// File: packages/shared/IpcChannel.ts (add these entries)
export enum IpcChannel {
  // ... existing channels
  
  // WebContentsView channels for enhanced web app compatibility
  WebContentsView_Create = 'webcontentsview:create',
  WebContentsView_Show = 'webcontentsview:show',
  WebContentsView_Hide = 'webcontentsview:hide',
  WebContentsView_HideAll = 'webcontentsview:hide-all',
  WebContentsView_Destroy = 'webcontentsview:destroy',
  WebContentsView_OpenDevTools = 'webcontentsview:open-devtools',
  WebContentsView_SetOpenLinksExternally = 'webcontentsview:set-open-links-externally',
  WebContentsView_Reload = 'webcontentsview:reload',
  WebContentsView_GetURL = 'webcontentsview:get-url',
  
  // ... other channels
}
```

#### 3. IPC Handlers for WebContentsView

```typescript
// File: src/main/ipc/webContentsViewIpc.ts
import { IpcChannel } from '@shared/IpcChannel'
import { Rectangle, ipcMain } from 'electron'
import Logger from 'electron-log'

import webContentsViewService from '../services/WebContentsViewService'

/**
 * Register IPC handlers for WebContentsView operations
 */
export function registerWebContentsViewIpc() {
  // Create a new WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Create, async (_event, appId: string, url: string) => {
    try {
      const view = webContentsViewService.createView(appId, url)
      return { success: !!view }
    } catch (error) {
      Logger.error('Error creating WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Show a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Show, (_event, appId: string, bounds: Rectangle) => {
    try {
      webContentsViewService.showView(appId, bounds)
      return { success: true }
    } catch (error) {
      Logger.error('Error showing WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Hide a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Hide, (_event, appId: string) => {
    try {
      webContentsViewService.hideView(appId)
      return { success: true }
    } catch (error) {
      Logger.error('Error hiding WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Hide all WebContentsViews
  ipcMain.handle(IpcChannel.WebContentsView_HideAll, () => {
    try {
      webContentsViewService.hideAllViews()
      return { success: true }
    } catch (error) {
      Logger.error('Error hiding all WebContentsViews:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Destroy a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Destroy, (_event, appId: string) => {
    try {
      webContentsViewService.destroyView(appId)
      return { success: true }
    } catch (error) {
      Logger.error('Error destroying WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Open DevTools for a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_OpenDevTools, (_event, appId: string) => {
    try {
      webContentsViewService.openDevTools(appId)
      return { success: true }
    } catch (error) {
      Logger.error('Error opening DevTools for WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Set whether links should open externally
  ipcMain.handle(
    IpcChannel.WebContentsView_SetOpenLinksExternally,
    (_event, appId: string, openExternal: boolean) => {
      try {
        webContentsViewService.setOpenLinksExternally(appId, openExternal)
        return { success: true }
      } catch (error) {
        Logger.error('Error setting open links externally for WebContentsView:', error)
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Reload a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_Reload, (_event, appId: string, url?: string) => {
    try {
      webContentsViewService.reloadView(appId, url)
      return { success: true }
    } catch (error) {
      Logger.error('Error reloading WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Get the current URL of a WebContentsView
  ipcMain.handle(IpcChannel.WebContentsView_GetURL, (_event, appId: string) => {
    try {
      const url = webContentsViewService.getCurrentUrl(appId)
      if (!url) {
        return { success: false, error: 'WebContentsView not found or URL not available' }
      }
      return { success: true, url }
    } catch (error) {
      Logger.error('Error getting URL for WebContentsView:', error)
      return { success: false, error: (error as Error).message }
    }
  })
}
```

### Phase 2: Renderer Process Integration

#### 1. Preload Script Updates

```typescript
// File: src/preload/index.ts (add to the api object)
const api = {
  // ... existing API
  webContentsView: {
    create: (appId: string, url: string) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_Create, appId, url),
    show: (appId: string, bounds: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_Show, appId, bounds),
    hide: (appId: string) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_Hide, appId),
    hideAll: () =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_HideAll),
    destroy: (appId: string) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_Destroy, appId),
    openDevTools: (appId: string) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_OpenDevTools, appId),
    setOpenLinksExternally: (appId: string, openExternal: boolean) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_SetOpenLinksExternally, appId, openExternal),
    reload: (appId: string, url?: string) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_Reload, appId, url),
    getURL: (appId: string) =>
      ipcRenderer.invoke(IpcChannel.WebContentsView_GetURL, appId)
  },
  // ... other API methods
}
```

#### 2. WebContentsViewContainer Component

```typescript
// File: src/renderer/src/components/MinApp/WebContentsViewContainer.tsx
import { useEffect, useRef } from 'react'
import './WebContentsViewContainer.css'

/**
 * WebContentsViewContainer is a component that manages a WebContentsView in the main process.
 * It replaces the WebviewContainer component to provide better compatibility with web apps
 * that need access to storage, IndexedDB, and other browser features.
 */
const WebContentsViewContainer = ({
  appid,
  url,
  onSetRefCallback,
  onLoadedCallback,
  onNavigateCallback
}: {
  appid: string
  url: string
  onSetRefCallback: (appid: string, element: any | null) => void
  onLoadedCallback: (appid: string) => void
  onNavigateCallback: (appid: string, url: string) => void
}) => {
  // Reference to track if the WebContentsView has been created
  const hasCreatedView = useRef(false)
  // Reference to track the container element for positioning
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Create and manage the WebContentsView
  useEffect(() => {
    let isMounted = true

    const createAndSetupWebContentsView = async () => {
      if (!containerRef.current) return undefined

      try {
        // Create the WebContentsView in the main process
        const result = await window.api.webContentsView.create(appid, url)
        
        if (!result.success) {
          console.error('Failed to create WebContentsView:', result.error)
          return undefined
        }

        // Mark as created
        hasCreatedView.current = true
        
        // Notify parent that the "ref" is ready (simulate WebviewTag interface)
        onSetRefCallback(appid, {
          // Simulate some of the WebviewTag methods that might be used
          getWebContentsId: () => appid,
          openDevTools: async () => {
            await window.api.webContentsView.openDevTools(appid)
          },
          src: url
        })

        // Position the WebContentsView
        updateWebContentsViewPosition()
        
        // Set up a listener for URL changes
        const checkUrlInterval = setInterval(async () => {
          if (!isMounted) {
            clearInterval(checkUrlInterval)
            return
          }
          
          const urlResult = await window.api.webContentsView.getURL(appid)
          if (urlResult.success && urlResult.url !== url) {
            onNavigateCallback(appid, urlResult.url)
          }
        }, 1000) // Check every second

        // Notify that the WebContentsView is loaded
        setTimeout(() => {
          if (isMounted) {
            onLoadedCallback(appid)
          }
        }, 1000)

        return () => {
          clearInterval(checkUrlInterval)
        }
      } catch (error) {
        console.error('Error creating WebContentsView:', error)
        return undefined
      }
    }

    const updateWebContentsViewPosition = () => {
      if (!containerRef.current || !hasCreatedView.current) return

      const rect = containerRef.current.getBoundingClientRect()
      
      // Convert to bounds for the WebContentsView
      const bounds = {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }

      // Update the WebContentsView position
      window.api.webContentsView.show(appid, bounds)
    }

    // Create the WebContentsView when the component mounts
    createAndSetupWebContentsView()

    // Set up resize observer to update WebContentsView position when container resizes
    const resizeObserver = new ResizeObserver(() => {
      updateWebContentsViewPosition()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // Update position when window resizes
    window.addEventListener('resize', updateWebContentsViewPosition)

    // Clean up
    return () => {
      isMounted = false
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateWebContentsViewPosition)
      
      // Hide the WebContentsView when component unmounts
      if (hasCreatedView.current) {
        window.api.webContentsView.hide(appid)
      }
    }
  }, [appid, url, onLoadedCallback, onNavigateCallback, onSetRefCallback])

  // Create a container div that will determine the position and size of the WebContentsView
  return (
    <div
      ref={containerRef}
      className="webcontents-view-container"
    />
  )
}

export default WebContentsViewContainer
```

#### 3. CSS for WebContentsViewContainer

```css
/* File: src/renderer/src/components/MinApp/WebContentsViewContainer.css */
.webcontents-view-container {
  width: calc(100vw - var(--sidebar-width));
  height: calc(100vh - var(--navbar-height));
  background-color: var(--color-background);
  display: inline-flex;
}
```

### Phase 3: Main Process Integration

#### 1. Update WindowService

```typescript
// File: src/main/services/WindowService.ts (update setupMainWindow method)
import { is } from '@electron-toolkit/utils'
import { isDev, isLinux, isMac, isWin } from '@main/constant'
// ... other imports
import webContentsViewService from './WebContentsViewService'
// ... other imports

export class WindowService {
  // ... existing code

  private setupMainWindow(mainWindow: BrowserWindow, mainWindowState: any) {
    mainWindowState.manage(mainWindow)

    this.setupMaximize(mainWindow, mainWindowState.isMaximized)
    this.setupContextMenu(mainWindow)
    
    // Initialize the WebContentsViewService with the main window
    webContentsViewService.setMainWindow(mainWindow)

    this.setupWindowEvents(mainWindow)
    this.setupWebContentsHandlers(mainWindow)
    this.setupWindowLifecycleEvents(mainWindow)
    this.setupMainWindowMonitor(mainWindow)
    this.loadMainWindowContent(mainWindow)
  }

  // ... rest of the class
}
```

#### 2. Register IPC Handlers

```typescript
// File: src/main/ipc.ts (update registerIpc function)
import { registerWebContentsViewIpc } from './ipc/webContentsViewIpc'
// ... other imports

export function registerIpc(mainWindow: BrowserWindow, app: Electron.App) {
  const appUpdater = new AppUpdater(mainWindow)
  
  // Register WebContentsView IPC handlers
  registerWebContentsViewIpc()
  
  // ... rest of the function
}
```

### Phase 4: Replace WebviewContainer with WebContentsViewContainer

#### 1. Update MinappPopupContainer

```typescript
// File: src/renderer/src/components/MinApp/MinappPopupContainer.tsx
import SvgSpinners180Ring from '../Icons/SvgSpinners180Ring'
import WebContentsViewContainer from './WebContentsViewContainer'
// ... other imports

// ... existing code

/** group the webview containers with Memo, one of the key to make them keepalive */
const WebviewContainerGroup = useMemo(() => {
  return combinedApps.map((app) => (
    <WebContentsViewContainer
      key={app.id}
      appid={app.id}
      url={app.url}
      onSetRefCallback={handleWebviewSetRef}
      onLoadedCallback={handleWebviewLoaded}
      onNavigateCallback={handleWebviewNavigate}
    />
  ))

  // because the combinedApps is enough
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [combinedApps])

// ... rest of the component
```

## Implementation Strategy

### Execution Order

For a successful implementation, follow this order:

1. **Create Core Services**:
   - Implement `WebContentsViewService`
   - Add IPC channels to `IpcChannel.ts`
   - Create IPC handlers in `webContentsViewIpc.ts`

2. **Update Preload Script**:
   - Add WebContentsView API to preload script

3. **Create Renderer Components**:
   - Implement `WebContentsViewContainer.tsx`
   - Add CSS for the container

4. **Integrate with Main Process**:
   - Update `WindowService.ts` to initialize WebContentsViewService
   - Register IPC handlers in `ipc.ts`

5. **Replace WebviewContainer**:
   - Update `MinappPopupContainer.tsx` to use WebContentsViewContainer

### Testing Strategy

1. **Incremental Testing**:
   - Test with one mini app at a time
   - Verify storage and IndexedDB functionality
   - Check performance and stability

2. **Comprehensive Testing**:
   - Test all mini apps with the new implementation
   - Verify compatibility with existing features
   - Test edge cases (e.g., navigation, external links)

## Key Considerations for Roo Code Implementation

### Architecture Patterns

1. **Service Pattern**: The `WebContentsViewService` follows a singleton service pattern
2. **IPC Bridge Pattern**: Communication between renderer and main process uses a well-defined IPC bridge
3. **React Component Pattern**: The `WebContentsViewContainer` follows React best practices

### Code Structure

1. **File Organization**:
   - Main process services in `src/main/services/`
   - IPC handlers in `src/main/ipc/`
   - React components in `src/renderer/src/components/MinApp/`

2. **Naming Conventions**:
   - Services end with `Service`
   - IPC handlers end with `Ipc`
   - React components use PascalCase

3. **Code Style**:
   - TypeScript with strong typing
   - Async/await for asynchronous operations
   - React hooks for component state and lifecycle

### Error Handling

1. **Main Process**:
   - Log errors with `Logger.error`
   - Return error information in IPC responses

2. **Renderer Process**:
   - Try/catch blocks for async operations
   - Console.error for logging errors
   - Graceful degradation when errors occur

## Migration Considerations

### Potential Challenges

1. **Z-Order Management**: WebContentsView doesn't have `setTopBrowserView`, so z-order must be managed differently
2. **Event Handling**: Event handling differs between WebviewTag and WebContentsView
3. **Positioning**: WebContentsView positioning requires careful management

### Backward Compatibility

If needed, a fallback mechanism can be implemented:

```typescript
// Example of a fallback mechanism in MinappPopupContainer.tsx
const WebviewContainerGroup = useMemo(() => {
  return combinedApps.map((app) => {
    // Use feature flag to control migration
    const useWebContentsView = true; // Can be controlled via config
    
    if (useWebContentsView) {
      return (
        <WebContentsViewContainer
          key={app.id}
          appid={app.id}
          url={app.url}
          onSetRefCallback={handleWebviewSetRef}
          onLoadedCallback={handleWebviewLoaded}
          onNavigateCallback={handleWebviewNavigate}
        />
      );
    } else {
      // Fallback to original WebviewContainer
      return (
        <WebviewContainer
          key={app.id}
          appid={app.id}
          url={app.url}
          onSetRefCallback={handleWebviewSetRef}
          onLoadedCallback={handleWebviewLoaded}
          onNavigateCallback={handleWebviewNavigate}
        />
      );
    }
  })
}, [combinedApps])
```

## References

1. [Electron WebContentsView Documentation](https://electronjs.org/docs/latest/api/web-contents-view)
2. [Migrating from BrowserView to WebContentsView](https://electronjs.org/blog/migrate-to-webcontentsview)
3. [Electron Security Best Practices](https://electronjs.org/docs/latest/tutorial/security)
4. [Electron - Visualizing App Structure in the WebContentsView Era](https://developer.mamezou-tech.com/en/blogs/2024/08/28/electron-webcontentsview-app-structure/)
